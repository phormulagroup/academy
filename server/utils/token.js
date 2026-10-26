const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// O segredo vem do ambiente (.env.*), nunca do código
const privateKey = process.env.JWT_SECRET;
if (!privateKey || privateKey.length < 32) {
  throw new Error("JWT_SECRET is missing or too short: set it in the .env file of this environment");
}

// Campos que nunca saem da API (hashes da password e do código de recuperação)
const SECRET_FIELDS = ["password", "recover_code", "recover_code_expires", "generate_password", "login_code", "login_code_expires"];

// Duração da sessão (SESSION_HOURS, por omissão 12 h): passada essa hora o token deixa de valer e a pessoa tem de entrar de novo, por isso uma
// sessão deixada aberta de um dia para o outro termina. A webapp lê o `exp` do token e também sai sozinha (ver utils/context.jsx).
const SESSION_HOURS = Math.min(24 * 30, Math.max(1, Number(process.env.SESSION_HOURS) || 12));

// Impressão digital da password atual: muda quando a password muda, por isso um token antigo deixa de valer, sem levar o hash no token
const passwordFingerprint = (hash) => crypto.createHmac("sha256", privateKey).update(String(hash || "")).digest("hex").slice(0, 24);

module.exports = {
  // Segredo para assinar os links de rastreio das comunicações (utils/tracking.js)
  secret: privateKey,
  SECRET_FIELDS,
  passwordFingerprint,
  verifyToken: function (token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, privateKey, { algorithms: ["HS256"] }, function (err, decoded) {
        if (err) {
          resolve({ token_valid: false, error: err });
        } else {
          // exp: fim absoluto da sessão; la: última atividade registada (sem ele, o momento em que o token foi emitido)
          const meta = { token_exp: decoded.exp, token_iat: decoded.iat, token_la: Number.isFinite(decoded.la) ? decoded.la : decoded.iat };
          delete decoded.iat;
          delete decoded.exp;
          resolve({ token_valid: true, token_decoded: decoded, ...meta });
        }
      });
    });
  },

  // 2FA: dispositivo de confiança. Depois de confirmar o código, o browser guarda este comprovativo e nos logins seguintes (30 dias)
  // não volta a ser pedido código. Deixa de valer ao fim de 30 dias ou se a password mudar (pv)
  createDeviceToken: function (user) {
    return new Promise((resolve, reject) => {
      jwt.sign({ id: user.id, purpose: "2fa", pv: passwordFingerprint(user.password) }, privateKey, { expiresIn: "30d", algorithm: "HS256" }, (err, token) => {
        if (err) return reject(err);
        resolve(token);
      });
    });
  },
  isTrustedDevice: function (deviceToken, user) {
    if (typeof deviceToken !== "string" || !deviceToken) return false;
    try {
      const decoded = jwt.verify(deviceToken, privateKey, { algorithms: ["HS256"] });
      return decoded.purpose === "2fa" && decoded.id === user.id && decoded.pv === passwordFingerprint(user.password);
    } catch {
      return false;
    }
  },

  // Sessão nova de um utilizador: o token (para o cookie) e quando termina (segundos desde 1970)
  createSession: async function (user) {
    const token = await module.exports.createToken(user);
    return { token, expires_at: jwt.decode(token).exp };
  },

  // Renova o sinal de atividade (la) mantendo o fim absoluto da sessão (exp). Devolve null se o token não for válido
  refreshActivity: async function (token) {
    const result = await module.exports.verifyToken(token);
    if (!result.token_valid) return null;
    const payload = { ...result.token_decoded, la: Math.floor(Date.now() / 1000), exp: result.token_exp };
    return new Promise((resolve, reject) => {
      jwt.sign(payload, privateKey, { algorithm: "HS256" }, (err, signed) => {
        if (err) return reject(err);
        resolve({ token: signed, expires_at: result.token_exp });
      });
    });
  },

  // O token leva só o necessário (a API lê o papel e o estado à base de dados em cada pedido)
  createToken: function (user) {
    const payload = { id: user.id, name: user.name, email: user.email, id_role: user.id_role, id_lang: user.id_lang, pv: passwordFingerprint(user.password), la: Math.floor(Date.now() / 1000) };
    return new Promise((resolve, reject) => {
      jwt.sign(payload, privateKey, { expiresIn: `${SESSION_HOURS}h`, algorithm: "HS256" }, (err, token) => {
        if (err) return reject(err);
        resolve(token);
      });
    });
  },
};
