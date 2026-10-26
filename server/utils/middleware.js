const util = require("util");
const { verifyToken, passwordFingerprint } = require("./token");
const db = require("./database");
const { cached } = require("./authCache");
const { readSession, csrfOk, isIdle } = require("./session");

const query = util.promisify(db.query).bind(db);

// Valida o token e identifica quem faz o pedido: req.user = { id, id_role, ... }, lido da base de dados (o papel nunca vem
// do cliente). Um token válido de um utilizador apagado ou que já não existe é recusado, e também um token emitido antes da última
// mudança de password (pv diferente): mudar a password termina as outras sessões.
const middleware = async (req, res, next) => {
  const session = readSession(req);
  if (!session) return res.status(403).send("A token is required for authentication");
  if (!csrfOk(req, session.source)) return res.status(403).send("Invalid request origin");

  try {
    const result = await verifyToken(session.token);
    if (!result.token_valid) return res.status(401).send("Invalid Token");
    // Inatividade (ver utils/session.js): a sessão continua válida, mas a pessoa tem de voltar a confirmar a palavra-passe
    if (isIdle(result.token_la)) return res.status(401).send({ message: "Session locked due to inactivity", code: "session_idle" });

    // Cache de 20 s (utils/authCache.js): a maior parte dos pedidos repete o mesmo utilizador
    const row = await cached("user", result.token_decoded.id, async () => {
      const rows = await query("SELECT id, id_role, id_lang, country, is_deleted, password FROM user WHERE id = ?", [result.token_decoded.id]);
      return rows[0] ?? null;
    });
    if (!row || row.is_deleted) return res.status(401).send("Invalid Token");
    if (result.token_decoded.pv !== undefined && result.token_decoded.pv !== passwordFingerprint(row.password)) return res.status(401).send("Invalid Token");

    req.user = { id: row.id, id_role: row.id_role, id_lang: row.id_lang, country: row.country };
    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).send("Invalid Token");
  }
};

module.exports = middleware;
