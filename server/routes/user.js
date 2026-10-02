var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var fileUpload = require("express-fileupload");
const bcrypt = require("bcryptjs");
var router = express.Router();

var db = require("../utils/database");
const { requirePermission, hasPermission, denied } = require("../utils/permissions");
const { mergeName } = require("../utils/userName");
const { createToken } = require("../utils/token");
const { generatePassword } = require("../utils/email");
const email = require("../utils/email");

const saltRounds = 10;
router.use(fileUpload());

router.use((req, res, next) => {
	console.log("---------------------------");
	console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
	console.log("---------------------------");
	next();
});

router.get("/read", requirePermission("user", "read"), async (req, res) => {
	console.log("//// READ USER ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT user.*, role.name AS role_name FROM user LEFT JOIN role ON user.id_role = role.id",
		);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readById", async (req, res) => {
	console.log("//// READ USER BY ID ////");
	const query = util.promisify(db.query).bind(db);
	try {
		// Cada um lê os seus dados; ver os de outros exige permissão na secção Utilizadores
		if (Number(req.query.id) !== req.user.id && !(await hasPermission(req.user, "user", "read"))) return denied(res);
		const userRow = await query(
			"SELECT user.*, role.name AS role_name FROM user LEFT JOIN role ON user.id_role = role.id WHERE user.id = ?",
			[req.query.id],
		);
		if (userRow.length > 0) {
			const user = userRow[0];
			// For admins: use id_lang parameter if provided, otherwise use user's language
			// For students: always use user's language
			const languageId = user.id_role === 1 && req.query.id_lang 
				? parseInt(req.query.id_lang) 
				: user.id_lang;
			
			// For students, exclude draft courses; for admins, show all courses
			const draftFilter = user.id_role === 1 ? "" : "AND c.status != 'draft'";
			
			const rows = await query(
				"SELECT c.* FROM course c WHERE id_lang = ? " + draftFilter + "; " +
					"SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? " +
					"AND course.is_deleted = 0 AND course_module.is_deleted = 0;" +
					"SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
					"LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course.is_deleted = 0 " +
					"AND course_module.is_deleted = 0 AND course_topic.is_deleted = 0; " +
					"SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
					"LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course.is_deleted = 0 " +
					"AND course_module.is_deleted = 0 AND course_test.is_deleted = 0 AND (course_test.status != 'draft' OR ? = 1); " +
					"SELECT cua.* FROM course_user_activity cua LEFT JOIN course ON course.id = cua.id_course " +
					"LEFT JOIN course_module ON course_module.id = cua.id_course_module " +
					"LEFT JOIN course_topic ON course_topic.id = cua.id_course_topic " +
					"LEFT JOIN course_test ON course_test.id = cua.id_course_test " +
					"WHERE cua.id_user = ? AND course.is_deleted = 0 AND (course_module.is_deleted = 0 OR cua.id_course_module IS NULL) " +
					"AND (course_topic.is_deleted = 0 OR cua.id_course_topic IS NULL) " +
					"AND (course_test.is_deleted = 0 OR cua.id_course_test IS NULL);",
				[languageId, languageId, languageId, languageId, req.query.id_role || user.id_role, user.id],
			);

			let courses = rows[0];
			let modules = rows[1];
			let topics = rows[2];
			let tests = rows[3];
			let progress = rows[4];

			res.send({ user: userRow[0], courses, modules, topics, tests, progress });
		} else {
			res.send({ user: userRow[0] });
		}
	} catch (e) {
		throw e;
	}
});

router.get("/readByEmail", async (req, res) => {
	console.log("//// READ USER BY E-MAIL ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const rows = await query(
			// Rota pública usada para verificar e-mails nos formulários: sem password nem recover_code
			"SELECT user.id, user.name, user.email, user.status, user.id_role, user.is_deleted, role.name AS role_name FROM user LEFT JOIN role ON user.id_role = role.id WHERE email = ?",
			req.query.email,
		);
		res.send(rows);
	} catch (e) {
		console.log(e);
		res.status(500).send({ message: "Some error on server.", error: e });
	}
});

router.post("/createPassword", async (req, res, next) => {
	console.log("//// CREATE PASSWORD ////");
	try {
		let data = req.body.data;
		// A palavra-passe só se define na própria conta, nunca na de outro utilizador (nem por um admin)
		if (Number(data.id) !== req.user.id) return denied(res);
		data.password = await bcrypt.hash(data.password, saltRounds);
		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE user SET password = ?, generate_password = 0 WHERE id = ?",
			[data.password, data.id],
		);
		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/create", requirePermission("user", "create"), async (req, res, next) => {
	console.log("//// CREATE USER ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const data = req.body.data;
		// Novo utilizador: estado pendente e atividade inativa (is_deleted = 1) até ser aprovado
		data.status = "pending";
		data.is_deleted = 1;
		const token = await createToken(data);
		const insertedRow = await query("INSERT INTO user SET ?", data);
		const sendEmail = await generatePassword({ ...data, token });
		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/update", async (req, res, next) => {
	console.log("//// UPDATE USER ////");
	try {
		// Nome + Apelido do formulário → coluna name
		let data = mergeName(req.body.data);
		let whereId = Number(data.id);
		delete data.id;
		if (!whereId) return res.status(400).send({ message: "Invalid user" });

		// Editar outro utilizador exige permissão; o próprio nunca altera o seu papel, estado nem se apaga a si mesmo
		const canManage = await hasPermission(req.user, "user", "update");
		if (whereId !== req.user.id && !canManage) return denied(res);
		// Ninguém altera a palavra-passe de outro utilizador, nem um admin (segurança): só a própria conta o pode fazer
		if (whereId !== req.user.id) {
			delete data.new_password;
			delete data.confirm_new_password;
			delete data.password;
			delete data.recover_code;
			delete data.generate_password;
		}
		if (!canManage) {
			delete data.id_role;
			delete data.status;
			delete data.is_deleted;
		}

		if (data.new_password) {
			data.password = await bcrypt.hash(data.new_password, saltRounds);
			delete data.new_password;
			delete data.confirm_new_password;
		}

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		if (columns.length > 0) {
			await query("UPDATE user SET " + columns.map((c) => `${db.escapeId(c)} = ?`).join(", ") + " WHERE id = ?", [...values, whereId]);
		}
		let user = await query("SELECT * FROM user WHERE id = ?", whereId);

		let newToken = await createToken(user[0]);
		res.send({ user: user[0], token: newToken });
	} catch (err) {
		console.log(err);
		res.status(500).send({ message: "Error updating user" });
	}
});

router.post("/changeStatus", requirePermission("user", "update"), async (req, res, next) => {
	console.log("//// CHANGE USER STATUS ////");
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;

		const query = util.promisify(db.query).bind(db);
		// Atividade acompanha o estado: aprovado → ativo (is_deleted = 0); pendente/não aprovado → inativo (is_deleted = 1)
		const updatedRow = await query(
			"UPDATE user SET status = ?, is_deleted = ? WHERE id = " + whereId,
			[data.status, data.status === "approved" ? 0 : 1],
		);
		const emailResult = await email.change_status(data);
		console.log("E-mail sent: ", emailResult.messageId);
		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/delete", requirePermission("user", "delete"), async (req, res, next) => {
	console.log("//// DELETE USER ////");
	try {
		const query = util.promisify(db.query).bind(db);
		let id_user = req.body.data.id;
		const deletedRow = await query("UPDATE user SET is_deleted = 1 WHERE id = ?", [id_user]);
		res.send(deletedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
