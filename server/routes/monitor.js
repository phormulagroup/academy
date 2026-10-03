var express = require("express");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");
const { getStatus, RETENTION_DAYS } = require("../utils/monitor");

const query = util.promisify(db.query).bind(db);

function paging(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

// Disponibilidade: estado agora, tempo desde o último arranque, tempo em baixo (24h, 7 e 30 dias) e a lista de incidentes
router.get("/status", requirePermission("monitoring", "read"), async (req, res) => {
  const status = await getStatus();
  const [errors] = await query("SELECT COUNT(*) AS c FROM server_log WHERE created_at > (NOW() - INTERVAL 1 DAY) AND level = 'error'");
  const [unresolved] = await query("SELECT COUNT(*) AS c FROM server_log WHERE is_resolved = 0 AND level = 'error'");
  const [emailErrors] = await query("SELECT COUNT(*) AS c FROM email_log WHERE created_at > (NOW() - INTERVAL 1 DAY) AND status = 'error'");
  res.send({ ...status, errors_24h: errors.c, errors_unresolved: unresolved.c, email_errors_24h: emailErrors.c, retention_days: RETENTION_DAYS });
});

// Erros do servidor (os que o servidor reproduz: pedidos que falharam, rejeições e exceções não tratadas)
router.get("/errors", requirePermission("monitoring", "read"), async (req, res) => {
  const { page, limit, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  if (req.query.level) {
    where.push("server_log.level = ?");
    params.push(req.query.level);
  }
  if (req.query.source) {
    where.push("server_log.source = ?");
    params.push(req.query.source);
  }
  if (req.query.resolved === "0" || req.query.resolved === "1") {
    where.push("server_log.is_resolved = ?");
    params.push(Number(req.query.resolved));
  }
  const search = String(req.query.search || "").trim();
  if (search) {
    where.push("(server_log.message LIKE ? OR server_log.url LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const clause = where.join(" AND ");
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM server_log WHERE ${clause}`, params);
  const rows = await query(
    `SELECT server_log.*, user.name AS user_name FROM server_log LEFT JOIN user ON user.id = server_log.id_user WHERE ${clause} ORDER BY server_log.created_at DESC, server_log.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  res.send({ rows, total, page, limit });
});

router.post("/errors/resolve", requirePermission("monitoring", "update"), async (req, res) => {
  const ids = (req.body.data?.ids || []).map(Number).filter(Number.isInteger);
  if (ids.length === 0) return res.status(400).send({ message: "No ids" });
  await query("UPDATE server_log SET is_resolved = ? WHERE id IN (?)", [req.body.data?.resolved === false ? 0 : 1, ids]);
  res.send({ success: true });
});

router.post("/errors/delete", requirePermission("monitoring", "delete"), async (req, res) => {
  const ids = (req.body.data?.ids || []).map(Number).filter(Number.isInteger);
  if (ids.length === 0) return res.status(400).send({ message: "No ids" });
  await query("DELETE FROM server_log WHERE id IN (?)", [ids]);
  res.send({ success: true });
});

// E-mails enviados pela plataforma e, nos que falharam, a razão do erro
router.get("/emails", requirePermission("monitoring", "read"), async (req, res) => {
  const { page, limit, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  if (req.query.status === "sent" || req.query.status === "error") {
    where.push("status = ?");
    params.push(req.query.status);
  }
  const search = String(req.query.search || "").trim();
  if (search) {
    where.push("(to_email LIKE ? OR subject LIKE ? OR template LIKE ? OR error_message LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const clause = where.join(" AND ");
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM email_log WHERE ${clause}`, params);
  const rows = await query(`SELECT * FROM email_log WHERE ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [totals] = await query("SELECT SUM(status = 'sent') AS sent, SUM(status = 'error') AS errors FROM email_log");
  res.send({ rows, total, page, limit, sent: Number(totals.sent || 0), errors: Number(totals.errors || 0) });
});

module.exports = router;
