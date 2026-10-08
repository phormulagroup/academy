var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var fileUpload = require("express-fileupload");
const bcrypt = require("bcryptjs");
var router = express.Router();

var db = require("../utils/database");
const { toId, setClause, columnList, multi } = require("../utils/sql");
const { requirePermission, hasPermission, denied } = require("../utils/permissions");
const { mergeName } = require("../utils/userName");
const { createToken } = require("../utils/token");
const crypto = require("crypto");
const { notifyUser } = require("../utils/notify");

const saltRounds = 10;
router.use(fileUpload());

router.get("/read", requirePermission("user", "read"), async (req, res) => {
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

// Lista paginada para o backoffice: pesquisa, filtros e ordenação na base de dados (a página pede só as linhas que mostra)
// ?id_lang=&page=1&limit=15&search=&role=<id>&status=&activity=0|1&country=&sort=name|email|role_name|country|status|is_deleted|created_at&order=asc|desc
const USER_SORTS = { name: "user.name", email: "user.email", role_name: "role.name", country: "user.country", status: "user.status", is_deleted: "user.is_deleted", created_at: "user.created_at" };
router.get("/list", requirePermission("user", "read"), async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 15));
		const where = ["user.id_lang = ?"];
		const params = [toId(req.query.id_lang)];
		const search = String(req.query.search || "").trim();
		if (search) {
			where.push("(user.name LIKE ? OR user.email LIKE ?)");
			params.push(`%${search}%`, `%${search}%`);
		}
		if (req.query.role) {
			where.push("user.id_role = ?");
			params.push(toId(req.query.role));
		}
		if (["approved", "pending", "not_approved"].includes(req.query.status)) {
			where.push("user.status = ?");
			params.push(req.query.status);
		}
		if (req.query.activity === "0" || req.query.activity === "1") {
			where.push("user.is_deleted = ?");
			params.push(Number(req.query.activity));
		}
		if (req.query.country) {
			where.push("user.country = ?");
			params.push(String(req.query.country));
		}
		const sort = USER_SORTS[req.query.sort] || USER_SORTS.name;
		const order = req.query.order === "desc" ? "DESC" : "ASC";
		const clause = where.join(" AND ");
		const [{ total }] = await query(`SELECT COUNT(*) AS total FROM user WHERE ${clause}`, params);
		const rows = await query(
			`SELECT user.id, user.name, user.email, user.img, user.country, user.gender, user.birth_date, user.bial_starting_date, user.academic_background, user.status, user.id_role, user.id_lang, user.is_deleted, user.created_at, role.name AS role_name
			 FROM user LEFT JOIN role ON user.id_role = role.id WHERE ${clause} ORDER BY ${sort} ${order}, user.id DESC LIMIT ? OFFSET ?`,
			[...params, limit, (page - 1) * limit],
		);
		res.send({ rows, total, page, limit });
	} catch (e) {
		if (e.status) return res.status(e.status).send({ message: e.message });
		throw e;
	}
});

// Pesquisa leve para seletores de pessoas (acesso a cursos, grupos): até 30 resultados por nome ou e-mail, ou os ids pedidos (para mostrar
// quem já está escolhido). Só contas ativas que não são Admin.
router.get("/search", requirePermission("user", "read"), async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	const ids = String(req.query.ids || "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
	if (ids.length) return res.send(await query("SELECT id, name, email FROM user WHERE id IN (?)", [ids]));
	const q = String(req.query.q || "").trim();
	const where = ["is_deleted = 0", "id_role != 1"];
	const params = [];
	if (req.query.id_lang) {
		where.push("id_lang = ?");
		params.push(toId(req.query.id_lang));
	}
	if (q) {
		where.push("(name LIKE ? OR email LIKE ?)");
		params.push(`%${q}%`, `%${q}%`);
	}
	res.send(await query(`SELECT id, name, email FROM user WHERE ${where.join(" AND ")} ORDER BY name LIMIT 30`, params));
});

// Nº de utilizadores ativos por função (página das funções), sem trazer a lista de utilizadores
router.get("/counts", requirePermission("user", "read"), async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	const rows = await query("SELECT id_role, COUNT(*) AS total FROM user WHERE is_deleted = 0 GROUP BY id_role");
	res.send(Object.fromEntries(rows.map((r) => [r.id_role, r.total])));
});

router.get("/readById", async (req, res) => {
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
			
			const rows = await multi(query, 
				"SELECT c.id, c.name, c.internal_name, c.img, c.thumbnail, c.id_lang, c.status, c.date_start, c.date_end, c.slug, c.enrollment, c.id_course_certificate, c.settings, c.id_product, c.is_deleted, c.created_at, c.modified_at FROM course c WHERE id_lang = ? AND c.is_deleted = 0 " + draftFilter + "; " +
					"SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? " +
					"AND course.is_deleted = 0 AND course_module.is_deleted = 0;" +
					"SELECT course_topic.id, course_topic.id_course_module, course_topic.title, course_topic.slug, course_topic.is_deleted FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
					"LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course.is_deleted = 0 " +
					"AND course_module.is_deleted = 0 AND course_topic.is_deleted = 0; " +
					"SELECT course_test.id, course_test.id_course_module, course_test.title, course_test.settings, course_test.status, course_test.is_deleted, IF(JSON_VALID(course_test.question), JSON_LENGTH(course_test.question), 0) AS question_count FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
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
	try {
		const query = util.promisify(db.query).bind(db);
		const rows = await query(
			// Rota pública usada para verificar e-mails nos formulários: sem password nem recover_code
			"SELECT user.id, user.name, user.email, user.status, user.id_role, user.is_deleted, role.name AS role_name FROM user LEFT JOIN role ON user.id_role = role.id WHERE email = ?",
			req.query.email,
		);
		res.send(rows);
	} catch (e) {
		console.error(e);
		res.status(500).send({ message: "Some error on server.", error: e });
	}
});

router.post("/createPassword", async (req, res, next) => {
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
	try {
		const query = util.promisify(db.query).bind(db);
		const data = req.body.data;
		// Novo utilizador: estado pendente e atividade inativa (is_deleted = 1) até ser aprovado
		data.status = "pending";
		data.is_deleted = 1;
		const insertedRow = await query("INSERT INTO user SET ?", data);
		// O e-mail de acesso (com o código para definir a password) sai quando a conta for aprovada (changeStatus)
		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/update", async (req, res, next) => {
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
			delete data.current_password;
		}
		// A password só muda por new_password (com a atual verificada); o hash e o código de recuperação nunca se gravam pelo cliente
		delete data.password;
		delete data.recover_code;
		delete data.recover_code_expires;
		delete data.generate_password;
		if (!canManage) {
			delete data.id_role;
			delete data.status;
			delete data.is_deleted;
		}

		if (data.new_password && (typeof data.new_password !== "string" || data.new_password.length < 8)) return res.status(400).send({ message: "The password must have at least 8 characters" });
		const passwordChanged = !!data.new_password;
		const currentPassword = data.current_password;
		delete data.current_password;
		if (data.new_password) {
			// Para ter a certeza de que é a própria pessoa a mudar a password, exige-se a atual (contas sem password definida ficam isentas)
			const [account] = await util.promisify(db.query).bind(db)("SELECT password FROM user WHERE id = ?", [whereId]);
			if (account?.password) {
				const valid = typeof currentPassword === "string" && currentPassword !== "" && (await bcrypt.compare(currentPassword, account.password));
				if (!valid) return res.status(400).send({ message: "The current password is incorrect", code: "invalid_current_password" });
			}
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
		// A própria pessoa mudou a sua password: aviso de segurança (se não foi ela, pode recuperar a conta logo)
		if (passwordChanged && whereId === req.user.id) notifyUser("password_changed", user[0]);

		let newToken = await createToken(user[0]);
		res.send({ user: user[0], token: newToken });
	} catch (err) {
		console.error(err);
		res.status(500).send({ message: "Error updating user" });
	}
});

router.post("/changeStatus", requirePermission("user", "update"), async (req, res, next) => {
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;

		const query = util.promisify(db.query).bind(db);
		// Atividade acompanha o estado: aprovado → ativo (is_deleted = 0); pendente/não aprovado → inativo (is_deleted = 1)
		const updatedRow = await query(
			"UPDATE user SET status = ?, is_deleted = ? WHERE id = ?",
			[data.status, data.status === "approved" ? 0 : 1, toId(whereId)],
		);
		res.send(updatedRow);

		// E-mail à pessoa conforme o novo estado: aprovada (ou, se a conta foi criada por um admin e ainda não tem password, o acesso com o
		// código para a definir) ou não aprovada. Voltar a pendente não envia nada. Nunca atrasa nem parte a resposta.
		const [person] = await query("SELECT id, name, email, id_lang, password FROM user WHERE id = ?", [whereId]);
		if (person) {
			if (data.status === "approved" && !person.password) {
				const code = crypto.randomBytes(4).toString("hex").slice(0, 6);
				await query("UPDATE user SET recover_code = ?, recover_code_expires = NULL WHERE id = ?", [await bcrypt.hash(code, saltRounds), person.id]);
				notifyUser("account_access", person, { code });
			} else if (data.status === "approved") {
				notifyUser("account_approved", person);
			} else if (data.status === "not_approved") {
				notifyUser("account_rejected", person);
			}
		}
	} catch (err) {
		throw err;
	}
});

router.post("/delete", requirePermission("user", "delete"), async (req, res, next) => {
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
