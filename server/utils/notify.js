const util = require("util");
const db = require("./database");
const email = require("./email");
const types = require("./emailTypes.json");
const { isStaff, ADMIN_ROLE_ID, GESTOR_ROLE_ID } = require("./permissions");

const query = util.promisify(db.query).bind(db);

// Idiomas da plataforma (language.id → código nos endereços da área de aluno)
const LANG_CODES = { 3: "pt", 4: "es", 5: "en", 6: "fr" };

// Idioma do e-mail de quem recebe. Quem é da equipa (Admin ou função com acesso ao backoffice) e faz a própria ação recebe no idioma escolhido
// na app (`lang`: seletor do header ou idioma do formulário); o aluno recebe sempre no idioma da sua conta. Sem `lang` (o e-mail resulta da
// ação de outra pessoa, ex.: aprovação ou resposta a um pedido) vale o idioma da conta.
async function emailLanguage(user, lang) {
  const chosen = Number(Object.keys(LANG_CODES).find((id) => LANG_CODES[id] === lang));
  if (!chosen || !user) return user?.id_lang;
  let role = user.id_role;
  if (role === undefined) role = (await query("SELECT id_role FROM user WHERE id = ?", [user.id]).catch(() => []))[0]?.id_role;
  const staff = await isStaff({ id_role: role });
  return staff ? chosen : user.id_lang;
}

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

// Mensagem do editor (HTML, ex.: pedidos) em texto simples para o e-mail: sem tags nem entidades (o template já escapa o texto)
const plainText = (html) =>
  String(html || "")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

// Traduções da plataforma (tabela language, por idioma): valores escolhidos numa lista (assunto do contacto, país) chegam ao e-mail no
// idioma de quem recebe. Cache de 5 minutos por idioma; sem tradução fica o valor original.
const translations = new Map();
async function translateValue(idLang, text) {
  if (!text) return text;
  const id = Number(idLang);
  let entry = translations.get(id);
  if (!entry || entry.at < Date.now() - 5 * 60 * 1000) {
    const [row] = await query("SELECT translation FROM language WHERE id = ?", [id]).catch(() => []);
    const map = {};
    try {
      for (const item of JSON.parse(row?.translation || "[]")) map[item.key] = item.value;
    } catch {
      // tradução inválida: fica o valor original
    }
    entry = { at: Date.now(), map };
    translations.set(id, entry);
  }
  return String(entry.map[text] ?? text).trim();
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
// `translate`: variáveis traduzidas para o idioma de quem recebe (ex.: ["subject"] no contacto, ["country"] no novo registo).
function notifyUser(type, user, vars = {}, { strict = false, translate = [] } = {}) {
  if (!user?.email) return Promise.resolve(null);
  const kind = types[type]?.link;
  const sending = (async () => {
    const context = { name: user.name || "", email: user.email, ...vars };
    for (const key of translate) context[key] = await translateValue(user.id_lang, context[key]);
    if (kind && !context.url) context.url = linkFor(kind, user.id_lang, context);
    return email.notify({ type, to: user.email, id_lang: user.id_lang, vars: context });
  })();
  if (strict) return sending;
  return sending.catch((err) => {
    console.error(`[notify:${type}]`, err.message);
    return null;
  });
}

// Avisa a equipa que pode ler uma secção do backoffice (os Admin e as funções com permissão de ver essa secção)
// `excludeUserId`: quem fez a ação não recebe o aviso dela (ex.: um administrador que abre um pedido).
// `excludeEmail`: o mesmo, quando só se conhece o e-mail (ex.: alguém da equipa que escreve pelo formulário de contacto).
async function notifyTeam(type, resource, vars = {}, { excludeUserId = null, excludeEmail = null, translate = [] } = {}) {
  let team = [];
  try {
    team = await query(
      `SELECT u.id, u.name, u.email, u.id_lang FROM user u
       WHERE u.is_deleted = 0 AND u.status = 'approved' AND u.email IS NOT NULL AND u.email != ''
         AND (u.id_role IN (?, ?) OR u.id_role IN (SELECT id_role FROM permission WHERE resource = ? AND can_read = 1))`,
      [ADMIN_ROLE_ID, GESTOR_ROLE_ID, resource],
    );
  } catch {
    // Sem a tabela de permissões só os Admin
    team = await query("SELECT id, name, email, id_lang FROM user WHERE is_deleted = 0 AND status = 'approved' AND id_role IN (?, ?) AND email IS NOT NULL AND email != ''", [ADMIN_ROLE_ID, GESTOR_ROLE_ID]).catch(() => []);
  }
  const skipEmail = String(excludeEmail || "").trim().toLowerCase();
  team = team.filter((member) => (!excludeUserId || member.id !== Number(excludeUserId)) && (!skipEmail || String(member.email).trim().toLowerCase() !== skipEmail));
  await Promise.all(team.map((member) => notifyUser(type, member, vars, { translate })));
  return team.length;
}

// Avisa uma pessoa concreta da equipa (ex.: quem tem o pedido atribuído), se continuar ativa e aprovada
async function notifyMember(type, userId, vars = {}) {
  const [member] = await query("SELECT id, name, email, id_lang FROM user WHERE id = ? AND is_deleted = 0 AND status = 'approved'", [userId]).catch(() => []);
  if (!member) return false;
  await notifyUser(type, member, vars);
  return true;
}

module.exports = { notifyUser, notifyTeam, notifyMember, appUrl, excerpt, plainText, emailLanguage, LANG_CODES };
