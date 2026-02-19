var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var fs = require("fs");
var router = express.Router();
const nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");

const email = require("../utils/email");
var db = require("../utils/database");

const { uploadFile } = require("../utils/upload");

router.use(fileUpload());

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", (req, res, next) => {
  console.log("---- READ EMAIL TEMPLATE ----");

  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query("SELECT * FROM email_template");
      res.send(rows);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.get("/readById", (req, res, next) => {
  console.log("---- READ EMAIL TEMPLATE ----");

  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query("SELECT * FROM email_template WHERE id = ?", req.query.id);
      res.send(rows);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.post("/upload", async (req, res) => {
  let file = req.files.file;
  const uploadedFile = await handleUploadFile(file, req.body.data.id_event);
  res.send({ data: { url: uploadedFile } });
});

router.post("/test", (req, res, next) => {
  console.log("---- TEST E-MAIL SMTP ----");

  try {
    const smtpSettings = req.body.data;
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure, // true for port 465, false for other ports
      auth: {
        user: smtpSettings.email,
        pass: smtpSettings.password,
      },
    });

    const mailOptions = {
      from: `${smtpSettings.name} <${smtpSettings.email}>`,
      to: req.body.data.email,
      subject: "Send test e-mail",
      text: "Este e-mail foi enviado foi de teste do SMTP",
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
      res.send(info);
    });
  } catch (err) {
    throw err;
  }
});

router.post("/update", (req, res, next) => {
  console.log("---- UPDATE EMAIL TEMPLATE ----");
  db.getConnection(async (error, conn) => {
    if (error) throw error;

    try {
      let data = req.body.data;

      let whereKey = data.name_key;
      delete data.name_key;
      fs.writeFileSync(`./templates/${whereKey}.handlebars`, data.html);

      const query = util.promisify(conn.query).bind(conn);
      const updatedRow = await query("UPDATE email_template SET name = ?, design = ?, html = ?, subject = ? WHERE name_key = ?", [
        data.name,
        JSON.stringify(data.design),
        JSON.stringify(data.html),
        data.subject,
        whereKey,
      ]);

      res.send(updatedRow);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.post("/delete", (req, res, next) => {
  console.log("---- DELETE EMAIL TEMPLATE ----");
  let data = req.body.data;

  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const deletedRow = await query("DELETE FROM email_template WHERE id = " + data.id);
      res.send(deletedRow);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

module.exports = router;
