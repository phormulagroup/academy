var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");
const middleware = require("../utils/middleware");
const { notifyUser, notifyTeam, excerpt, emailLanguage, LANG_CODES } = require("../utils/notify");

// Idioma para quem escreveu pelo formulário de contacto: se o e-mail for de uma conta, um aluno recebe no idioma da conta e a equipa no
// idioma do formulário; sem conta, no idioma do formulário
async function contactLanguage(query, emailAddress, idLang) {
  const [account] = await query("SELECT id, id_role, id_lang FROM user WHERE email = ? AND is_deleted = 0 ORDER BY id DESC LIMIT 1", [emailAddress]).catch(() => []);
  return account ? emailLanguage(account, LANG_CODES[Number(idLang)]) : idLang;
}
const email = require("../utils/email");

// As respostas só existem depois de correr a migração 2026-10-08-form-submission-reply.sql: antes disso a lista e os detalhes
// funcionam como sempre (sem estado de resposta) e o botão de responder não aparece.
let repliesOk = false;
let repliesCheckedAt = 0;
let repliesPending = null;
async function repliesReady() {
  if (repliesOk) return true;
  if (repliesPending) return repliesPending;
  if (Date.now() - repliesCheckedAt < 30 * 1000) return false;
  repliesCheckedAt = Date.now();
  const query = util.promisify(db.query).bind(db);
  repliesPending = query("SHOW TABLES LIKE 'form_submission_reply'")
    .then((rows) => (repliesOk = rows.length > 0))
    .catch(() => false)
    .finally(() => (repliesPending = null));
  return repliesPending;
}

// Texto da pessoa → HTML seguro com as quebras de linha, para os e-mails ({{{reply}}} nos templates)
const toHtml = (text) =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, "<br/>");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/read", middleware, requirePermission("form_submission", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", middleware, requirePermission("form_submission", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const withReplies = await repliesReady();
    const rows = await query(
      `SELECT fs.*${
        withReplies
          ? `, (SELECT COUNT(*) FROM form_submission_reply r WHERE r.id_submission = fs.id AND r.status = 'sent') AS replies_sent,
              (SELECT COUNT(*) FROM form_submission_reply r WHERE r.id_submission = fs.id AND r.status = 'error') AS replies_failed,
              (SELECT MAX(r.created_at) FROM form_submission_reply r WHERE r.id_submission = fs.id AND r.status = 'sent') AS last_reply_at`
          : ""
      } FROM form_submission fs WHERE fs.id_lang = ? AND fs.is_deleted = 0`,
      [req.query.id_lang],
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

// Uma submissão com os dados de apoio: o nome do idioma e, se o e-mail for de um utilizador registado, quem é
router.get("/readById", middleware, requirePermission("form_submission", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const [row] = await query("SELECT * FROM form_submission WHERE id = ? AND is_deleted = 0", [req.query.id]);
    if (!row) return res.status(404).send({ message: "Submission not found" });
    const [language] = await query("SELECT name, code FROM language WHERE id = ?", [row.id_lang]);
    const [user] = row.email ? await query("SELECT id, name FROM user WHERE email = ? AND is_deleted = 0 LIMIT 1", [row.email]) : [];
    const repliesAvailable = await repliesReady();
    const replies = repliesAvailable
      ? await query("SELECT r.id, r.id_user, u.name AS user_name, r.to_email, r.subject, r.message, r.status, r.error_message, r.created_at, r.modified_at FROM form_submission_reply r LEFT JOIN user u ON u.id = r.id_user WHERE r.id_submission = ? ORDER BY r.created_at DESC, r.id DESC", [row.id])
      : [];
    res.send({ ...row, language: language || null, user: user || null, repliesAvailable, replies });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

router.post("/create", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    // Só os campos do formulário de contacto (nunca id, is_deleted ou outros escolhidos pelo cliente)
    const data = {};
    for (const field of ["subject", "name", "email", "message", "acceptance", "id_lang"]) if ((req.body.data || {})[field] !== undefined) data[field] = req.body.data[field];
    if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || typeof data.message !== "string" || !data.message.trim()) {
      return res.status(400).send({ message: "Invalid form data" });
    }
    // No máximo 5 mensagens por hora do mesmo e-mail: o formulário público não serve para inundar a equipa
    const [{ recent }] = await query("SELECT COUNT(*) AS recent FROM form_submission WHERE email = ? AND created_at > (NOW() - INTERVAL 1 HOUR)", [data.email]);
    if (recent >= 5) return res.status(429).send({ message: "Too many messages, try again later" });
    const insertedRow = await query("INSERT INTO form_submission SET ?", data);
    res.send(insertedRow);

    // Depois de responder (nunca atrasa nem parte o formulário): confirmação a quem escreveu e aviso à equipa. A confirmação não se repete
    // para o mesmo e-mail em 10 minutos, para o formulário não servir para encher uma caixa de correio alheia.
    try {
      const [{ n }] = await query("SELECT COUNT(*) AS n FROM form_submission WHERE email = ? AND id != ? AND created_at > (NOW() - INTERVAL 10 MINUTE)", [data.email, insertedRow.insertId]);
      if (n === 0) notifyUser("contact_received", { name: data.name, email: data.email, id_lang: await contactLanguage(query, data.email, data.id_lang) }, { subject: data.subject || "" }, { translate: ["subject"] });
      notifyTeam("contact_new", "form_submission", { name: data.name || "", email: data.email || "", subject: data.subject || "", message: excerpt(data.message), id_submission: insertedRow.insertId }, { translate: ["subject"], excludeEmail: data.email });
    } catch (e) {
      console.error(e.message);
    }
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: "Invalid form data" });
  }
});

// Envia o e-mail de uma resposta e devolve o resultado (nunca lança): { sent, message }. A razão da falha fica guardada com a resposta.
async function sendReply(submission, subject, message) {
  try {
    const info = await email.notify({
      type: "contact_reply",
      to: submission.email,
      id_lang: await contactLanguage(util.promisify(db.query).bind(db), submission.email, submission.id_lang),
      vars: { name: submission.name || "", subject, reply: toHtml(message), original: toHtml(excerpt(submission.message, 1500)) },
    });
    // Template desativado no backoffice: nada foi enviado
    if (info === null) return { sent: false, message: "The reply template is disabled (E-mail > Templates)" };
    return { sent: true };
  } catch (err) {
    return { sent: false, message: String(err.message || err).slice(0, 500) };
  }
}

// Responde a uma submissão pelo e-mail da plataforma e regista a resposta (quem, quando, o texto e se o e-mail saiu). Quem pode editar as
// submissões pode responder.
router.post("/reply", middleware, requirePermission("form_submission", "update"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    if (!(await repliesReady())) return res.status(503).send({ message: "Replies are not available yet (database migration pending)" });
    const { id } = req.body.data || {};
    const subject = String(req.body.data?.subject || "").trim().slice(0, 255);
    const message = String(req.body.data?.message || "").trim();
    if (!subject) return res.status(400).send({ message: "The subject is required" });
    if (!message) return res.status(400).send({ message: "The message is required" });
    const [submission] = await query("SELECT * FROM form_submission WHERE id = ? AND is_deleted = 0", [id]);
    if (!submission) return res.status(404).send({ message: "Submission not found" });
    if (!EMAIL_RE.test(submission.email || "")) return res.status(400).send({ message: "This submission has no valid e-mail address to reply to" });

    const result = await sendReply(submission, subject, message);
    const inserted = await query("INSERT INTO form_submission_reply SET ?", {
      id_submission: submission.id,
      id_user: req.user.id,
      to_email: submission.email,
      subject,
      message,
      status: result.sent ? "sent" : "error",
      error_message: result.sent ? null : result.message,
    });
    res.send({ id: inserted.insertId, sent: result.sent, message: result.message || null });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

// Volta a enviar uma resposta que falhou (o mesmo texto): atualiza o estado e a razão
router.post("/retryReply", middleware, requirePermission("form_submission", "update"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    if (!(await repliesReady())) return res.status(503).send({ message: "Replies are not available yet (database migration pending)" });
    const [reply] = await query("SELECT * FROM form_submission_reply WHERE id = ?", [req.body.data?.id]);
    if (!reply) return res.status(404).send({ message: "Reply not found" });
    if (reply.status === "sent") return res.status(409).send({ message: "This reply was already sent" });
    const [submission] = await query("SELECT * FROM form_submission WHERE id = ? AND is_deleted = 0", [reply.id_submission]);
    if (!submission) return res.status(404).send({ message: "Submission not found" });

    const result = await sendReply(submission, reply.subject, reply.message);
    await query("UPDATE form_submission_reply SET status = ?, error_message = ?, id_user = ? WHERE id = ?", [result.sent ? "sent" : "error", result.sent ? null : result.message, req.user.id, reply.id]);
    res.send({ sent: result.sent, message: result.message || null });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

router.post("/delete", middleware, requirePermission("form_submission", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE form_submission SET is_deleted = 1 WHERE id = ?", [toId(req.body.data.id)]);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
