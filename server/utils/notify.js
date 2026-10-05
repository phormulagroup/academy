const util = require("util");
const db = require("./database");
const email = require("./email");
const types = require("./emailTypes.json");

const query = util.promisify(db.query).bind(db);

// Idiomas da plataforma (language.id → código nos endereços da área de aluno)
const LANG_CODES = { 3: "pt", 4: "es", 5: "en", 6: "fr" };

// Endereço público da aplicação (os botões dos e-mails): APP_PUBLIC_URL, ou o da API sem o "/api" final, ou o de produção
function appUrl() {
  const fromApi = (process.env.API_PUBLIC_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
  return (process.env.APP_PUBLIC_URL || fromApi || "https://academy.bial.com").replace(/\/$/, "");
}

// Endereço do botão de cada tipo de e-mail (o tipo diz em emailTypes.json qual usa)
function linkFor(kind, idLang, vars) {
  const base = appUrl();
  const lang = LANG_CODES[Number(idLang)] || "en";
  switch (kind) {
    case "login":
      return `${base}/login`;
    case "recover":
      return `${base}/recover`;
    case "tickets":
      return `${base}/${lang}/tickets`;
    case "results":
      return `${base}/${lang}/result`;
    case "submission":
      return `${base}/admin/answers/${vars.id_submission || ""}`;
    case "user":
      return `${base}/admin/users/${vars.id_user || ""}`;
    case "ticket_admin":
      return `${base}/admin/tickets`;
    default:
      return base;
  }
}

// Texto de uma mensagem para o e-mail: sem excesso de tamanho
const excerpt = (text, max = 400) => {
  const clean = String(text || "").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
};

// Envia um e-mail automático a uma pessoa SEM nunca atrasar nem partir o que a pessoa estava a fazer: corre à parte e, se falhar (SMTP por
// configurar, template em falta...), a razão fica em Monitorização > E-mails e o pedido original segue normalmente.
// `user`: { name, email, id_lang }; `vars`: as variáveis do template (as do tipo estão em emailTypes.json).
// Com { strict: true} um erro de envio não se engole (quem chama decide: ex. a recuperação de password tem de avisar que o e-mail não saiu).
function notifyUser(type, user, vars = {}, { strict = false } = {}) {
  if (!user?.email) return Promise.resolve(null);
  const kind = types[type]?.link;
  const context = { name: user.name || "", email: user.email, ...vars };
  if (kind && !context.url) context.url = linkFor(kind, user.id_lang, context);
  const sending = email.notify({ type, to: user.email, id_lang: user.id_lang, vars: context });
  if (strict) return sending;
  return sending.catch((err) => {
    console.error(`[notify:${type}]`, err.message);
    return null;
  });
}

// Avisa a equipa que pode ler uma secção do backoffice (os Admin e as funções com permissão de ver essa secção)
// `excludeUserId`: quem fez a ação não recebe o aviso dela (ex.: um administrador que abre um pedido).
async function notifyTeam(type, resource, vars = {}, { excludeUserId = null } = {}) {
  let team = [];
  try {
    team = await query(
      `SELECT u.id, u.name, u.email, u.id_lang FROM user u
       WHERE u.is_deleted = 0 AND u.status = 'approved' AND u.email IS NOT NULL AND u.email != ''
         AND (u.id_role = 1 OR u.id_role IN (SELECT id_role FROM permission WHERE resource = ? AND can_read = 1))`,
      [resource],
    );
  } catch {
    // Sem a tabela de permissões só os Admin
    team = await query("SELECT id, name, email, id_lang FROM user WHERE is_deleted = 0 AND status = 'approved' AND id_role = 1 AND email IS NOT NULL AND email != ''").catch(() => []);
  }
  team = team.filter((member) => !excludeUserId || member.id !== Number(excludeUserId));
  await Promise.all(team.map((member) => notifyUser(type, member, vars)));
  return team.length;
}

// Avisa uma pessoa concreta da equipa (ex.: quem tem o pedido atribuído), se continuar ativa e aprovada
async function notifyMember(type, userId, vars = {}) {
  const [member] = await query("SELECT id, name, email, id_lang FROM user WHERE id = ? AND is_deleted = 0 AND status = 'approved'", [userId]).catch(() => []);
  if (!member) return false;
  await notifyUser(type, member, vars);
  return true;
}

module.exports = { notifyUser, notifyTeam, notifyMember, appUrl, excerpt, LANG_CODES };
