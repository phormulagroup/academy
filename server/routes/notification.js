var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");
const { scheduleReady, countAudience, deliver } = require("../utils/notifications");

router.get("/read", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM notification");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

// Resumo leve para a verificação periódica da webapp: a lista completa só se pede quando algo mudou (nº de notificações, não lidas ou a última)
router.get("/summary", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  const [row] = await query("SELECT COUNT(*) AS total, COALESCE(SUM(is_read = 0), 0) AS unread, COALESCE(MAX(id), 0) AS latest_id FROM notification_user WHERE id_user = ?", [req.user.id]);
  res.set("Cache-Control", "no-store");
  res.send({ total: Number(row.total), unread: Number(row.unread), latest_id: Number(row.latest_id) });
});

router.get("/readByUser", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT notification.title, notification.description, notification_user.* FROM notification_user " +
        "LEFT JOIN notification ON notification.id = notification_user.id_notification WHERE id_user = ? ORDER BY created_at DESC LIMIT 300",
      [req.user.id], // sempre as notificações de quem faz o pedido (as 300 mais recentes)
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    // Com quantos recebeu e quantos já leram (a coluna scheduled_at/sent_at vem com SELECT * quando a migração está aplicada)
    const rows = await query(
      `SELECT n.*, (SELECT COUNT(*) FROM notification_user nu WHERE nu.id_notification = n.id) AS recipients,
        (SELECT COUNT(*) FROM notification_user nu WHERE nu.id_notification = n.id AND nu.is_read = 1) AS read_count
       FROM notification n WHERE n.id_lang = ? ORDER BY n.id DESC`,
      [req.query.id_lang],
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

// Quantas pessoas recebem uma notificação para este idioma e países (para o ecrã mostrar antes de enviar)
router.post("/audience", requirePermission("notification", "read"), async (req, res) => {
  const { id_lang, country } = req.body.data || {};
  res.send({ total: await countAudience({ id_lang, country }), scheduling: await scheduleReady() });
});

// Campos que o formulário pode gravar; o resto (envio, datas de envio) decide-o o servidor
const FIELDS = ["title", "description", "id_lang", "country"];

// Aplica o modo escolhido: "draft" (guardar), "schedule" (agendar para scheduled_at) ou "now" (enviar já).
// Devolve { error } com o código HTTP se o pedido não for válido.
async function applyMode(id, mode, scheduledAt) {
  const query = util.promisify(db.query).bind(db);
  if (!mode || mode === "draft") {
    if (await scheduleReady()) await query("UPDATE notification SET scheduled_at = NULL WHERE id = ? AND sent_at IS NULL", [id]);
    return {};
  }
  if (mode === "schedule") {
    if (!(await scheduleReady())) return { error: [409, "Scheduling is not available yet (database migration pending)"] };
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) return { error: [400, "Invalid date"] };
    if (when.getTime() < Date.now() - 60 * 1000) return { error: [400, "The date must be in the future"] };
    await query("UPDATE notification SET scheduled_at = ? WHERE id = ? AND sent_at IS NULL", [when, id]);
    return {};
  }
  if (mode === "now") {
    if (await scheduleReady()) await query("UPDATE notification SET scheduled_at = NULL WHERE id = ? AND sent_at IS NULL", [id]);
    return { sent: await deliver(id) };
  }
  return { error: [400, "Invalid mode"] };
}

const pick = (data) => {
  const out = {};
  for (const f of FIELDS) if (data[f] !== undefined) out[f] = f === "country" && Array.isArray(data[f]) ? (data[f].length ? JSON.stringify(data[f]) : null) : data[f];
  return out;
};

router.post("/create", requirePermission("notification", "create"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data || {};
    const insertedRow = await query("INSERT INTO notification SET ?", pick(data));
    const result = await applyMode(insertedRow.insertId, data.mode, data.scheduled_at);
    // Um pedido inválido (ex.: data no passado) não deixa a notificação criada a meio
    if (result.error) {
      await query("DELETE FROM notification WHERE id = ?", [insertedRow.insertId]);
      return res.status(result.error[0]).send({ message: result.error[1] });
    }
    res.send({ ...insertedRow, ...result });
  } catch (err) {
    throw err;
  }
});

router.post("/update", requirePermission("notification", "update"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data || {};
    const id = Number(data.id);
    const [current] = await query("SELECT * FROM notification WHERE id = ?", [id]);
    if (!current) return res.status(404).send({ message: "Notification not found" });

    const [{ delivered }] = await query("SELECT COUNT(*) AS delivered FROM notification_user WHERE id_notification = ?", [id]);
    const sentAlready = !!current.sent_at || delivered > 0;
    const fields = pick(data);
    // Depois de enviada, o público e o idioma já não mudam (já foi entregue a essas pessoas); o texto pode corrigir-se
    if (sentAlready) {
      delete fields.country;
      delete fields.id_lang;
    }
    const columns = Object.keys(fields);
    if (columns.length) await query("UPDATE notification SET " + columns.map((c) => `${db.escapeId(c)} = ?`).join(", ") + " WHERE id = ?", [...Object.values(fields), id]);

    const result = sentAlready ? {} : await applyMode(id, data.mode, data.scheduled_at);
    if (result.error) return res.status(result.error[0]).send({ message: result.error[1] });
    res.send({ updated: true, ...result });
  } catch (err) {
    throw err;
  }
});

router.post("/markAsRead", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    // Cada pessoa só marca como lidas as suas notificações, e só o campo is_read
    const updatedRow = await query("UPDATE notification_user SET is_read = ? WHERE id = ? AND id_user = ?", [req.body.data?.is_read ? 1 : 0, toId(req.body.data?.id), req.user.id]);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

// Enviar já (a partir da lista): entrega a quem ainda não a tem; uma notificação já enviada não se repete
router.post("/send", requirePermission("notification", "update"), async (req, res, next) => {
  try {
    const result = await deliver(Number(req.body.data?.id));
    if (!result) return res.status(404).send({ message: "Notification not found" });
    if (result.already) return res.status(409).send({ message: "This notification was already sent" });
    res.send({ send: true, delivered: result.delivered });
  } catch (err) {
    throw err;
  }
});

// Apaga a notificação e as entregas aos utilizadores (deixa de aparecer na área de cada pessoa)
router.post("/delete", requirePermission("notification", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const id = Number(req.body.data?.id);
    if (!id) return res.status(400).send({ message: "Invalid notification" });
    await query("DELETE FROM notification_user WHERE id_notification = ?", [id]);
    const deleted = await query("DELETE FROM notification WHERE id = ?", [id]);
    res.send(deleted);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
