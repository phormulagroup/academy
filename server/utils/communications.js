const util = require("util");
const Handlebars = require("handlebars");
const db = require("./database");
const email = require("./email");
const { logError, logEmail } = require("./monitor");
const { trackingReady, newToken, trackHtml } = require("./tracking");

const query = util.promisify(db.query).bind(db);

// Envio em lotes: a cada TICK_MS envia até BATCH_SIZE e-mails (por omissão 10 de 5 em 5 segundos = 120 por minuto), para não
// ultrapassar os limites do servidor SMTP. Ajusta-se com COMMUNICATION_BATCH_SIZE / COMMUNICATION_TICK_SECONDS.
const TICK_MS = (Number(process.env.COMMUNICATION_TICK_SECONDS) || 5) * 1000;
const BATCH_SIZE = Number(process.env.COMMUNICATION_BATCH_SIZE) || 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toIds = (list) => (Array.isArray(list) ? list.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []);
const toTexts = (list) => (Array.isArray(list) ? list.map(String).filter(Boolean) : []);

// Público: { scope: "all" | "selected", users, groups, courses (quem tem acesso ao curso, direto ou por grupo), roles, countries, languages }.
// "selected" junta utilizadores, membros dos grupos e quem tem acesso aos cursos escolhidos; função, país e idioma só restringem.
// Só recebem utilizadores aprovados, não apagados e com e-mail válido.
function buildAudienceQuery(audience = {}) {
  const where = ["u.status = 'approved'", "u.is_deleted = 0", "u.email IS NOT NULL", "u.email != ''"];
  const params = [];

  if (audience.scope === "selected") {
    const users = toIds(audience.users);
    const groups = toIds(audience.groups);
    const courses = toIds(audience.courses);
    const any = [];
    if (users.length) {
      any.push("u.id IN (?)");
      params.push(users);
    }
    if (groups.length) {
      any.push("u.id IN (SELECT id_user FROM user_group_member WHERE id_group IN (?))");
      params.push(groups);
    }
    if (courses.length) {
      any.push(
        "(u.id IN (SELECT id_user FROM course_user_access WHERE id_course IN (?)) OR u.id IN (SELECT m.id_user FROM user_group_member m JOIN course_group cg ON cg.id_group = m.id_group WHERE cg.id_course IN (?)))",
      );
      params.push(courses, courses);
    }
    // "Selecionados" sem nada escolhido não envia a ninguém
    where.push(any.length ? `(${any.join(" OR ")})` : "1 = 0");
  }

  const roles = toIds(audience.roles);
  const languages = toIds(audience.languages);
  const countries = toTexts(audience.countries);
  if (roles.length) {
    where.push("u.id_role IN (?)");
    params.push(roles);
  }
  if (languages.length) {
    where.push("u.id_lang IN (?)");
    params.push(languages);
  }
  if (countries.length) {
    where.push("u.country IN (?)");
    params.push(countries);
  }
  return { where: where.join(" AND "), params };
}

async function resolveAudience(audience, limit) {
  const { where, params } = buildAudienceQuery(audience);
  return query(`SELECT u.id, u.name, u.email, u.id_lang FROM user u WHERE ${where} ORDER BY u.id ${limit ? `LIMIT ${Number(limit)}` : ""}`, params);
}

async function countAudience(audience) {
  const { where, params } = buildAudienceQuery(audience);
  const rows = await query(`SELECT COUNT(*) AS total FROM user u WHERE ${where}`, params);
  return rows[0].total;
}

// ---- Serviço de envio ----

let running = false;
const compiled = new Map(); // id → { subject, html } já compilados

function templatesFor(comm) {
  const cached = compiled.get(comm.id);
  if (cached) return cached;
  // O html guarda-se como string JSON (como nos templates de e-mail)
  let html = comm.html;
  try {
    if (typeof html === "string" && html.startsWith('"')) html = JSON.parse(html);
  } catch {
    // já é HTML simples
  }
  const entry = { subject: Handlebars.compile(comm.subject || ""), html: Handlebars.compile(html || "") };
  compiled.set(comm.id, entry);
  return entry;
}

async function finish(comm, error) {
  compiled.delete(comm.id);
  const [{ sent }] = await query("SELECT COUNT(*) AS sent FROM communication_recipient WHERE id_communication = ? AND status = 'sent'", [comm.id]);
  const status = error || (comm.total > 0 && sent === 0) ? "failed" : "sent";
  await query("UPDATE communication SET status = ?, finished_at = NOW(), error_message = ? WHERE id = ?", [status, error ? String(error).slice(0, 500) : null, comm.id]);
}

// Passa as agendadas cuja hora chegou a "a enviar", criando uma linha por destinatário
async function startDue() {
  const due = await query("SELECT * FROM communication WHERE status = 'scheduled' AND scheduled_at <= NOW()");
  for (const comm of due) {
    try {
      const recipients = await resolveAudience(JSON.parse(comm.audience || "{}"));
      const valid = recipients.filter((r) => EMAIL_RE.test(r.email));
      // Com rastreio (e a migração aplicada) cada destinatário leva um token único para os links
      const tracking = !!comm.track && (await trackingReady());
      for (let i = 0; i < valid.length; i += 500) {
        const slice = valid.slice(i, i + 500);
        if (tracking) {
          await query("INSERT INTO communication_recipient (id_communication, id_user, email, name, token) VALUES ?", [slice.map((r) => [comm.id, r.id, r.email, r.name, newToken()])]);
        } else {
          await query("INSERT INTO communication_recipient (id_communication, id_user, email, name) VALUES ?", [slice.map((r) => [comm.id, r.id, r.email, r.name])]);
        }
      }
      await query("UPDATE communication SET status = 'sending', started_at = NOW(), total = ? WHERE id = ?", [valid.length, comm.id]);
      if (valid.length === 0) await finish({ ...comm, total: 0 }, "The audience has no recipients");
    } catch (err) {
      logError({ source: "communication", message: `Could not start communication ${comm.id}: ${err.message}`, stack: err.stack });
      await query("UPDATE communication SET status = 'failed', finished_at = NOW(), error_message = ? WHERE id = ?", [String(err.message).slice(0, 500), comm.id]);
    }
  }
}

async function sendBatch() {
  const [comm] = await query("SELECT * FROM communication WHERE status = 'sending' ORDER BY started_at LIMIT 1");
  if (!comm) return;

  const pending = await query("SELECT * FROM communication_recipient WHERE id_communication = ? AND status = 'pending' ORDER BY id LIMIT ?", [comm.id, BATCH_SIZE]);
  if (pending.length === 0) return finish(comm);

  const { internals } = email;
  let mailer;
  try {
    const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
    mailer = internals.buildTransporter(internals.smtpFromRows(rows));
  } catch (err) {
    // Sem SMTP não há nada a tentar: o envio falha com a razão
    logEmail({ template: "communication", status: "error", error: err });
    return finish(comm, err.message);
  }
  const tpl = templatesFor(comm);

  for (const r of pending) {
    // O envio pode ter sido cancelado enquanto o lote corria
    const [{ status }] = await query("SELECT status FROM communication WHERE id = ?", [comm.id]);
    if (status !== "sending") return;
    const context = { name: r.name || "", email: r.email };
    let html = tpl.html(context);
    // Rastreio: só se esta comunicação o quer, o destinatário tem token e sabemos o endereço público da API
    if (comm.track && comm.track_base && r.token) html = trackHtml(html, r.token, comm.track_base);
    try {
      await internals.emailContext.run({ name: "communication", logged: false }, () =>
        mailer.transporter.sendMail({ from: mailer.from, to: r.email, subject: tpl.subject(context), html }),
      );
      await query("UPDATE communication_recipient SET status = 'sent', sent_at = NOW(), error_message = NULL WHERE id = ?", [r.id]);
    } catch (err) {
      await query("UPDATE communication_recipient SET status = 'error', error_message = ? WHERE id = ?", [String(err.message).slice(0, 500), r.id]);
    }
  }
}

// Se algo falha (ex.: BD em baixo, tabelas por criar) não se repete o erro a cada tick: espera cada vez mais (até 5 min) e só
// regista o mesmo erro uma vez por hora, para não encher a Monitorização.
let failures = 0;
let nextTryAt = 0;
let lastLogged = { message: null, at: 0 };

async function tick() {
  if (running || Date.now() < nextTryAt) return;
  running = true;
  try {
    await startDue();
    await sendBatch();
    failures = 0;
  } catch (err) {
    failures++;
    nextTryAt = Date.now() + Math.min(5 * 60 * 1000, TICK_MS * 2 ** failures);
    if (err.message !== lastLogged.message || Date.now() - lastLogged.at > 60 * 60 * 1000) {
      lastLogged = { message: err.message, at: Date.now() };
      logError({ source: "communication", message: err.message, stack: err.stack });
    }
  } finally {
    running = false;
  }
}

// Arranque: se o servidor reiniciou a meio de um envio, os destinatários "pending" continuam a ser enviados
function startCommunications() {
  setInterval(tick, TICK_MS).unref();
}

module.exports = { resolveAudience, countAudience, startCommunications, EMAIL_RE, BATCH_SIZE, TICK_MS };
