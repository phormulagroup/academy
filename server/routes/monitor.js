var express = require("express");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");
const { getStatus, RETENTION_DAYS } = require("../utils/monitor");
const { tableReady } = require("../utils/throttle");
const { tableReady: auditReady } = require("../utils/audit");

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

// Bloqueios por tentativas excessivas (login, código de recuperação): os ativos e as tentativas recentes, com o IP, para o Admin poder desbloquear
// quem for um utilizador real. Sem a tabela (migração 2026-10-10) devolve available: false.
router.get("/blocks", requirePermission("security", "read"), async (req, res) => {
  if (!(await tableReady())) return res.send({ available: false, rows: [], blocked: 0 });
  const rows = await query(
    `SELECT b.id, b.scope, b.kind, b.identifier, b.ip, b.attempts, b.blocked_until, b.last_attempt_at, b.window_ends,
            (b.blocked_until IS NOT NULL AND b.blocked_until > NOW()) AS is_blocked,
            u.id AS id_user, u.name AS user_name
     FROM security_block b LEFT JOIN user u ON b.kind = 'email' AND u.email = b.identifier AND u.is_deleted = 0
     WHERE b.window_ends > NOW() OR b.blocked_until > NOW()
     ORDER BY is_blocked DESC, b.last_attempt_at DESC LIMIT 500`,
  );
  res.send({ available: true, rows, blocked: rows.filter((r) => r.is_blocked).length });
});

// Desbloqueia um (id) ou todos (sem id): apaga o registo, por isso o contador recomeça do zero
router.post("/blocks/unblock", requirePermission("security", "update"), async (req, res) => {
  if (!(await tableReady())) return res.status(409).send({ message: "Blocks are not available yet (database migration pending)" });
  const id = Number(req.body.data?.id);
  const result = id ? await query("DELETE FROM security_block WHERE id = ?", [id]) : await query("DELETE FROM security_block");
  res.send({ unblocked: result.affectedRows });
});

// Registo de atividade (CRUD): ?page=&limit=&search=&user=<id>&resource=&action=&from=YYYY-MM-DD&to=YYYY-MM-DD. Sem a tabela (migração 2026-10-13)
// devolve available: false.
router.get("/audit", requirePermission("audit", "read"), async (req, res) => {
  if (!(await auditReady())) return res.send({ available: false, rows: [], total: 0 });
  const { page, limit, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  const search = String(req.query.search || "").trim();
  if (search) {
    where.push("(a.label LIKE ? OR a.record_id = ? OR a.route LIKE ?)");
    params.push(`%${search}%`, search, `%${search}%`);
  }
  if (req.query.user) {
    where.push("a.id_user = ?");
    params.push(Number(req.query.user) || 0);
  }
  if (req.query.resource) {
    where.push("a.resource = ?");
    params.push(String(req.query.resource));
  }
  if (req.query.action) {
    where.push("a.action = ?");
    params.push(String(req.query.action));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "")) {
    where.push("a.created_at >= ?");
    params.push(`${req.query.from} 00:00:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "")) {
    where.push("a.created_at <= ?");
    params.push(`${req.query.to} 23:59:59`);
  }
  const clause = where.join(" AND ");
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM audit_log a WHERE ${clause}`, params);
  const rows = await query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email, u.img AS user_img, r.name AS role_name
     FROM audit_log a LEFT JOIN user u ON u.id = a.id_user LEFT JOIN role r ON r.id = u.id_role
     WHERE ${clause} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  res.send({ available: true, rows, total, page, limit });
});

// Opções dos filtros: secções com registos e quem fez alterações
router.get("/audit/facets", requirePermission("audit", "read"), async (req, res) => {
  if (!(await auditReady())) return res.send({ resources: [], users: [] });
  const [resources, users] = await Promise.all([
    query("SELECT DISTINCT resource FROM audit_log ORDER BY resource"),
    query("SELECT DISTINCT a.id_user AS id, u.name, u.email FROM audit_log a LEFT JOIN user u ON u.id = a.id_user WHERE a.id_user IS NOT NULL ORDER BY u.name LIMIT 200"),
  ]);
  res.send({ resources: resources.map((r) => r.resource), users });
});

module.exports = router;
