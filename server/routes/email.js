var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
const nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");

const email = require("../utils/email");
var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");

const { uploadFile } = require("../utils/upload");

router.use(fileUpload());

router.use((req, res, next) => {
	console.log("---------------------------");
	console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
	console.log("---------------------------");
	next();
});

router.get("/read", requirePermission("email_template", "read"), (req, res, next) => {
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

router.get("/readByLang", requirePermission("email_template", "read"), (req, res, next) => {
	console.log("---- READ EMAIL TEMPLATE ----");

	db.getConnection(async (error, conn) => {
		if (error) throw error;
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
	console.log("---- READ EMAIL TEMPLATE ----");

	db.getConnection(async (error, conn) => {
		if (error) throw error;
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

router.post("/upload", requirePermission("email_template", "update"), async (req, res) => {
	let file = req.files.file;
	const uploadedFile = await handleUploadFile(file, req.body.data.id_event);
	res.send({ data: { url: uploadedFile } });
});

router.post("/test", requirePermission("settings", "update"), (req, res, next) => {
	console.log("---- TEST E-MAIL SMTP ----");

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
			if (err) res.send({ sent: false, message: err.message });
			else res.send({ sent: true, messageId: info.messageId });
		});
	} catch (err) {
		throw err;
	}
});

router.post("/create", requirePermission("email_template", "create"), (req, res, next) => {
	console.log("---- CREATE EMAIL TEMPLATE ----");
	db.getConnection(async (error, conn) => {
		if (error) throw error;

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
	console.log("---- UPDATE EMAIL TEMPLATE ----");
	db.getConnection(async (error, conn) => {
		if (error) throw error;

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
	console.log("---- DELETE EMAIL TEMPLATE ----");
	let data = req.body.data;

	db.getConnection(async (error, conn) => {
		if (error) throw error;
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
