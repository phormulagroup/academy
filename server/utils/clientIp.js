// IP de quem faz o pedido. NUNCA se confia num cabeçalho só porque existe: qualquer cliente pode enviar `CF-Connecting-IP` ou
// `X-Forwarded-For` com o valor que quiser, e foi assim que bastava um cabeçalho novo a cada pedido para fugir ao limite de pedidos e ao
// bloqueio do login. Por omissão o IP é o de `req.ip` (o Express só lê `X-Forwarded-For` dos TRUST_PROXY saltos confiáveis).
//
// CLIENT_IP_HEADER (opcional): nome do cabeçalho onde um proxy de confiança (ex.: a Cloudflare, com `cf-connecting-ip`) põe o IP real. Só
// se define quando a API NÃO é acessível sem passar por esse proxy (origem fechada ao proxy); senão o cabeçalho é forjável.
const net = require("net");

// ::ffff:1.2.3.4 (IPv4 dentro de IPv6) → 1.2.3.4
const stripMapped = (ip) => (ip.startsWith("::ffff:") && net.isIPv4(ip.slice(7)) ? ip.slice(7) : ip);

// Só aceita valores que são mesmo um IP (nada de texto livre a servir de chave ou a ir para a BD)
const validIp = (value) => {
  const ip = stripMapped(String(value || "").trim());
  return net.isIP(ip) ? ip : null;
};

// O IP do cliente, tal como é (para mostrar e registar)
function clientIp(req) {
  const header = (process.env.CLIENT_IP_HEADER || "").trim().toLowerCase();
  const fromHeader = header ? validIp(String(req.headers[header] || "").split(",")[0]) : null;
  return fromHeader || validIp(req.ip) || validIp(req.socket?.remoteAddress) || "";
}

// Chave para limitar pedidos e tentativas: em IPv6 uma pessoa controla um bloco inteiro (/64), por isso variar os últimos 64 bits não pode
// dar um limite novo a cada pedido
function ipKey(req) {
  const ip = clientIp(req);
  if (!net.isIPv6(ip)) return ip;
  const groups = expandIpv6(ip);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : ip;
}

// "2001:db8::1" → ["2001","0db8","0000","0000","0000","0000","0000","0001"]
function expandIpv6(ip) {
  const [head, tail] = ip.split("::");
  const a = head ? head.split(":") : [];
  const b = tail ? tail.split(":") : [];
  const fill = ip.includes("::") ? 8 - a.length - b.length : 0;
  const groups = [...a, ...Array(Math.max(0, fill)).fill("0"), ...b];
  return groups.length === 8 ? groups.map((g) => g.toLowerCase().padStart(4, "0")) : null;
}

module.exports = { clientIp, ipKey, validIp };
