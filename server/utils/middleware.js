const util = require("util");
const { verifyToken } = require("./token");
const db = require("./database");

const query = util.promisify(db.query).bind(db);

// Valida o token e identifica quem faz o pedido: req.user = { id, id_role, ... }, lido da base de dados (o papel nunca vem
// do cliente). Um token válido de um utilizador apagado ou que já não existe é recusado.
const middleware = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(403).send("A token is required for authentication");

  try {
    const result = await verifyToken(token);
    if (!result.token_valid) return res.status(401).send("Invalid Token");

    const rows = await query("SELECT id, id_role, id_lang, country, is_deleted FROM user WHERE id = ?", [result.token_decoded.id]);
    if (rows.length === 0 || rows[0].is_deleted) return res.status(401).send("Invalid Token");

    req.user = { id: rows[0].id, id_role: rows[0].id_role, id_lang: rows[0].id_lang, country: rows[0].country };
    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).send("Invalid Token");
  }
};

module.exports = middleware;
