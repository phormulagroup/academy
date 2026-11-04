// Sessões terminadas (logout): um token continua a ser um JWT válido até expirar, por isso, ao terminar a sessão, o seu identificador (jti) entra aqui e a API
// recusa-o de imediato. Em memória (rápido, sem uma consulta por pedido) e na tabela revoked_session (migração 2026-11-04), carregada no arranque para
// sobreviver a reinícios. Sem a tabela só há a memória. Entradas só existem até ao instante em que o token expiraria.
const crypto = require("crypto");
const util = require("util");
const db = require("./database");

const query = util.promisify(db.query).bind(db);
const revoked = new Map(); // chave → fim da validade do token (ms)
let lastPurge = 0;

// Tokens emitidos antes de haver jti: identificam-se pelo hash do próprio token
const keyOf = (decoded, token) => (decoded?.jti ? String(decoded.jti) : `h:${crypto.createHash("sha256").update(String(token)).digest("hex")}`);

const isMissingTable = (err) => err?.code === "ER_NO_SUCH_TABLE";

function isRevoked(decoded, token) {
  const key = keyOf(decoded, token);
  const until = revoked.get(key);
  if (until === undefined) return false;
  if (until <= Date.now()) {
    revoked.delete(key);
    return false;
  }
  return true;
}

async function purge() {
  lastPurge = Date.now();
  try {
    await query("DELETE FROM revoked_session WHERE expires_at < NOW()");
  } catch (err) {
    if (!isMissingTable(err)) console.error(err.message);
  }
}

// Termina a sessão deste token (expSeconds = quando o token expira)
async function revoke(decoded, token, expSeconds) {
  const key = keyOf(decoded, token);
  const expiresMs = Number(expSeconds) * 1000;
  if (!Number.isFinite(expiresMs)) return;
  revoked.set(key, expiresMs);
  try {
    await query("INSERT INTO revoked_session (jti, expires_at) VALUES (?, FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)", [key, Math.floor(expiresMs / 1000)]);
    if (Date.now() - lastPurge > 3600 * 1000) purge();
  } catch (err) {
    // Sem a tabela (migração por correr) a sessão fica terminada só em memória
    if (!isMissingTable(err)) console.error(err.message);
  }
}

// No arranque: volta a pôr em memória as sessões terminadas que ainda não expiraram
async function load() {
  try {
    const rows = await query("SELECT jti, UNIX_TIMESTAMP(expires_at) AS exp FROM revoked_session WHERE expires_at > NOW()");
    rows.forEach((row) => revoked.set(row.jti, Number(row.exp) * 1000));
    purge();
  } catch (err) {
    if (!isMissingTable(err)) console.error(err.message);
  }
}

module.exports = { isRevoked, revoke, load, keyOf };
