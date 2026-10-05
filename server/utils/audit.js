const util = require("util");
const db = require("./database");
const { verifyToken } = require("./token");

const query = util.promisify(db.query).bind(db);

// Registo de atividade (CRUD): depois de cada pedido que cria, altera ou apaga algo no backoffice (e correu bem), guarda quem foi, em que
// secção, que registo e os campos alterados (antes → depois). Nunca atrasa nem parte o pedido: falhas só vão para a consola.
// Sem a tabela audit_log (migração 2026-10-13) não regista nada.

// Secção (1.º segmento do endereço) → tabela, para ler o estado anterior e mostrar o que mudou
const TABLES = {
  course: "course",
  user: "user",
  usergroup: "user_group",
  language: "language",
  role: "role",
  communication: "communication",
  emaillibrary: "email_library",
  settings: "settings",
  email: "email_template",
  certificate: "course_certificate",
  notification: "notification",
  document: "document",
  download: "download",
  faqs: "faqs",
  form: "form_submission",
  personalization: "personalization",
  product: "product",
  iec: "iec",
  media: "media",
  ticket: "ticket",
};
// Ações dentro de uma secção que mexem noutras tabelas
const ACTION_TABLES = { "course:updateTopic": "course_topic", "course:updateTest": "course_test", "course:module": "course_module" };

// Além de create/update/delete: ações que também interessa registar (as restantes, como pesquisas e verificações, não)
const EXTRA_ACTIONS = new Set([
  "changeStatus", "createPassword", "setAccessUsers", "setAccessGroups", "setMembers", "set", "default", "duplicate", "send", "cancel", "retry",
  "reply", "retryReply", "assign", "updateStatus", "updatePriority", "upload", "singleUpload", "reorder", "module", "updateTopic", "updateTest",
  "completeProgress", "resetProgress", "deleteTry", "user",
]);
const SKIP = new Set(["auth", "t", "monitor"]); // login/registo, rastreio e a própria monitorização

const SECRET = /pass|token|secret|recover|code$/i;
const BULKY = new Set(["html", "design", "content", "question", "material", "objection", "translation", "meta_data"]);

const short = (value, max = 240) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > max ? `${text.slice(0, max)}… (${text.length} chars)` : text;
};

// Compara valores de colunas JSON sem depender da formatação
const same = (a, b) => {
  const norm = (v) => {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "object") return JSON.stringify(v);
    const text = String(v);
    try {
      return JSON.stringify(JSON.parse(text));
    } catch {
      return text;
    }
  };
  return norm(a) === norm(b);
};

function describe(path, prefix) {
  const parts = path.slice(prefix.length).split("/").filter(Boolean);
  const resource = parts[0];
  const verb = parts[1];
  if (!resource || !verb || SKIP.has(resource)) return null;
  if (!["create", "update", "delete"].includes(verb) && !EXTRA_ACTIONS.has(verb)) return null;
  return { resource, verb, table: ACTION_TABLES[`${resource}:${verb}`] || TABLES[resource] || null };
}

const labelOf = (row = {}) => short(row.internal_name || row.name || row.title || row.email || row.subject || row.slug || row.name_key || null, 200);

// Mudanças: nos updates só os campos que mudaram (antes → depois); nos creates o que foi enviado; nos apagados o que lá estava.
// Passwords e tokens nunca se guardam; textos longos (conteúdos) só aparecem como "alterado"; mensagens de pessoas (tickets) ficam de fora.
function buildChanges(verb, before, rawData) {
  const out = {};
  // O formulário envia Nome e Apelido separados; na base de dados é uma só coluna (name)
  let data = rawData || {};
  if (data.first_name !== undefined || data.last_name !== undefined) {
    const { first_name, last_name, ...rest } = data;
    data = { ...rest, name: [first_name, last_name].filter(Boolean).join(" ").trim() };
  }
  const skip = new Set(["id", "mode", "scheduled_at", "message", "attachment"]);
  const keys = Object.keys(data).filter((k) => !skip.has(k));
  const value = (key, v) => (SECRET.test(key) ? "***" : BULKY.has(key) ? "(…)" : short(v));
  if (verb === "update" && before) {
    for (const key of keys) {
      if (SECRET.test(key)) out[key] = ["***", "***"];
      else if (key in before && !same(before[key], data[key])) out[key] = BULKY.has(key) ? ["(…)", "(changed)"] : [short(before[key]), short(data[key])];
    }
  } else if (verb === "delete" && before) {
    for (const key of ["name", "internal_name", "title", "email", "subject", "slug"]) if (before[key] != null) out[key] = [short(before[key]), null];
  } else {
    for (const key of keys) out[key] = [null, value(key, data[key])];
  }
  return out;
}

let tableOk = false;
let checkedAt = 0;
async function tableReady() {
  if (tableOk) return true;
  if (Date.now() - checkedAt < 30 * 1000) return false;
  checkedAt = Date.now();
  try {
    tableOk = (await query("SHOW TABLES LIKE 'audit_log'")).length > 0;
  } catch {
    tableOk = false;
  }
  return tableOk;
}

const parseData = (req) => {
  const raw = req.body?.data;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
};

function auditMiddleware(prefix = "") {
  return async (req, res, next) => {
    if (req.method !== "POST") return next();
    const info = describe(req.path, prefix);
    if (!info) return next();

    // Cópia do que foi enviado, antes de a rota o mexer (muitas apagam o id ou convertem campos): é o que se compara e se regista.
    // Nos envios com ficheiros (multipart) o corpo só existe depois, por isso lê-se no fim.
    const sent = parseData(req);
    const state = { before: null, response: null, sent: Object.keys(sent).length ? JSON.parse(JSON.stringify(sent)) : null };
    // Estado anterior (só de quem tem sessão válida: pedidos sem sessão não custam uma consulta)
    try {
      const data = state.sent || {};
      const id = Number(data.id);
      if (info.table && ["update", "delete"].includes(info.verb) && Number.isInteger(id) && id > 0 && req.headers.authorization && (await tableReady())) {
        const { token_valid } = await verifyToken(req.headers.authorization);
        if (token_valid) state.before = (await query("SELECT * FROM ?? WHERE id = ?", [info.table, id]))[0] ?? null;
      }
    } catch (err) {
      console.error("[audit:before]", err.message);
    }

    // O id do registo criado vem na resposta (insertId)
    const send = res.send;
    res.send = function patchedSend(body) {
      if (!state.response) {
        try {
          state.response = typeof body === "string" ? JSON.parse(body) : body;
        } catch {
          state.response = null;
        }
      }
      return send.call(this, body);
    };

    res.on("finish", async () => {
      if (res.statusCode >= 400 || !req.user?.id) return;
      try {
        if (!(await tableReady())) return;
        const data = state.sent || parseData(req);
        const response = state.response && typeof state.response === "object" ? state.response : {};
        const recordId = data.id ?? response.insertId ?? response.id ?? null;
        const row = state.before || {};
        await query("INSERT INTO audit_log SET ?", {
          id_user: req.user.id,
          resource: info.resource.slice(0, 40),
          action: info.verb === "create" || info.verb === "update" || info.verb === "delete" ? info.verb : info.verb.slice(0, 40),
          record_id: recordId != null ? String(recordId).slice(0, 40) : null,
          label: labelOf({ ...row, ...data }) || labelOf(row),
          changes: JSON.stringify(buildChanges(info.verb, state.before, data)).slice(0, 15000),
          route: `${req.originalUrl.split("?")[0]}`.slice(0, 120),
          ip: String(req.headers["cf-connecting-ip"] || req.ip || "").slice(0, 64) || null,
        });
      } catch (err) {
        console.error("[audit]", err.message);
      }
    });
    next();
  };
}

module.exports = { auditMiddleware, tableReady };
