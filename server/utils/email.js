const nodemailer = require("nodemailer");
const Handlebars = require("handlebars");
const util = require("util");
const db = require("./database");
const { AsyncLocalStorage } = require("async_hooks");
const { logEmail } = require("./monitor");

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

module.exports = {
  register: function (data) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) return reject(error);
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = smtpFromRows(rows);
          const template = await query("SELECT * FROM email_template WHERE name_key = ?", `register_${data.id_lang}`);

          if (!template || template.length === 0) {
            throw new Error(`Template not found for register_${data.id_lang}`);
          }

          const fullContext = {
            name: data.name,
          };

          const subject = Handlebars.compile(template[0].subject)(fullContext);
          const htmlString = typeof template[0].html === 'string' ? JSON.parse(template[0].html) : template[0].html;
          const html = Handlebars.compile(htmlString)(fullContext);
          const { transporter, from } = buildTransporter(smtpSettings);

          const mailOptions = {
            from: from,
            to: data.email,
            subject: subject,
            html: html, // template HTML content
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

  change_status: function (data) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) return reject(error);
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = smtpFromRows(rows);
          const template = await query("SELECT * FROM email_template WHERE name_key = ?", `change_status_${data.id_lang}`);

          if (!template || template.length === 0) {
            throw new Error(`Template not found for change_status_${data.id_lang}`);
          }

          const fullContext = {
            name: data.name,
            status: data.status,
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

  // TODO : IMPLEMENTAR MAIS TARDE 
  // createUser: function (data) {

  // },
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
        if (!ctx.logged) await logEmail({ to: data?.email, template: name, status: "error", error: err });
        throw err;
      }
    });
}

// Para o serviço de comunicações (utils/communications.js): o mesmo transportador e contexto de registo, sem o invólucro acima
module.exports.internals = { buildTransporter, smtpFromRows, emailContext };
