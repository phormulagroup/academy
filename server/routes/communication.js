var express = require("express");
var util = require("util");
var router = express.Router();
var db = require("../utils/database");
const email = require("../utils/email");
const { requirePermission } = require("../utils/permissions");
const { resolveAudience, countAudience } = require("../utils/communications");
const { trackingReady } = require("../utils/tracking");

const query = util.promisify(db.query).bind(db);

const fail = (res, e) => {
  console.error(e);
  res.status(500).send({ message: "Some error on server.", error: e.message });
};

// A comunicação só se edita enquanto é rascunho; agendada, a enviar ou enviada ficam fixas (cancela-se/duplica-se)
const EDITABLE = ["draft"];

router.get("/read", requirePermission("communication", "read"), async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.name, c.subject, c.status, c.scheduled_at, c.started_at, c.finished_at, c.total, c.error_message, c.created_at, c.modified_at, c.audience,
        (SELECT COUNT(*) FROM communication_recipient r WHERE r.id_communication = c.id AND r.status = 'sent') AS sent,
        (SELECT COUNT(*) FROM communication_recipient r WHERE r.id_communication = c.id AND r.status = 'error') AS errors
       FROM communication c ORDER BY c.created_at DESC`,
    );
    res.send(rows);
  } catch (e) {
    fail(res, e);
  }
});

router.get("/readById", requirePermission("communication", "read"), async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM communication_recipient r WHERE r.id_communication = c.id AND r.status = 'sent') AS sent,
        (SELECT COUNT(*) FROM communication_recipient r WHERE r.id_communication = c.id AND r.status = 'error') AS errors,
        (SELECT COUNT(*) FROM communication_recipient r WHERE r.id_communication = c.id AND r.status = 'pending') AS pending
       FROM communication c WHERE c.id = ?`,
      [req.query.id],
    );
    if (rows.length === 0) return res.status(404).send({ message: "Communication not found" });
    res.send(rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// Opções dos filtros do público
router.get("/options", requirePermission("communication", "read"), async (req, res) => {
  try {
    const [groups, courses, roles, countries, languages] = await Promise.all([
      query("SELECT id, name FROM user_group WHERE is_deleted = 0 ORDER BY name"),
      query("SELECT id, name, internal_name FROM course WHERE is_deleted = 0 ORDER BY name"),
      query("SELECT id, name FROM role ORDER BY id"),
      query("SELECT DISTINCT country FROM user WHERE country IS NOT NULL AND country != '' AND is_deleted = 0 ORDER BY country"),
      query("SELECT id, name FROM language ORDER BY name"),
    ]);
    res.send({ groups, courses, roles, countries: countries.map((c) => c.country), languages });
  } catch (e) {
    fail(res, e);
  }
});

// Pesquisa de utilizadores para o público "selecionados"
router.get("/users", requirePermission("communication", "read"), async (req, res) => {
  try {
    const q = `%${String(req.query.q || "").trim()}%`;
    const rows = await query(
      "SELECT id, name, email FROM user WHERE status = 'approved' AND is_deleted = 0 AND (name LIKE ? OR email LIKE ?) ORDER BY name LIMIT 30",
      [q, q],
    );
    res.send(rows);
  } catch (e) {
    fail(res, e);
  }
});

// Nomes dos utilizadores já escolhidos (para os mostrar ao abrir uma comunicação)
router.post("/usersByIds", requirePermission("communication", "read"), async (req, res) => {
  try {
    const ids = (req.body.data?.ids || []).map(Number).filter(Boolean);
    res.send(ids.length ? await query("SELECT id, name, email FROM user WHERE id IN (?)", [ids]) : []);
  } catch (e) {
    fail(res, e);
  }
});

router.post("/audience", requirePermission("communication", "read"), async (req, res) => {
  try {
    const audience = req.body.data?.audience || {};
    res.send({ total: await countAudience(audience), sample: await resolveAudience(audience, 5) });
  } catch (e) {
    fail(res, e);
  }
});

router.post("/create", requirePermission("communication", "create"), async (req, res) => {
  try {
    const name = String(req.body.data?.name || "").trim();
    if (!name) return res.status(400).send({ message: "A name is required" });
    const result = await query("INSERT INTO communication SET name = ?, design = ?, audience = ?, created_by = ?", [
      name,
      JSON.stringify({ editor: "grapes" }),
      JSON.stringify({ scope: "all" }),
      req.user.id,
    ]);
    res.send({ id: result.insertId });
  } catch (e) {
    fail(res, e);
  }
});

// Atualização parcial: só muda o que vem no pedido (as definições e o conteúdo gravam-se em páginas diferentes)
router.post("/update", requirePermission("communication", "update"), async (req, res) => {
  try {
    const { id, name, subject, design, html, audience, track } = req.body.data || {};
    const [comm] = await query("SELECT status FROM communication WHERE id = ?", [id]);
    if (!comm) return res.status(404).send({ message: "Communication not found" });
    if (!EDITABLE.includes(comm.status)) return res.status(409).send({ message: "Only drafts can be edited" });
    const fields = [];
    const values = [];
    if (name !== undefined) {
      fields.push("name = ?");
      values.push(String(name || "").trim() || "Untitled");
    }
    if (subject !== undefined) {
      fields.push("subject = ?");
      values.push(subject || "");
    }
    if (design !== undefined) {
      fields.push("design = ?");
      values.push(JSON.stringify(design || { editor: "grapes" }));
    }
    if (html !== undefined) {
      fields.push("html = ?");
      values.push(JSON.stringify(html || ""));
    }
    if (audience !== undefined) {
      fields.push("audience = ?");
      values.push(JSON.stringify(audience || { scope: "all" }));
    }
    if (track !== undefined && (await trackingReady())) {
      fields.push("track = ?");
      values.push(track ? 1 : 0);
    }
    if (fields.length === 0) return res.status(400).send({ message: "Nothing to update" });
    await query(`UPDATE communication SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
    res.send({ updated: true });
  } catch (e) {
    fail(res, e);
  }
});

// Agenda (scheduled_at) ou envia já (sem data): o serviço de envio (utils/communications.js) apanha-a em poucos segundos
router.post("/send", requirePermission("communication", "update"), async (req, res) => {
  try {
    const { id, scheduled_at } = req.body.data || {};
    const [comm] = await query("SELECT * FROM communication WHERE id = ?", [id]);
    if (!comm) return res.status(404).send({ message: "Communication not found" });
    if (comm.status !== "draft") return res.status(409).send({ message: "Only drafts can be sent" });
    if (!comm.subject.trim()) return res.status(400).send({ message: "The subject is required" });
    if (!comm.html || comm.html === '""') return res.status(400).send({ message: "The communication has no content" });
    const smtp = await query("SELECT meta_data FROM settings WHERE name_key = 'smtp'");
    try {
      email.internals.smtpFromRows(smtp);
    } catch (err) {
      return res.status(400).send({ message: err.message });
    }
    const total = await countAudience(JSON.parse(comm.audience || "{}"));
    if (total === 0) return res.status(400).send({ message: "The audience has no recipients" });

    // Endereço público da API para os links de rastreio: API_PUBLIC_URL, ou o endereço por onde chegou este pedido
    if (await trackingReady()) {
      const prefix = (process.env.API_PREFIX || "").replace(/\/$/, "");
      const base = process.env.API_PUBLIC_URL || `${req.get("x-forwarded-proto") || req.protocol}://${req.get("host")}${prefix}`;
      await query("UPDATE communication SET track_base = ? WHERE id = ?", [base.replace(/\/$/, ""), id]);
    }

    if (scheduled_at) {
      const when = new Date(scheduled_at);
      if (Number.isNaN(when.getTime())) return res.status(400).send({ message: "Invalid date" });
      await query("UPDATE communication SET status = 'scheduled', scheduled_at = ? WHERE id = ?", [when, id]);
    } else {
      await query("UPDATE communication SET status = 'scheduled', scheduled_at = NOW() WHERE id = ?", [id]);
    }
    res.send({ scheduled: true, total });
  } catch (e) {
    fail(res, e);
  }
});

// Agendada → volta a rascunho; a enviar → cancela o que falta enviar
router.post("/cancel", requirePermission("communication", "update"), async (req, res) => {
  try {
    const { id } = req.body.data || {};
    const [comm] = await query("SELECT status FROM communication WHERE id = ?", [id]);
    if (!comm) return res.status(404).send({ message: "Communication not found" });
    if (comm.status === "scheduled") {
      await query("UPDATE communication SET status = 'draft', scheduled_at = NULL WHERE id = ?", [id]);
    } else if (comm.status === "sending") {
      await query("UPDATE communication_recipient SET status = 'cancelled' WHERE id_communication = ? AND status = 'pending'", [id]);
      await query("UPDATE communication SET status = 'cancelled', finished_at = NOW() WHERE id = ?", [id]);
    } else {
      return res.status(409).send({ message: "This communication cannot be cancelled" });
    }
    res.send({ cancelled: true });
  } catch (e) {
    fail(res, e);
  }
});

// Volta a tentar os destinatários que falharam
router.post("/retry", requirePermission("communication", "update"), async (req, res) => {
  try {
    const { id } = req.body.data || {};
    const [comm] = await query("SELECT status FROM communication WHERE id = ?", [id]);
    if (!comm) return res.status(404).send({ message: "Communication not found" });
    if (!["sent", "failed", "cancelled"].includes(comm.status)) return res.status(409).send({ message: "This communication is not finished" });
    const result = await query("UPDATE communication_recipient SET status = 'pending', error_message = NULL WHERE id_communication = ? AND status = 'error'", [id]);
    if (result.affectedRows === 0) return res.status(400).send({ message: "There are no failed recipients" });
    await query("UPDATE communication SET status = 'sending', finished_at = NULL, error_message = NULL WHERE id = ?", [id]);
    res.send({ retried: result.affectedRows });
  } catch (e) {
    fail(res, e);
  }
});

router.get("/recipients", requirePermission("communication", "read"), async (req, res) => {
  try {
    const { id, status, q, engagement } = req.query;
    const tracking = await trackingReady();
    const all = req.query.all === "1";
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = all ? 100000 : Math.min(100, Math.max(1, Number(req.query.pageSize) || 15));
    const where = ["id_communication = ?"];
    const params = [id];
    if (["pending", "sent", "error", "cancelled"].includes(status)) {
      where.push("status = ?");
      params.push(status);
    }
    if (tracking) {
      if (engagement === "clicked") where.push("clicked_at IS NOT NULL");
      if (engagement === "not_clicked") where.push("status = 'sent' AND clicked_at IS NULL");
    }
    if (q) {
      where.push("(email LIKE ? OR name LIKE ? OR error_message LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM communication_recipient WHERE ${where.join(" AND ")}`, params);
    const columns = `id, id_user, email, name, status, error_message, sent_at${tracking ? ", clicked_at, click_count" : ""}`;
    const rows = await query(`SELECT ${columns} FROM communication_recipient WHERE ${where.join(" AND ")} ORDER BY id LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    res.send({ rows, total, tracking });
  } catch (e) {
    fail(res, e);
  }
});

// Números da comunicação: envio e cliques (os de rastreio só existem com a migração aplicada e o rastreio ligado)
router.get("/stats", requirePermission("communication", "read"), async (req, res) => {
  try {
    const id = req.query.id;
    const tracking = await trackingReady();
    const extra = tracking ? ", COALESCE(SUM(clicked_at IS NOT NULL), 0) AS clicked, COALESCE(SUM(click_count), 0) AS clicks" : "";
    const [row] = await query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'sent'), 0) AS sent, COALESCE(SUM(status = 'error'), 0) AS errors, COALESCE(SUM(status = 'pending'), 0) AS pending, COALESCE(SUM(status = 'cancelled'), 0) AS cancelled${extra} FROM communication_recipient WHERE id_communication = ?`,
      [id],
    );
    let topLinks = [];
    if (tracking) topLinks = await query("SELECT url, COUNT(*) AS clicks, COUNT(DISTINCT id_recipient) AS people FROM communication_click WHERE id_communication = ? GROUP BY url ORDER BY clicks DESC LIMIT 10", [id]);
    // O MySQL devolve os SUM() como texto: números para o cliente
    for (const key of Object.keys(row)) row[key] = Number(row[key]);
    res.send({ ...row, tracking, topLinks });
  } catch (e) {
    fail(res, e);
  }
});

router.post("/duplicate", requirePermission("communication", "create"), async (req, res) => {
  try {
    const [comm] = await query("SELECT * FROM communication WHERE id = ?", [req.body.data?.id]);
    if (!comm) return res.status(404).send({ message: "Communication not found" });
    const result = await query("INSERT INTO communication SET name = ?, subject = ?, design = ?, html = ?, audience = ?, created_by = ?", [`${comm.name} (copy)`.slice(0, 255), comm.subject, comm.design, comm.html, comm.audience, req.user.id]);
    res.send({ id: result.insertId });
  } catch (e) {
    fail(res, e);
  }
});

router.post("/delete", requirePermission("communication", "delete"), async (req, res) => {
  try {
    const { id } = req.body.data || {};
    const [comm] = await query("SELECT status FROM communication WHERE id = ?", [id]);
    if (!comm) return res.status(404).send({ message: "Communication not found" });
    if (comm.status === "sending") return res.status(409).send({ message: "Cancel the sending before deleting" });
    if (await trackingReady()) await query("DELETE FROM communication_click WHERE id_communication = ?", [id]);
    await query("DELETE FROM communication_recipient WHERE id_communication = ?", [id]);
    await query("DELETE FROM communication WHERE id = ?", [id]);
    res.send({ deleted: true });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
