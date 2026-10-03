var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
const nodemailer = require("nodemailer");
const { logEmail } = require("../utils/monitor");
const fileUpload = require("express-fileupload");

const email = require("../utils/email");
var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");

const { uploadFile } = require("../utils/upload");

router.use(fileUpload());

router.get("/read", requirePermission("email_template", "read"), (req, res, next) => {

	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Some error on server.", error });
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

router.get("/readByLang", requirePermission("email_template", "read"), (req, res, next) => {

	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Some error on server.", error });
		try {
			const query = util.promisify(conn.query).bind(conn);
			const rows = await query(
				"SELECT * FROM email_template WHERE id_lang = ?",
				req.query.id_lang,
			);
			res.send(rows);
			conn.release();
		} catch (err) {
			throw err;
		}
	});
});

router.get("/readById", requirePermission("email_template", "read"), (req, res, next) => {

	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Some error on server.", error });
		try {
			const query = util.promisify(conn.query).bind(conn);
			const rows = await query(
				"SELECT * FROM email_template WHERE id = ?",
				req.query.id,
			);
			res.send(rows);
			conn.release();
		} catch (err) {
			throw err;
		}
	});
});

// Imagens do editor de templates: ficam na pasta media com o tipo "email" (não aparecem na Multimédia)
router.post("/upload", requirePermission("email_template", "update"), async (req, res) => {
	if (!req.files?.file) return res.status(400).send({ message: "No file received" });
	const uploadedFile = await uploadFile(req.files.file, "email");
	res.send({ data: { url: uploadedFile } });
});

// Envia o template (como está no editor) para um endereço, com dados de exemplo. O resultado fica no registo de e-mails.
router.post("/sendTest", requirePermission("email_template", "update"), async (req, res) => {
	const { email: to, subject, html, sample } = req.body.data || {};
	if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).send({ sent: false, message: "Invalid e-mail address" });
	if (!html) return res.status(400).send({ sent: false, message: "The template has no content" });
	try {
		const info = await email.sendTest({ email: to, subject, html, sample });
		res.send({ sent: true, messageId: info.messageId });
	} catch (err) {
		// A razão da falha fica também em Monitorização > E-mails
		res.send({ sent: false, message: err.message });
	}
});

router.post("/test", requirePermission("settings", "update"), (req, res, next) => {

	try {
		const smtpSettings = req.body.data;
		const transporter = nodemailer.createTransport({
			host: smtpSettings.host,
			port: smtpSettings.port,
			// O formulário SMTP guarda o campo como is_secure (true para a porta 465)
			secure: smtpSettings.secure ?? smtpSettings.is_secure,
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

		// Um throw dentro do callback não chegava ao cliente (pedido ficava pendurado): devolve o resultado do envio
		transporter.sendMail(mailOptions, (err, info) => {
			logEmail({ to: mailOptions.to, subject: mailOptions.subject, template: "smtp_test", status: err ? "error" : "sent", error: err, info });
			if (err) res.send({ sent: false, message: err.message });
			else res.send({ sent: true, messageId: info.messageId });
		});
	} catch (err) {
		throw err;
	}
});

router.post("/create", requirePermission("email_template", "create"), (req, res, next) => {
	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Some error on server.", error });

		try {
			let data = req.body.data;
			const query = util.promisify(conn.query).bind(conn);
			const templateDefault = await query(
				"SELECT * FROM settings WHERE name_key = 'email_template_default_design'",
			);

			const insertRow = await query(
				"INSERT INTO email_template SET name = ?, id_lang = ?, name_key = ?, design = ?",
				[data.name, data.id_lang, data.name_key, templateDefault[0].meta_data],
			);

			res.send(insertRow);
			conn.release();
		} catch (err) {
			throw err;
		}
	});
});

router.post("/update", requirePermission("email_template", "update"), (req, res, next) => {
	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Some error on server.", error });

		try {
			let data = req.body.data;

			let whereKey = data.name_key;
			delete data.name_key;
			
			const query = util.promisify(conn.query).bind(conn);
			const updatedRow = await query(
				"UPDATE email_template SET name = ?, design = ?, html = ?, subject = ?, id_lang = ? WHERE name_key = ?",
				[
					data.name,
					JSON.stringify(data.design),
					JSON.stringify(data.html),
					data.subject,
					data.id_lang,
					whereKey,
				],
			);

			res.send(updatedRow);
			conn.release();
		} catch (err) {
			throw err;
		}
	});
});

router.post("/delete", requirePermission("email_template", "delete"), (req, res, next) => {
	let data = req.body.data;

	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Some error on server.", error });
		try {
			const query = util.promisify(conn.query).bind(conn);
			const deletedRow = await query(
				"DELETE FROM email_template WHERE id = " + data.id,
			);
			res.send(deletedRow);
			conn.release();
		} catch (err) {
			throw err;
		}
	});
});

module.exports = router;
