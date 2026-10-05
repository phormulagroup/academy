const util = require("util");
const { verifyToken } = require("./token");
const db = require("./database");
const { cached } = require("./authCache");

const query = util.promisify(db.query).bind(db);

// Valida o token e identifica quem faz o pedido: req.user = { id, id_role, ... }, lido da base de dados (o papel nunca vem
// do cliente). Um token válido de um utilizador apagado ou que já não existe é recusado.
const middleware = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(403).send("A token is required for authentication");

  try {
    const result = await verifyToken(token);
    if (!result.token_valid) return res.status(401).send("Invalid Token");

    // Cache de 20 s (utils/authCache.js): a maior parte dos pedidos repete o mesmo utilizador
    const row = await cached("user", result.token_decoded.id, async () => {
      const rows = await query("SELECT id, id_role, id_lang, country, is_deleted FROM user WHERE id = ?", [result.token_decoded.id]);
      return rows[0] ?? null;
    });
    if (!row || row.is_deleted) return res.status(401).send("Invalid Token");

    req.user = { id: row.id, id_role: row.id_role, id_lang: row.id_lang, country: row.country };
    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).send("Invalid Token");
  }
};

module.exports = middleware;
