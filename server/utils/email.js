const nodemailer = require("nodemailer");
const Handlebars = require("handlebars");
const util = require("util");
const db = require("./database");
const { AsyncLocalStorage } = require("async_hooks");
const { logEmail } = require("./monitor");
const defaultTemplates = require("./defaultEmailTemplates.json");

// Cada função de envio corre dentro deste contexto (nome do modelo): o transportador regista aí o resultado do envio e, se a função
// falhar antes de chegar a enviar (modelo em falta, SMTP por configurar...), o erro também fica registado, com a razão.
const emailContext = new AsyncLocalStorage();

// Definições SMTP guardadas em `settings`: erro claro (e registado) quando ainda não foram configuradas
function smtpFromRows(rows) {
  const smtp = rows?.[0]?.meta_data ? JSON.parse(rows[0].meta_data) : null;
  if (!smtp?.host) throw new Error("SMTP settings are not configured (Settings > SMTP)");
  return smtp;
}

function trackTransporter(transporter) {
  const send = transporter.sendMail.bind(transporter);
  transporter.sendMail = (options, callback) => {
    const ctx = emailContext.getStore();
    const started = Date.now();
    const done = (error, info) => {
      if (ctx) ctx.logged = true;
      logEmail({ to: options.to, subject: options.subject, template: ctx?.name, status: error ? "error" : "sent", error, info, durationMs: Date.now() - started });
    };
    if (typeof callback === "function") {
      return send(options, (error, info) => {
        done(error, info);
        callback(error, info);
      });
    }
    return send(options).then(
      (info) => {
        done(null, info);
        return info;
      },
      (error) => {
        done(error);
        throw error;
      },
    );
  };
  return transporter;
}


function buildTransporter(smtpSettings) {
  const transporter = nodemailer.createTransport({
    host: smtpSettings.host,
    port: smtpSettings.port,
    // As definições SMTP guardam o campo como is_secure
    secure: smtpSettings.secure ?? smtpSettings.is_secure,
    auth: {
      user: smtpSettings.email,
      pass: smtpSettings.password,
    },
  });

  return {
    transporter: trackTransporter(transporter),
    from: `${smtpSettings.name} <${smtpSettings.email}>`,
  };
}

const FALLBACK_LANG = 5; // inglês

// O HTML guarda-se na BD como string JSON (ou texto simples nos modelos de origem)
const readHtml = (raw) => {
  if (typeof raw !== "string") return raw || "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
};

// 1) o template da BD no idioma da pessoa (se estiver desativado: não se envia); 2) o modelo de origem nesse idioma; 3) o inglês
async function findTemplate(query, type, idLang) {
  for (const lang of [Number(idLang) || FALLBACK_LANG, FALLBACK_LANG]) {
    const key = `${type}_${lang}`;
    const [row] = await query("SELECT subject, html, is_active FROM email_template WHERE name_key = ?", [key]);
    if (row) return row.is_active ? { subject: row.subject, html: readHtml(row.html) } : null;
    if (defaultTemplates[key]) return { subject: defaultTemplates[key].subject, html: defaultTemplates[key].html };
  }
  return null;
}

module.exports = {
  // Recuperação de password (código por e-mail). Os restantes e-mails automáticos usam notify (abaixo)
  recover: function (data) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) return reject(error);
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = smtpFromRows(rows);
          const template = await query("SELECT * FROM email_template WHERE name_key = ?", `recover_${data.id_lang}`);

          if (!template || template.length === 0) {
            throw new Error(`Template not found for recover_${data.id_lang}`);
          }

          const fullContext = {
            name: data.name,
            code: data.code,
          };

          const subject = Handlebars.compile(template[0].subject)(fullContext);
          const htmlString = typeof template[0].html === 'string' ? JSON.parse(template[0].html) : template[0].html;
          const html = Handlebars.compile(htmlString)(fullContext);
          const { transporter, from } = buildTransporter(smtpSettings);

          const mailOptions = {
            from: from,
            to: data.email,
            subject: subject,
            html: html,
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) reject(err);
            resolve(info);
            conn.release();
          });
        } catch (err) {
          reject(err);
          conn.release();
        }
      });
    });
  },

  // E-mail automático da plataforma por tipo (registration_received, account_approved...): procura o template na BD (`<tipo>_<id do idioma>`)
  // e, se a BD ainda não o tiver, usa o modelo de origem (defaultEmailTemplates.json), por isso estes e-mails nunca deixam de sair.
  // Um template desativado na BD não envia nada. `vars` são as variáveis do template ({{name}}, {{url}}...).
  notify: function ({ type, to, id_lang, vars = {} }) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) return reject(error);
        try {
          // O nome do tipo é o que fica no registo de e-mails (em vez do nome desta função)
          const ctx = emailContext.getStore();
          if (ctx) ctx.name = type;
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = smtpFromRows(rows);
          const template = await findTemplate(query, type, id_lang);
          if (!template) {
            conn.release();
            return resolve(null); // desativado no backoffice
          }
          const context = { platform: "Bial Regional Academy", ...vars };
          const subject = Handlebars.compile(template.subject || "")(context);
          const html = Handlebars.compile(template.html)(context);
          const { transporter, from } = buildTransporter(smtpSettings);
          transporter.sendMail({ from, to, subject, html }, (err, info) => {
            conn.release();
            if (err) reject(err);
            else resolve(info);
          });
        } catch (err) {
          conn.release();
          reject(err);
        }
      });
    });
  },

  // Envio de teste do editor de templates: usa o HTML/assunto que está no editor (mesmo por guardar) com dados de exemplo
  sendTest: function (data) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) return reject(error);
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = smtpFromRows(rows);
          const sample = { name: "Maria Silva", status: "Active", code: "123456", ...data.sample };
          const subject = Handlebars.compile(data.subject || "")(sample);
          const html = Handlebars.compile(data.html || "")(sample);
          const { transporter, from } = buildTransporter(smtpSettings);
          transporter.sendMail({ from, to: data.email, subject: `[TEST] ${subject}`, html }, (err, info) => {
            conn.release();
            if (err) reject(err);
            else resolve(info);
          });
        } catch (err) {
          conn.release();
          reject(err);
        }
      });
    });
  },

};

// Envolve todas as funções de envio: contexto para o registo e registo das falhas anteriores ao envio
for (const [name, fn] of Object.entries(module.exports)) {
  if (typeof fn !== "function") continue;
  module.exports[name] = (data) =>
    emailContext.run({ name, logged: false }, async () => {
      try {
        return await fn(data);
      } catch (err) {
        const ctx = emailContext.getStore();
        if (!ctx.logged) await logEmail({ to: data?.email || data?.to, template: ctx.name || name, status: "error", error: err });
        throw err;
      }
    });
}

// Para o serviço de comunicações (utils/communications.js): o mesmo transportador e contexto de registo, sem o invólucro acima
module.exports.internals = { buildTransporter, smtpFromRows, emailContext };
