const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const util = require("util");
const db = require("./database");

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

          const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            auth: {
              user: smtpSettings.email,
              pass: smtpSettings.password,
            },
          });

          const hbsOptions = {
            viewEngine: {
              defaultLayout: false,
            },
            viewPath: "./templates",
          };

          transporter.use("compile", hbs(hbsOptions));

          const mailOptions = {
            from: `${smtpSettings.name} <${smtpSettings.email}>`,
            to: data.email,
            subject: template[0].subject,
            template: `register_${data.id_lang}`,
            context: {
              name: data.name,
            },
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

          const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            auth: {
              user: smtpSettings.email,
              pass: smtpSettings.password,
            },
          });

          const hbsOptions = {
            viewEngine: {
              defaultLayout: false,
            },
            viewPath: "./templates",
          };

          transporter.use("compile", hbs(hbsOptions));

          const mailOptions = {
            from: `${smtpSettings.name} <${smtpSettings.email}>`,
            to: data.email,
            subject: template[0].subject,
            template: `change_status_${data.id_lang}`,
            context: {
              name: data.name,
              status: data.status,
            },
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
};
