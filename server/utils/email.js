const fetch = require("node-fetch").default;

module.exports = {
  enrollment: function (user, payment, event) {
    return new Promise((resolve, reject) => {
      db.getConnection(async (error, conn) => {
        if (error) throw error;
        try {
          const query = util.promisify(conn.query).bind(conn);
          const rows = await query("SELECT * FROM settings WHERE name = 'smtp'");
          const smtpSettings = rows[0].meta_data ? JSON.parse(rows[0].meta_data) : null;
          const template = await query("SELECT * FROM email_template WHERE name_key = ?", `register_${id_lang}`);

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
            to: user.email,
            subject: template[0].subject,
            template: `register_${id_lang}`,
            context: {
              name: user.name,
            },
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) resolve(err);
            resolve(info);
            conn.release();
          });
        } catch (err) {
          resolve(err);
          conn.release();
        }
      });
    });
  },

  generatePassword: function (data) {
    return new Promise(async (resolve, reject) => {
      const url = "https://api.brevo.com/v3/smtp/email";
      const options = {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },

        body: JSON.stringify({
          subject: "Phormula Share | Bem-vindo!",
          sender: { name: "Phormula Group", email: "secretariado@phormulagroup.com" },
          to: [{ email: data.email, name: data.name }],
          templateId: 2174,
          params: {
            name: data.name,
            email: data.email,
            generatePasswordUrl: `https://share.phormuladev.com/gerar-password?t=${data.token}`,
          },
        }),
      };

      fetch(url, options)
        .then((res) => res.json())
        .then((json) => resolve(json))
        .catch((err) => reject({ error: err }));
    });
  },
};
