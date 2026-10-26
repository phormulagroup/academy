// Sessão por cookie HttpOnly (o JavaScript da página nunca vê o token, por isso um XSS não o consegue roubar) e limite de inatividade.
// O cookie leva o mesmo JWT de sempre; o cabeçalho Authorization continua a ser aceite (ferramentas e a troca de sessões antigas).

const COOKIE_NAME = "academy_session";

// Inatividade máxima (IDLE_MINUTES, por omissão 30): sem atividade da pessoa durante este tempo a API recusa a sessão (401 session_idle) e a
// webapp pede a palavra-passe. A margem cobre o atraso entre o último sinal de atividade e o seguinte.
const IDLE_MINUTES = Math.min(240, Math.max(5, Number(process.env.IDLE_MINUTES) || 30));
const IDLE_GRACE_SECONDS = 120;

// Valor do cabeçalho X-Requested-With que a webapp envia em todos os pedidos: um site externo não o consegue enviar (exige CORS), o que
// protege os pedidos que alteram dados contra CSRF mesmo com o cookie (além do SameSite=Lax)
const CSRF_HEADER_VALUE = "academy-webapp";

const prefix = (process.env.API_PREFIX || "").replace(/\/$/, "");

function parseCookies(header) {
  const out = {};
  if (typeof header !== "string") return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (!name || name in out) continue;
    try {
      out[name] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // cookie mal formado: ignora
    }
  }
  return out;
}

// De onde vem a sessão: cookie (webapp) ou cabeçalho Authorization (ferramentas, sessões guardadas antes do cookie)
function readSession(req) {
  const cookie = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (cookie) return { token: cookie, source: "cookie" };
  const header = req.headers.authorization;
  if (header) return { token: header, source: "header" };
  return null;
}

function cookieOptions(req, expiresAtSeconds) {
  const maxAge = Math.max(0, Math.floor(expiresAtSeconds - Date.now() / 1000)) * 1000;
  return { httpOnly: true, sameSite: "lax", secure: !!req.secure, path: prefix || "/", maxAge };
}

function setSessionCookie(req, res, token, expiresAtSeconds) {
  res.cookie(COOKIE_NAME, token, cookieOptions(req, expiresAtSeconds));
}

function clearSessionCookie(req, res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: !!req.secure, path: prefix || "/" });
}

// Pedidos que alteram dados e vêm com o cookie têm de trazer o cabeçalho da webapp
function csrfOk(req, source) {
  if (source !== "cookie") return true;
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  return req.headers["x-requested-with"] === CSRF_HEADER_VALUE;
}

// Passou o limite de inatividade desde a última atividade registada no token?
function isIdle(lastActivitySeconds, nowMs = Date.now()) {
  if (!Number.isFinite(lastActivitySeconds)) return false;
  return nowMs / 1000 - lastActivitySeconds > IDLE_MINUTES * 60 + IDLE_GRACE_SECONDS;
}

module.exports = {
  COOKIE_NAME,
  IDLE_MINUTES,
  IDLE_GRACE_SECONDS,
  CSRF_HEADER_VALUE,
  parseCookies,
  readSession,
  setSessionCookie,
  clearSessionCookie,
  csrfOk,
  isIdle,
};
