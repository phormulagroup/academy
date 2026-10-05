const util = require("util");
const db = require("./database");

const query = util.promisify(db.query).bind(db);

// Monitorização da plataforma: erros do servidor, e-mails enviados e disponibilidade. Tudo aqui é "à prova de falhas": registar
// nunca pode partir o pedido nem o servidor (se a base de dados estiver em baixo, o erro fica só na consola).

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
// Se o servidor ficou mais do que isto sem dar sinal de vida, o intervalo conta como "em baixo"
const DOWNTIME_THRESHOLD_SECONDS = 90;
const RETENTION_DAYS = 90;

const cut = (value, max) => (value == null ? null : String(value).slice(0, max));

// Regista um erro do servidor. `req` (opcional) acrescenta rota, utilizador e IP.
async function logError({ level = "error", source, message, stack, req, status } = {}) {
  console.error(`[${source}]`, message);
  try {
    await query("INSERT INTO server_log SET ?", {
      level,
      source: cut(source, 50) || "server",
      message: String(message ?? "Unknown error").slice(0, 65000),
      stack: stack ? String(stack).slice(0, 16000000) : null,
      method: cut(req?.method, 10),
      url: cut(req?.originalUrl || req?.url, 500),
      status_code: status ?? null,
      id_user: req?.user?.id ?? null,
      ip: cut(req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req?.socket?.remoteAddress, 64),
      user_agent: cut(req?.headers?.["user-agent"], 255),
    });
  } catch (err) {
    console.error("Could not store the error log:", err.message);
  }
}

// Regista um e-mail enviado (ou que falhou, com a razão)
async function logEmail({ to, subject, template, status, error, info, durationMs }) {
  try {
    await query("INSERT INTO email_log SET ?", {
      to_email: cut(Array.isArray(to) ? to.join(", ") : to, 255),
      subject: cut(subject, 500),
      template: cut(template, 100),
      status,
      error_message: error ? String(error.message ?? error).slice(0, 65000) : null,
      error_code: cut(error?.code || error?.responseCode, 100),
      message_id: cut(info?.messageId, 255),
      smtp_response: cut(error?.response || info?.response, 500),
      duration_ms: durationMs ?? null,
    });
  } catch (err) {
    console.error("Could not store the e-mail log:", err.message);
  }
}

const now = () => new Date();
let startedAt = now();
let dbDownSince = null;

async function writeHeartbeat() {
  try {
    await query(
      "INSERT INTO server_heartbeat (id, last_seen, started_at) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE last_seen = VALUES(last_seen)",
      [now(), startedAt],
    );
    // A base de dados voltou: o intervalo em que não respondeu fica registado como tempo em baixo
    if (dbDownSince) {
      const ended = now();
      const seconds = Math.round((ended - dbDownSince) / 1000);
      if (seconds >= 30) await query("INSERT INTO downtime SET ?", { started_at: dbDownSince, ended_at: ended, duration_seconds: seconds, reason: "database_down" });
      dbDownSince = null;
    }
  } catch (err) {
    if (!dbDownSince) dbDownSince = now();
    console.error("Heartbeat failed (database unreachable?):", err.message);
  }
}

// No arranque: se o último sinal de vida é antigo, o servidor esteve em baixo desde então até agora
async function recordStartup() {
  startedAt = now();
  try {
    const rows = await query("SELECT last_seen FROM server_heartbeat WHERE id = 1");
    if (rows.length > 0) {
      const seconds = Math.round((startedAt - new Date(rows[0].last_seen)) / 1000);
      if (seconds > DOWNTIME_THRESHOLD_SECONDS) {
        await query("INSERT INTO downtime SET ?", { started_at: rows[0].last_seen, ended_at: startedAt, duration_seconds: seconds, reason: "server_down" });
      }
    }
    await writeHeartbeat();
  } catch (err) {
    console.error("Could not record the server start:", err.message);
  }
}

async function purgeOldLogs() {
  try {
    await query("DELETE FROM server_log WHERE created_at < (NOW() - INTERVAL ? DAY)", [RETENTION_DAYS]);
    await query("DELETE FROM email_log WHERE created_at < (NOW() - INTERVAL ? DAY)", [RETENTION_DAYS]);
    // O registo de atividade guarda-se mais tempo (um ano): é a memória do que o cliente e a equipa mexeram
    await query("DELETE FROM audit_log WHERE created_at < (NOW() - INTERVAL 365 DAY)").catch(() => {});
  } catch (err) {
    console.error("Could not purge the old logs:", err.message);
  }
}

let timers = [];
async function startMonitoring() {
  await recordStartup();
  timers.push(setInterval(writeHeartbeat, HEARTBEAT_INTERVAL_MS).unref?.() ?? 0);
  timers.push(setInterval(purgeOldLogs, 24 * 3600 * 1000).unref?.() ?? 0);
  setTimeout(purgeOldLogs, 60 * 1000).unref?.();
}

// Resumo da disponibilidade: estado agora, tempo desde o último arranque, tempo em baixo e % de disponibilidade em 24h, 7 e 30 dias
async function getStatus() {
  let databaseOk = true;
  try {
    await query("SELECT 1");
  } catch {
    databaseOk = false;
  }

  const windows = { "24h": 1, "7d": 7, "30d": 30 };
  const result = {};
  const incidents = databaseOk ? await query("SELECT id, started_at, ended_at, duration_seconds, reason FROM downtime ORDER BY started_at DESC LIMIT 50").catch(() => []) : [];
  const since = (days) => new Date(Date.now() - days * 24 * 3600 * 1000);

  for (const [key, days] of Object.entries(windows)) {
    const from = since(days);
    // Só conta a parte de cada incidente que cai dentro da janela
    let down = 0;
    incidents.forEach((i) => {
      const start = Math.max(new Date(i.started_at), from);
      const end = new Date(i.ended_at);
      if (end > start) down += (end - start) / 1000;
    });
    const total = days * 24 * 3600;
    result[key] = { downtime_seconds: Math.round(down), incidents: incidents.filter((i) => new Date(i.ended_at) > from).length, availability: Math.max(0, Math.round((1 - down / total) * 10000) / 100) };
  }

  return {
    status: databaseOk ? "ok" : "database_down",
    started_at: startedAt,
    uptime_seconds: Math.round((Date.now() - startedAt) / 1000),
    windows: result,
    incidents,
    server_time: now(),
  };
}

module.exports = { logError, logEmail, startMonitoring, getStatus, RETENTION_DAYS };
