const { SECRET_FIELDS } = require("./token");

// Remove, de qualquer resposta JSON, os campos secretos (hashes). Rede de segurança: mesmo que uma rota devolva a linha inteira
// do utilizador (SELECT *), a password e o código de recuperação nunca chegam ao browser.
function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_FIELDS.includes(k)) continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}

module.exports = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => json(strip(body));
  next();
};
