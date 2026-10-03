const crypto = require("crypto");
const util = require("util");
const db = require("./database");
const { secret } = require("./token");

const query = util.promisify(db.query).bind(db);

// Rastreio das comunicações: links reescritos (clique) por destinatário. As aberturas não se medem (não são um valor fiável). Só funciona depois de correr a
// migração 2026-10-05-communication-tracking.sql: sem as colunas novas tudo continua a enviar-se, só que sem estatísticas.
let ready = false;
let checkedAt = 0;
let pending = null;
async function trackingReady() {
  if (ready) return true;
  // Pedidos em simultâneo esperam pela mesma verificação (senão o 2.º receberia "não" enquanto o 1.º ainda verifica)
  if (pending) return pending;
  if (Date.now() - checkedAt < 60 * 1000) return false;
  checkedAt = Date.now();
  pending = (async () => {
    try {
      const rows = await query("SHOW COLUMNS FROM communication_recipient LIKE 'token'");
      const cols = await query("SHOW COLUMNS FROM communication LIKE 'track'");
      ready = rows.length > 0 && cols.length > 0;
    } catch {
      ready = false;
    }
    return ready;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

const newToken = () => crypto.randomBytes(12).toString("hex");
const TOKEN_RE = /^[a-f0-9]{24}$/;

// Assinatura do link: sem ela qualquer pessoa poderia usar o nosso endereço para redirecionar para onde quisesse
const sign = (token, url) => crypto.createHmac("sha256", secret).update(`${token}|${url}`).digest("hex").slice(0, 24);
function validSignature(token, url, signature) {
  const expected = Buffer.from(sign(token, url));
  const given = Buffer.from(String(signature || ""));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

const decodeAmp = (value) => value.replace(/&amp;/g, "&");

// Reescreve os links (<a href>) para passarem pelo nosso servidor, que regista o clique e segue para o endereço original
function trackHtml(html, token, base) {
  const root = base.replace(/\/$/, "");
  return html.replace(/(<a\s[^>]*?href=")(https?:\/\/[^"]+)(")/gi, (match, start, rawUrl, end) => {
    const url = decodeAmp(rawUrl);
    if (url.startsWith(`${root}/t/`)) return match;
    return `${start}${root}/t/c/${token}?u=${encodeURIComponent(url)}&amp;s=${sign(token, url)}${end}`;
  });
}

module.exports = { trackingReady, newToken, trackHtml, validSignature, TOKEN_RE };
