const nodemailer = require("nodemailer");
const Handlebars = require("handlebars");
const util = require("util");
const db = require("./database");


function buildTransporter(smtpSettings) {
  const transporter = nodemailer.createTransport({
    host: smtpSettings.host,
    port: smtpSettings.port,
    secure: smtpSettings.secure,
    auth: {
      user: smtpSettings.email,
      pass: smtpSettings.password,
    },
  });

  return {
    transporter,
    from: `${smtpSettings.name} <${smtpSettings.email}>`,
  };
}

module.exports = {
  register: function (data) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) throw error;
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = rows[0].meta_data ? JSON.parse(rows[0].meta_data) : null;
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
        if (error) throw error;
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = rows[0].meta_data ? JSON.parse(rows[0].meta_data) : null;
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
        if (error) throw error;
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name_key = 'smtp'");
          const smtpSettings = rows[0].meta_data ? JSON.parse(rows[0].meta_data) : null;
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

  // TODO : IMPLEMENTAR MAIS TARDE 
  // createUser: function (data) {

  // },
};