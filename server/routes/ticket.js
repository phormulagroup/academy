var express = require("express");
var util = require("util");
var dayjs = require("dayjs");
var path = require("path");
var fs = require("fs");
var crypto = require("crypto");
var fileUpload = require("express-fileupload");
var router = express.Router();

var db = require("../utils/database");
const { hasPermission, requirePermission } = require("../utils/permissions");

router.use(fileUpload({ limits: { fileSize: 2 * 1024 * 1024 }, abortOnLimit: false }));

// Nunca expor detalhes internos do erro (SQL, stack) ao cliente: ficam só no log do servidor
function handleError(res, err, fallbackMessage = "An error occurred on the server.") {
  console.log(err);
  res.status(500).send({ message: fallbackMessage });
}

class ValidationError extends Error {}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
// Pasta fora da pasta pública `media` (que o index.js serve sem autenticação): os anexos só se obtêm por GET /ticket/attachment
const ATTACHMENTS_DIR = process.env.TICKET_ATTACHMENTS_DIR || path.join(__dirname, "..", "media-private", "ticket");
// Só tipos seguros: um anexo pode ser enviado por qualquer utilizador e é aberto por quem o consulta (nunca SVG/HTML)
const ALLOWED_ATTACHMENTS = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "application/pdf": ".pdf" };
const TICKET_TYPE_ERROR = "File type not allowed. Only PDF, PNG, JPG, GIF and WEBP are accepted.";

function normalizeFiles(fileField) {
  if (!fileField) return [];
  return Array.isArray(fileField) ? fileField : [fileField];
}

async function saveAttachment(file) {
  const ext = ALLOWED_ATTACHMENTS[file.mimetype];
  if (!ext) throw new ValidationError(TICKET_TYPE_ERROR);
  if (file.size > MAX_ATTACHMENT_BYTES || file.truncated) throw new ValidationError("File too large. The maximum size is 2MB.");
  await fs.promises.mkdir(ATTACHMENTS_DIR, { recursive: true });
  const base = path.basename(file.name, path.extname(file.name)).replace(/[^\w-]+/g, "_").slice(0, 60) || "file";
  const name = `${base}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  await file.mv(path.join(ATTACHMENTS_DIR, name));
  return name;
}

async function deleteUploadedAttachments(names) {
  await Promise.all((names || []).map((name) => fs.promises.unlink(path.join(ATTACHMENTS_DIR, name)).catch(() => {})));
}

// Anexos guardam-se como um array JSON de nomes de ficheiro. Se o ficheiro 3 de 5 falhar, apaga os já gravados
async function uploadAttachments(files) {
  if (files.length === 0) return null;
  const results = await Promise.allSettled(files.map(saveAttachment));
  const failed = results.find((r) => r.status === "rejected");
  if (failed) {
    await deleteUploadedAttachments(results.filter((r) => r.status === "fulfilled").map((r) => r.value));
    throw failed.reason;
  }
  return JSON.stringify(results.map((r) => r.value));
}

// Quem pode ficar responsável por um ticket: o Admin e as funções com permissão de edição em "ticket"
const STAFF_USERS_SQL =
  "SELECT id, name FROM user WHERE is_deleted = 0 AND (id_role = 1 OR id_role IN (SELECT id_role FROM permission WHERE resource = 'ticket' AND can_update = 1)) ORDER BY name ASC";

const TICKET_PRIORITIES = ["baixa", "normal", "alta", "urgente"];

// A prioridade é um campo de triagem só para a equipa: nunca se mostra a quem abriu o ticket
function stripPriorityForOwner(ticket) {
  const { priority, ...rest } = ticket;
  return rest;
}

// Não lido para quem abriu o ticket: há mensagens da equipa depois da última leitura
const UNREAD_MEMBER_SUBQUERY = `
  EXISTS (
    SELECT 1 FROM ticket_message m
    WHERE m.id_ticket = ticket.id AND m.id_user != ticket.id_user
    AND m.created_at > COALESCE(ticket.last_member_read_at, '1970-01-01 00:00:00')
  )
`;

// Não lido para a equipa: partilhado por todos (basta uma pessoa abrir o ticket para deixar de ser novo para todos)
const UNREAD_ADMIN_SUBQUERY = `
  EXISTS (
    SELECT 1 FROM ticket_message m
    WHERE m.id_ticket = ticket.id AND m.id_user = ticket.id_user
    AND m.created_at > COALESCE(ticket.last_admin_read_at, '1970-01-01 00:00:00')
  )
`;

const nowSql = () => dayjs().format("YYYY-MM-DD HH:mm:ss");

// Tickets não lidos: os próprios com resposta nova e, para quem pode ver os tickets de todos, os novos da equipa
router.get("/unreadCount", async (req, res) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const own = await query(`SELECT COUNT(*) c FROM ticket WHERE ticket.id_user = ? AND ${UNREAD_MEMBER_SUBQUERY}`, [req.user.id]);
    let count = own[0]?.c ?? 0;
    if (await hasPermission(req.user, "ticket", "read")) {
      const staff = await query(`SELECT COUNT(*) c FROM ticket WHERE ${UNREAD_ADMIN_SUBQUERY}`);
      count += staff[0]?.c ?? 0;
    }
    res.send({ count });
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/read", requirePermission("ticket", "read"), async (req, res) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const conditions = ["1=1"];
    const params = [];

    const search = (req.query.search || "").trim();
    if (search) {
      conditions.push("(user.name LIKE ? OR user.email LIKE ? OR ticket.subject LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (req.query.status) {
      conditions.push("ticket.status = ?");
      params.push(req.query.status);
    }
    if (req.query.priority) {
      conditions.push("ticket.priority = ?");
      params.push(req.query.priority);
    }
    // Sempre o id de quem faz o pedido, nunca um id vindo do cliente
    if (req.query.assignedToMe === "true") {
      conditions.push("ticket.id_assignee = ?");
      params.push(req.user.id);
    }
    // Filtro por um responsável (já atrás de ticket:read); "none" filtra os que ainda não têm responsável
    if (req.query.id_assignee) {
      if (req.query.id_assignee === "none") {
        conditions.push("ticket.id_assignee IS NULL");
      } else {
        conditions.push("ticket.id_assignee = ?");
        params.push(req.query.id_assignee);
      }
    }

    const where = conditions.join(" AND ");
    const joins = "FROM ticket LEFT JOIN user ON user.id = ticket.id_user LEFT JOIN user assignee ON assignee.id = ticket.id_assignee";

    const countRows = await query(`SELECT COUNT(*) c ${joins} WHERE ${where}`, params);
    const total = countRows[0]?.c ?? 0;

    // Contagem por prioridade (cartões de resumo): sempre sobre todos os tickets, não sobre os filtros
    const priorityCountRows = await query("SELECT priority, COUNT(*) c FROM ticket GROUP BY priority");
    const priorityCounts = TICKET_PRIORITIES.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
    priorityCountRows.forEach((r) => {
      priorityCounts[r.priority] = r.c;
    });

    // Quem escreveu a última mensagem: serve para destacar os tickets "à espera de resposta" da equipa
    const LAST_SENDER = "(SELECT m.id_user FROM ticket_message m WHERE m.id_ticket = ticket.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1)";
    let sql =
      `SELECT ticket.*, user.name, user.email, user.img, assignee.name AS assignee_name, ${UNREAD_ADMIN_SUBQUERY} AS unread, ` +
      `${LAST_SENDER} AS last_message_id_user ${joins} WHERE ${where} ORDER BY ticket.last_message_at DESC`;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    if (page > 0 && limit > 0) {
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, (page - 1) * limit);
    }
    const rows = await query(sql, params);
    res.send({ data: rows, total, priorityCounts });
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/readByUserId", async (req, res) => {
  try {
    const targetId = req.query.id_user;
    const isOwner = Number(req.user?.id) === Number(targetId);
    if (!isOwner && !(await hasPermission(req.user, "ticket", "read"))) {
      return res.status(403).send({ message: "You do not have permission to view these tickets." });
    }
    const query = util.promisify(db.query).bind(db);
    const rows = await query(`SELECT ticket.*, ${UNREAD_MEMBER_SUBQUERY} AS unread FROM ticket WHERE ticket.id_user = ? ORDER BY ticket.last_message_at DESC`, [targetId]);
    res.send(isOwner ? rows.map(stripPriorityForOwner) : rows);
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/readById", async (req, res) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const rows = await query(
      "SELECT ticket.*, owner.name, owner.email AS owner_email, assignee.name AS assignee_name FROM ticket " +
        "LEFT JOIN user owner ON owner.id = ticket.id_user LEFT JOIN user assignee ON assignee.id = ticket.id_assignee WHERE ticket.id = ?",
      [req.query.id],
    );
    if (rows.length === 0) return res.status(404).send({ message: "Ticket not found." });
    const ticket = rows[0];
    const isOwner = Number(req.user?.id) === Number(ticket.id_user);
    if (!isOwner && !(await hasPermission(req.user, "ticket", "read"))) {
      return res.status(403).send({ message: "You do not have permission to view this ticket." });
    }

    const messages = await query(
      "SELECT ticket_message.*, user.name, user.img FROM ticket_message LEFT JOIN user ON user.id = ticket_message.id_user WHERE id_ticket = ? ORDER BY ticket_message.created_at ASC, ticket_message.id ASC",
      [ticket.id],
    );

    // Ler a conversa marca-a como lida (pelo dono ou pela equipa)
    await query(`UPDATE ticket SET ${isOwner ? "last_member_read_at" : "last_admin_read_at"} = ? WHERE id = ?`, [nowSql(), ticket.id]);

    res.send({ ticket: isOwner ? stripPriorityForOwner(ticket) : ticket, messages });
  } catch (err) {
    handleError(res, err);
  }
});

// Serve um anexo a partir de ATTACHMENTS_DIR (nunca montada como pasta pública). Confirma a posse/permissão sobre o ticket e
// que o ficheiro pedido pertence mesmo a uma mensagem desse ticket (não confia só no nome vindo do URL).
router.get("/attachment/:idTicket/:filename", async (req, res) => {
  try {
    const idTicket = Number(req.params.idTicket);
    const query = util.promisify(db.query).bind(db);
    const ticketRows = await query("SELECT id_user FROM ticket WHERE id = ?", [idTicket]);
    if (ticketRows.length === 0) return res.status(404).send({ message: "Ticket not found." });
    const isOwner = Number(req.user?.id) === Number(ticketRows[0].id_user);
    if (!isOwner && !(await hasPermission(req.user, "ticket", "read"))) {
      return res.status(403).send({ message: "You do not have permission to view this attachment." });
    }

    const safeName = path.basename(req.params.filename);
    const messageRows = await query("SELECT attachment FROM ticket_message WHERE id_ticket = ? AND attachment IS NOT NULL", [idTicket]);
    const belongsToTicket = messageRows.some((m) => {
      try {
        return JSON.parse(m.attachment).includes(safeName);
      } catch {
        return false;
      }
    });
    if (!belongsToTicket) return res.status(404).send({ message: "Attachment not found." });

    // Sempre como descarga, nunca inline: o browser nunca o interpreta como HTML/script
    res.set("Content-Disposition", `attachment; filename="${safeName}"`);
    res.sendFile(safeName, { root: path.resolve(ATTACHMENTS_DIR) }, (err) => {
      if (err && !res.headersSent) handleError(res, err, "Could not get the attachment.");
    });
  } catch (err) {
    handleError(res, err);
  }
});

function withTransaction(req, res, handler) {
  const files = normalizeFiles(req.files?.file);
  if (files.length > MAX_ATTACHMENTS) return res.status(400).send({ message: `You can attach up to ${MAX_ATTACHMENTS} files.` });

  db.getConnection(async (error, conn) => {
    if (error) return handleError(res, error);
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    // Fora do try/catch para o catch poder limpar anexos já gravados se outra parte do pedido falhar
    const state = { attachment: null };
    try {
      await transaction();
      await handler({ query, commit, rollback, files, state });
    } catch (err) {
      await rollback().catch(() => {});
      if (state.attachment) deleteUploadedAttachments(JSON.parse(state.attachment)).catch(() => {});
      handleError(res, err, err instanceof ValidationError ? err.message : undefined);
    } finally {
      conn.release();
    }
  });
}

router.post("/create", (req, res) => {
  withTransaction(req, res, async ({ query, commit, files, state }) => {
    const { subject, message } = JSON.parse(req.body.data);
    if (!String(subject || "").trim() || !String(message || "").trim()) throw new ValidationError("Subject and message are required.");
    const now = nowSql();
    state.attachment = await uploadAttachments(files);
    const inserted = await query("INSERT INTO ticket (id_user, subject, last_message_at, last_member_read_at) VALUES (?, ?, ?, ?)", [req.user.id, String(subject).trim(), now, now]);
    await query("INSERT INTO ticket_message (id_ticket, id_user, message, attachment) VALUES (?, ?, ?, ?)", [inserted.insertId, req.user.id, message, state.attachment]);
    await commit();
    res.send({ id: inserted.insertId });
  });
});

router.post("/reply", (req, res) => {
  withTransaction(req, res, async ({ query, commit, rollback, files, state }) => {
    const { id_ticket, message } = JSON.parse(req.body.data);
    if (!String(message || "").trim()) throw new ValidationError("Message is required.");

    const rows = await query("SELECT * FROM ticket WHERE id = ? FOR UPDATE", [id_ticket]);
    if (rows.length === 0) {
      await rollback();
      return res.status(404).send({ message: "Ticket not found." });
    }
    const ticket = rows[0];
    const isOwner = Number(req.user?.id) === Number(ticket.id_user);
    if (!isOwner && !(await hasPermission(req.user, "ticket", "update"))) {
      await rollback();
      return res.status(403).send({ message: "You do not have permission to reply to this ticket." });
    }

    state.attachment = await uploadAttachments(files);
    await query("INSERT INTO ticket_message (id_ticket, id_user, message, attachment) VALUES (?, ?, ?, ?)", [id_ticket, req.user.id, message, state.attachment]);

    const now = nowSql();
    let newAssigneeId = null;
    if (isOwner) {
      // O dono responde: um ticket fechado volta a abrir
      await query("UPDATE ticket SET last_message_at = ?, last_member_read_at = ?, status = ? WHERE id = ?", [now, now, ticket.status === "fechado" ? "aberto" : ticket.status, id_ticket]);
    } else if (ticket.id_assignee == null) {
      // A 1.ª resposta da equipa assume o ticket, se ainda não tiver responsável
      newAssigneeId = req.user.id;
      await query("UPDATE ticket SET last_message_at = ?, last_admin_read_at = ?, id_assignee = ? WHERE id = ?", [now, now, req.user.id, id_ticket]);
    } else {
      await query("UPDATE ticket SET last_message_at = ?, last_admin_read_at = ? WHERE id = ?", [now, now, id_ticket]);
    }

    await commit();
    res.send({ success: true, id_assignee: newAssigneeId });
  });
});

router.post("/updateStatus", requirePermission("ticket", "update"), async (req, res) => {
  try {
    const { id, status } = req.body.data;
    if (!["aberto", "fechado"].includes(status)) return res.status(400).send({ message: "Invalid status." });
    const query = util.promisify(db.query).bind(db);
    const result = await query("UPDATE ticket SET status = ? WHERE id = ?", [status, id]);
    if (result.affectedRows === 0) return res.status(404).send({ message: "Ticket not found." });
    res.send({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

// Responsáveis possíveis. "read" (não "update"): também preenche o filtro "Responsável" da listagem
router.get("/assignableUsers", requirePermission("ticket", "read"), async (req, res) => {
  try {
    const query = util.promisify(db.query).bind(db);
    res.send(await query(STAFF_USERS_SQL));
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/assign", requirePermission("ticket", "update"), async (req, res) => {
  try {
    const { id, id_assignee } = req.body.data;
    const query = util.promisify(db.query).bind(db);
    const ticketRows = await query("SELECT id FROM ticket WHERE id = ?", [id]);
    if (ticketRows.length === 0) return res.status(404).send({ message: "Ticket not found." });
    if (id_assignee != null) {
      const allowed = (await query(STAFF_USERS_SQL)).some((u) => u.id === Number(id_assignee));
      if (!allowed) return res.status(400).send({ message: "Invalid assignee." });
    }
    await query("UPDATE ticket SET id_assignee = ? WHERE id = ?", [id_assignee ?? null, id]);
    res.send({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/updatePriority", requirePermission("ticket", "update"), async (req, res) => {
  try {
    const { id, priority } = req.body.data;
    if (!TICKET_PRIORITIES.includes(priority)) return res.status(400).send({ message: "Invalid priority." });
    const query = util.promisify(db.query).bind(db);
    const result = await query("UPDATE ticket SET priority = ? WHERE id = ?", [priority, id]);
    if (result.affectedRows === 0) return res.status(404).send({ message: "Ticket not found." });
    res.send({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
