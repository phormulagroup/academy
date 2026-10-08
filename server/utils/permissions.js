const util = require("util");
const db = require("./database");
const { cached } = require("./authCache");

const query = util.promisify(db.query).bind(db);

// Secções do backoffice a que se pode dar permissão (mesmas chaves do frontend: webapp/src/utils/permissions.jsx)
const RESOURCES = [
  "communication",
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
  "audit",
  "security",
  "email_template",
  "settings",
];

const ADMIN_ROLE_ID = 1;
const GESTOR_ROLE_ID = 4;
const MONITORING_RESOURCES = ["monitoring", "audit", "security"];
const gestorDefaultRows = () =>
  RESOURCES.filter((resource) => !MONITORING_RESOURCES.includes(resource)).map((resource) => ({ id_role: GESTOR_ROLE_ID, resource, can_create: 1, can_read: 1, can_update: 1, can_delete: 1 }));
// Permissões de uma função; o Gestor sem linhas guardadas fica com a predefinição
async function roleRows(idRole) {
  const rows = await query("SELECT * FROM permission WHERE id_role = ?", [idRole]);
  return rows.length === 0 && Number(idRole) === GESTOR_ROLE_ID ? gestorDefaultRows() : rows;
}
// Admin ou Gestor: o papel de Admin na plataforma (fora das permissões do backoffice)
const hasFullAccess = (user) => [ADMIN_ROLE_ID, GESTOR_ROLE_ID].includes(Number(user?.id_role));
// A função "Utilizador" é a que o registo atribui: não se apaga nem se renomeia, só se editam as suas permissões
const USER_ROLE_ID = 2;

// O Admin tem sempre acesso total (nunca consulta a tabela). Sem a tabela (migração por correr) ou sem linha: sem acesso.
async function hasPermission(user, resource, action) {
  if (!user) return false;
  if (Number(user.id_role) === ADMIN_ROLE_ID) return true;
  try {
    // As permissões de uma função mudam raramente: cache de 20 s (utils/authCache.js)
    const row = await cached("perm", `${user.id_role}:${resource}`, async () => (await roleRows(user.id_role)).find((r) => r.resource === resource) ?? null);
    return !!row && !!row[`can_${action}`];
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") console.error(err);
    return false;
  }
}

// Tem acesso ao backoffice quem é Admin ou pode ver pelo menos uma secção
async function isStaff(user) {
  if (!user) return false;
  if (Number(user.id_role) === ADMIN_ROLE_ID) return true;
  try {
    return await cached("staff", user.id_role, async () => (await roleRows(user.id_role)).some((r) => r.can_read));
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

// Gerir funções e permissões: só o Admin (o Gestor só as vê)
function requireAdmin(req, res, next) {
  return Number(req.user?.id_role) === ADMIN_ROLE_ID ? next() : denied(res);
}

module.exports = { RESOURCES, ADMIN_ROLE_ID, GESTOR_ROLE_ID, USER_ROLE_ID, MONITORING_RESOURCES, hasFullAccess, roleRows, hasPermission, isStaff, requirePermission, requireStaff, requireAdmin, denied };
