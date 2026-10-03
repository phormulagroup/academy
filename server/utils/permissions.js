const util = require("util");
const db = require("./database");

const query = util.promisify(db.query).bind(db);

// Secções do backoffice a que se pode dar permissão (mesmas chaves do frontend: webapp/src/utils/permissions.jsx)
const RESOURCES = [
  "course",
  "certificate",
  "report",
  "document",
  "download",
  "product",
  "media",
  "iec",
  "faqs",
  "notification",
  "language",
  "personalization",
  "user",
  "user_group",
  "form_submission",
  "ticket",
  "monitoring",
  "email_template",
  "settings",
];

const ADMIN_ROLE_ID = 1;

// O Admin tem sempre acesso total (nunca consulta a tabela). Sem a tabela (migração por correr) ou sem linha: sem acesso.
async function hasPermission(user, resource, action) {
  if (!user) return false;
  if (user.id_role === ADMIN_ROLE_ID) return true;
  try {
    const rows = await query("SELECT * FROM permission WHERE id_role = ? AND resource = ?", [user.id_role, resource]);
    return rows.length > 0 && !!rows[0][`can_${action}`];
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") console.error(err);
    return false;
  }
}

// Tem acesso ao backoffice quem é Admin ou pode ver pelo menos uma secção
async function isStaff(user) {
  if (!user) return false;
  if (user.id_role === ADMIN_ROLE_ID) return true;
  try {
    const rows = await query("SELECT 1 FROM permission WHERE id_role = ? AND can_read = 1 LIMIT 1", [user.id_role]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

function denied(res) {
  return res.status(403).send({ message: "You do not have permission for this action" });
}

// Middleware: exige a permissão `action` (create, read, update ou delete) na secção `resource`
function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      if (!(await hasPermission(req.user, resource, action))) return denied(res);
      next();
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error" });
    }
  };
}

function requireStaff() {
  return async (req, res, next) => ((await isStaff(req.user)) ? next() : denied(res));
}

function requireAdmin(req, res, next) {
  return req.user?.id_role === ADMIN_ROLE_ID ? next() : denied(res);
}

module.exports = { RESOURCES, ADMIN_ROLE_ID, hasPermission, isStaff, requirePermission, requireStaff, requireAdmin, denied };
