const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// O segredo vem do ambiente (.env.*), nunca do código
const privateKey = process.env.JWT_SECRET;
if (!privateKey || privateKey.length < 32) {
  throw new Error("JWT_SECRET is missing or too short: set it in the .env file of this environment");
}

// Campos que nunca saem da API (hashes da password e do código de recuperação)
const SECRET_FIELDS = ["password", "recover_code", "generate_password"];

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
          delete decoded.iat;
          delete decoded.exp;
          resolve({ token_valid: true, token_decoded: decoded });
        }
      });
    });
  },

  // O token leva só o necessário (a API lê o papel e o estado à base de dados em cada pedido)
  createToken: function (user) {
    const payload = { id: user.id, name: user.name, email: user.email, id_role: user.id_role, id_lang: user.id_lang, pv: passwordFingerprint(user.password) };
    return new Promise((resolve, reject) => {
      jwt.sign(payload, privateKey, { expiresIn: "5d", algorithm: "HS256" }, (err, token) => {
        if (err) return reject(err);
        resolve(token);
      });
    });
  },
};
