var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");
const { read } = require("fs");

// Remove símbolos de marca (®, ™, ©) e "|" antes do slugify, que os converteria em "r", "tm", "c" e "or"
const courseSlug = (name) => slugify(name.replace(/[®™©|]/g, ""), { lower: true, strict: true });

router.use((req, res, next) => {
	console.log("---------------------------");
	console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
	console.log("---------------------------");
	next();
});


// ---- Acesso restrito a utilizadores e grupos (course.settings.restrict_to_users) ----
// A verificação é feita aqui, no servidor: o que o utilizador não pode ver nem chega ao browser. Os administradores
// vêem sempre tudo. As tabelas vêm da migração 2026-10-02-course-access.sql; se ainda não existirem, os cursos
// restritos ficam escondidos (falha fechada) e os outros funcionam como sempre.
function isRestrictedCourse(course) {
	let settings = course.settings;
	if (typeof settings === "string") {
		try {
			settings = settings ? JSON.parse(settings) : null;
		} catch {
			settings = null;
		}
	}
	return !!settings?.restrict_to_users;
}

// Cursos restritos a que o utilizador tem acesso: diretamente (course_user_access) ou por um grupo a que pertence
async function accessibleCourseIds(query, userId) {
	if (!userId) return new Set();
	try {
		const rows = await query(
			"SELECT id_course FROM course_user_access WHERE id_user = ? " +
				"UNION SELECT cg.id_course FROM course_group cg " +
				"INNER JOIN user_group ug ON ug.id = cg.id_group AND ug.is_deleted = 0 " +
				"INNER JOIN user_group_member ugm ON ugm.id_group = cg.id_group WHERE ugm.id_user = ?",
			[userId, userId],
		);
		return new Set(rows.map((r) => r.id_course));
	} catch (err) {
		if (err.code !== "ER_NO_SUCH_TABLE") console.log(err);
		return new Set();
	}
}

// O papel vem da base de dados (id_user do pedido), não do que o cliente diz ser
async function isAdminUser(query, userId) {
	if (!userId) return false;
	const rows = await query("SELECT id_role FROM user WHERE id = ? AND is_deleted = 0", [userId]);
	return rows[0]?.id_role === 1;
}

// Cursos que o utilizador pode ver (todos para administradores; os restritos só se tiver acesso)
async function visibleCourses(query, courses, userId) {
	if (!courses.some(isRestrictedCourse)) return courses;
	if (await isAdminUser(query, userId)) return courses;
	const allowed = await accessibleCourseIds(query, userId);
	return courses.filter((c) => !isRestrictedCourse(c) || allowed.has(c.id));
}

router.get("/read", async (req, res) => {
	console.log("//// READ COURSE ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT * FROM course; " +
				"SELECT course_module. * FROM course_module WHERE is_deleted = 0; " +
				"SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
				"WHERE course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
				"SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
				"WHERE course_test.is_deleted = 0 AND course_module.is_deleted = 0; " +
				"SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
				"WHERE course_user_activity.id_user = ?; SELECT * FROM product",
			[req.query.id_user],
		);

		res.send({
			courses: rows[0],
			modules: rows[1],
			topics: rows[2],
			tests: rows[3],
			progress: rows[4],
			products: rows[5],
		});
	} catch (e) {
		throw e;
	}
});

router.get("/readProgress", async (req, res) => {
	console.log("//// READ PROGRESS BY USER ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
				"WHERE course_user_activity.id_user = ? AND course.id_lang = ?; ",
			[req.query.id_user, req.query.id_lang],
		);

		let courses = rows[0];
		let modules = rows[1];
		let topics = rows[2];
		let tests = rows[3];
		let progress = rows[4];

		res.send({ courses, modules, topics, tests, progress });
	} catch (e) {
		throw e;
	}
});

router.get("/readByLang", async (req, res) => {
	console.log("//// READ COURSE BY LANG ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT * FROM course WHERE id_lang = ? AND is_deleted = 0; " +
				"SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE id_lang = ? AND course_module.is_deleted = 0; " +
				"SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
				"LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
				"SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
				"LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_test.is_deleted = 0 AND course_module.is_deleted = 0; " +
				"SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
				"WHERE course_user_activity.id_user = ? AND course.id_lang = ?; SELECT * FROM product ",
			[
				req.query.id_lang,
				req.query.id_lang,
				req.query.id_lang,
				req.query.id_lang,
				req.query.id_user,
				req.query.id_lang,
			],
		);

		// Cursos restritos a utilizadores/grupos: só os que o utilizador pode ver (e o que lhes pertence)
		const courses = await visibleCourses(query, rows[0], req.query.id_user);
		if (courses.length !== rows[0].length) {
			const courseIds = new Set(courses.map((c) => c.id));
			const moduleIds = new Set(rows[1].filter((m) => courseIds.has(m.id_course)).map((m) => m.id));
			rows[1] = rows[1].filter((m) => moduleIds.has(m.id));
			rows[2] = rows[2].filter((tp) => moduleIds.has(tp.id_course_module));
			rows[3] = rows[3].filter((ts) => moduleIds.has(ts.id_course_module));
			rows[4] = rows[4].filter((p) => courseIds.has(p.id_course));
		}

		res.send({
			courses,
			modules: rows[1],
			topics: rows[2],
			tests: rows[3],
			progress: rows[4],
			products: rows[5],
		});
	} catch (e) {
		throw e;
	}
});

router.get("/readById", async (req, res) => {
	console.log("//// READ COURSE BY ID ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT * FROM course WHERE id = ?; SELECT course_module.* FROM course_module WHERE id_course = ? AND is_deleted = 0; " +
				"SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id WHERE course_module.id_course = ? " +
				"AND course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
				"SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id WHERE course_module.id_course = ? " +
				"AND course_test.is_deleted = 0 AND course_module.is_deleted = 0; ",
			[req.query.id, req.query.id, req.query.id, req.query.id],
		);
		res.send({
			course: rows[0],
			modules: rows[1],
			topics: rows[2],
			tests: rows[3],
		});
	} catch (e) {
		throw e;
	}
});

router.get("/readBySlug", async (req, res) => {
	console.log("//// READ COURSE BY SLUG ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const isAdmin = parseInt(req.query.id_role) === 1;

		// O mesmo slug pode existir em vários idiomas: todas as queries filtram por slug + id_lang
		const courseFilter = "course.slug = ? AND course.id_lang = ? AND course.is_deleted = 0";

		let testQuery = "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
			`LEFT JOIN course ON course.id = course_module.id_course WHERE ${courseFilter} AND course_test.is_deleted = 0 AND course_module.is_deleted = 0`;

		if (!isAdmin) {
			testQuery += " AND course_test.status != 'draft'";
		}

		const rows = await query(
			`SELECT * FROM course WHERE ${courseFilter}; SELECT course_module.* FROM course_module ` +
				`LEFT JOIN course ON course.id = course_module.id_course WHERE ${courseFilter} AND course_module.is_deleted = 0; ` +
				"SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
				`LEFT JOIN course ON course.id = course_module.id_course WHERE ${courseFilter} AND course_topic.is_deleted = 0 AND course_module.is_deleted = 0; ` +
				testQuery + "; " +
				"SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
				`WHERE course_user_activity.id_user = ? AND ${courseFilter}`,
			[
				req.query.slug,
				req.query.id_lang,
				req.query.slug,
				req.query.id_lang,
				req.query.slug,
				req.query.id_lang,
				req.query.slug,
				req.query.id_lang,
				req.query.id_user,
				req.query.slug,
				req.query.id_lang,
			],
		);
		// Curso restrito a que o utilizador não tem acesso: responde como se não existisse
		const courses = await visibleCourses(query, rows[0], req.query.id_user);
		if (courses.length === 0 && rows[0].length > 0) {
			return res.send({ course: [], modules: [], topics: [], tests: [], progress: [] });
		}

		res.send({
			course: rows[0],
			modules: rows[1],
			topics: rows[2],
			tests: rows[3],
			progress: rows[4],
		});
	} catch (e) {
		throw e;
	}
});

router.get("/readByTopicId", async (req, res) => {
	console.log("//// READ COURSE BY TOPIC ID ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT course_topic.*, course.name as `course_name`, course_module.title as `course_module_title` FROM course_topic " +
				"LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
				"LEFT JOIN course ON course.id = course_module.id_course WHERE course_topic.id = ?; ",
			[req.query.id],
		);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readByTestId", async (req, res) => {
	console.log("//// READ COURSE BY TEST ID ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT course_test.*, course.name as `course_name`, course_module.title as `course_module_title` FROM course_test " +
				"LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
				"LEFT JOIN course ON course.id = course_module.id_course WHERE course_test.id = ?",
			[req.query.idTest],
		);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/report", requirePermission("report", "read"), async (req, res) => {
	console.log("/// REPORTS COURSE ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const idLang = req.query.id_lang;
		const hasLanguageFilter = !!idLang;

		// SQL template builder - WHERE clause dinâmico baseado na presença de idLang
		const buildSqlQueries = (filter) =>
			`SELECT * FROM user WHERE ${filter ? "id_lang = ? AND" : ""} is_deleted = 0; ` +
			`SELECT * FROM course WHERE ${filter ? "id_lang = ? AND" : ""} is_deleted = 0; ` +
			`SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE ${filter ? "course.id_lang = ? AND" : ""} course.is_deleted = 0 AND course_module.is_deleted = 0; ` +
			`SELECT course_topic.*, course_module.id_course FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id ` +
			`LEFT JOIN course ON course.id = course_module.id_course WHERE ${filter ? "course.id_lang = ? AND" : ""} course_module.is_deleted = 0 AND course_topic.is_deleted = 0 AND course.is_deleted = 0; ` +
			`SELECT course_test.*, course_module.id_course FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id ` +
			`LEFT JOIN course ON course.id = course_module.id_course WHERE ${filter ? "course.id_lang = ? AND" : ""} course_module.is_deleted = 0 AND course_test.is_deleted = 0 AND course.is_deleted = 0; ` +
			`SELECT cua.*, course_test.title as \`test_title\`, user.name as \`user_name\` FROM course_user_activity cua LEFT JOIN course ON course.id = cua.id_course ` +
			`LEFT JOIN course_module ON cua.id_course_module = course_module.id LEFT JOIN course_topic ON cua.id_course_topic = course_topic.id ` +
			`LEFT JOIN course_test ON cua.id_course_test = course_test.id LEFT JOIN user ON user.id = cua.id_user ` +
			`WHERE ${filter ? "course.id_lang = ? AND" : ""} course.is_deleted = 0 AND (course_module.is_deleted = 0 OR cua.id_course_module IS NULL) ` +
			`AND (course_topic.is_deleted = 0 OR cua.id_course_topic IS NULL) ` +
			`AND (course_test.is_deleted = 0 OR cua.id_course_test IS NULL) ` +
			`ORDER BY cua.created_at DESC; `;

		// Build params array: repetir idLang para cada query que precisa do filtro
		const buildParams = (filter) => filter ? [idLang, idLang, idLang, idLang, idLang, idLang, idLang] : [];

		// Fetch FILTERED data (apenas para a linguagem selecionada, se houver filtro)
		const filteredRows = await query(buildSqlQueries(hasLanguageFilter), buildParams(hasLanguageFilter));

		// Fetch GLOBAL data (sempre sem filtro - todas as linguagens)
		const globalRows = await query(buildSqlQueries(false), []);

		const parseRows = (rows) => ({
			users: rows[0],
			courses: rows[1],
			modules: rows[2],
			topics: rows[3],
			tests: rows[4],
			activity: rows[5]
		});

		const filteredData = parseRows(filteredRows);
		const globalData = parseRows(globalRows);

		// Devolve os dados filtrados e globais em um único objeto
		res.send({
			filtered: filteredData,
			global: globalData
		});
	} catch (err) {
		throw err;
	}
});

// Utilizadores e grupos com acesso a um curso restrito (definições do curso → Acesso)
router.get("/accessUsers", requirePermission("course", "update"), async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		res.send(
			await query(
				"SELECT user.id, user.name, user.email FROM course_user_access " +
					"INNER JOIN user ON user.id = course_user_access.id_user " +
					"WHERE course_user_access.id_course = ? AND user.is_deleted = 0",
				[req.query.id_course],
			),
		);
	} catch (err) {
		console.log(err);
		res.status(500).send({ message: "Error" });
	}
});

router.get("/accessGroups", requirePermission("course", "update"), async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		res.send(
			await query(
				"SELECT user_group.id, user_group.name FROM course_group " +
					"INNER JOIN user_group ON user_group.id = course_group.id_group " +
					"WHERE course_group.id_course = ? AND user_group.is_deleted = 0",
				[req.query.id_course],
			),
		);
	} catch (err) {
		console.log(err);
		res.status(500).send({ message: "Error" });
	}
});

// Substitui por completo a lista (utilizadores ou grupos) de um curso pela lista enviada
function replaceAccessList(table, column, idsKey) {
	return (req, res) => {
		db.getConnection(async (error, conn) => {
			if (error) return res.status(500).send({ message: "Error" });
			const q = util.promisify(conn.query).bind(conn);
			try {
				await util.promisify(conn.beginTransaction).bind(conn)();
				const { id_course } = req.body.data || {};
				const ids = req.body.data?.[idsKey] || [];
				await q(`DELETE FROM ${table} WHERE id_course = ?`, [id_course]);
				if (ids.length > 0) await q(`INSERT INTO ${table} (id_course, ${column}) VALUES ?`, [ids.map((id) => [id_course, id])]);
				await util.promisify(conn.commit).bind(conn)();
				conn.release();
				res.send({ id_course, [idsKey]: ids });
			} catch (err) {
				console.log(err);
				await util.promisify(conn.rollback).bind(conn)();
				conn.release();
				res.status(500).send({ message: "Error" });
			}
		});
	};
}
router.post("/setAccessUsers", requirePermission("course", "update"), replaceAccessList("course_user_access", "id_user", "id_users"));
router.post("/setAccessGroups", requirePermission("course", "update"), replaceAccessList("course_group", "id_group", "id_groups"));

router.post("/create", requirePermission("course", "create"), async (req, res, next) => {
	console.log("//// CREATE COURSE ////");
	try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    data.slug = courseSlug(data.name);

    // Adiciona definições padrão ao criar um novo curso, caso não existam ( valores default )
    if (!data.enrollment && !data.settings) {
      data.enrollment = "free";

      data.settings = JSON.stringify({
        show_info_on_course_page: false,
        course_access_expiration: false,
        country_limit: false,
        progression_type: "linear",
      });
    }

    const insertedRow = await query("INSERT INTO course SET ?", data);
    res.send(insertedRow);
  } catch (err) {
		throw err;
	}
});

router.post("/update", requirePermission("course", "update"), async (req, res, next) => {
	console.log("//// UPDATE COURSE ////");
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;

		const query = util.promisify(db.query).bind(db);

		// Endereço (slug) do curso: se vier um, usa-se (normalizado) desde que nenhum outro curso do mesmo idioma o tenha;
		// sem ele, o endereço automático acompanha o nome, mas um endereço personalizado nunca é reescrito sozinho.
		const [current] = await query("SELECT name, slug, id_lang FROM course WHERE id = ?", [whereId]);
		if (typeof data.slug === "string" && data.slug.trim()) {
			const slug = courseSlug(data.slug);
			if (!slug) return res.status(400).send({ message: "Invalid slug" });
			const clash = await query("SELECT id FROM course WHERE slug = ? AND id_lang = ? AND id <> ? AND is_deleted = 0", [slug, current?.id_lang, whereId]);
			if (clash.length > 0) return res.status(409).send({ message: "A course with this address already exists" });
			data.slug = slug;
		} else if (data.name && current && current.slug === courseSlug(current.name)) {
			data.slug = courseSlug(data.name);
		} else {
			delete data.slug;
		}

		const columns = Object.keys(data);
		const values = Object.values(data);

		const updatedRow = await query(
			"UPDATE course SET " +
				columns.join(" = ?, ") +
				" = ? WHERE id = " +
				whereId,
			values,
		);

		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/updateTopic", requirePermission("course", "update"), async (req, res, next) => {
	console.log("//// UPDATE COURSE TOPIC ////");
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE course_topic SET " +
				columns.join(" = ?, ") +
				" = ? WHERE id = " +
				whereId,
			values,
		);

		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/updateTest", requirePermission("course", "update"), async (req, res, next) => {
	console.log("//// UPDATE COURSE TOPIC ////");
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE course_test SET " +
				columns.join(" = ?, ") +
				" = ? WHERE id = " +
				whereId,
			values,
		);

		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/updateProgress", async (req, res, next) => {
	console.log("//// UPDATE COURSE PROGRESS ////");
	try {
		let data = req.body.data;
		const query = util.promisify(db.query).bind(db);

		const columns = Object.keys(data[0]);

		// Converter objetos → array de arrays
		const rows = data.map(
			(obj) => columns.map((col) => obj[col]), // garante ordem correta
		);

		// Query
		const insertedRow = await query(
			"INSERT INTO course_user_activity (" + columns.join(", ") + ") VALUES ?",
			[rows], // 👈 precisa ser array de arrays
		);

		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

// O Admin marca como concluído, em nome de um aluno: um item (tópico/teste), um módulo ou o curso todo. Só acrescenta o que ainda
// não está concluído; depois fecha os módulos e o curso se ficarem completos. Os itens saem sempre do curso na BD, nunca do cliente.
router.post("/completeProgress", requirePermission("course", "update"), async (req, res) => {
	console.log("//// COMPLETE COURSE PROGRESS ////");
	const { id_user, id_course, scope, id_module, item } = req.body.data || {};
	if (!id_user || !id_course || !["item", "module", "course"].includes(scope)) return res.status(400).send({ message: "Invalid request" });

	db.getConnection(async (error, conn) => {
		if (error) return res.status(500).send({ message: "Error" });
		const query = util.promisify(conn.query).bind(conn);
		try {
			await util.promisify(conn.beginTransaction).bind(conn)();
			const users = await query("SELECT id FROM user WHERE id = ? AND is_deleted = 0", [id_user]);
			const modules = await query("SELECT id, items FROM course_module WHERE id_course = ? AND is_deleted = 0", [id_course]);
			if (users.length === 0 || modules.length === 0) {
				await util.promisify(conn.rollback).bind(conn)();
				conn.release();
				return res.status(404).send({ message: "Not found" });
			}
			const moduleItems = modules.map((m) => ({ id: m.id, items: (m.items ? JSON.parse(m.items) : []).map((i) => ({ type: i.type, id: Number(i.id) })) }));

			let targets = [];
			if (scope === "course") targets = moduleItems.flatMap((m) => m.items.map((i) => ({ ...i, id_module: m.id })));
			else if (scope === "module") targets = (moduleItems.find((m) => m.id === Number(id_module))?.items || []).map((i) => ({ ...i, id_module: Number(id_module) }));
			else {
				const owner = moduleItems.find((m) => m.items.some((i) => i.type === item?.type && i.id === Number(item?.id)));
				if (owner) targets = [{ type: item.type, id: Number(item.id), id_module: owner.id }];
			}
			if (targets.length === 0) {
				await util.promisify(conn.rollback).bind(conn)();
				conn.release();
				return res.status(400).send({ message: "Nothing to complete" });
			}

			const done = await query("SELECT activity_type, id_course_topic, id_course_test, id_course_module FROM course_user_activity WHERE id_user = ? AND id_course = ? AND is_completed = 1 AND is_deleted = 0", [id_user, id_course]);
			const isDone = (type, id) => done.some((d) => d.activity_type === type && d[`id_course_${type}`] === id);
			const rows = [];
			const add = (activity_type, ids = {}, meta_data = null) => rows.push([id_course, id_user, activity_type, ids.test ?? null, ids.topic ?? null, ids.module ?? null, 1, meta_data]);

			if (!done.some((d) => d.activity_type === "enroll")) add("enroll");
			for (const t of targets) {
				if (isDone(t.type, t.id)) continue;
				if (t.type === "topic") add("topic", { topic: t.id, module: t.id_module });
				else add("test", { test: t.id, module: t.id_module }, JSON.stringify({ items: [], completed_by_admin: true }));
				done.push({ activity_type: t.type, [`id_course_${t.type}`]: t.id });
			}
			// Módulos que ficam completos e, se forem todos, o curso
			let allModules = true;
			for (const m of moduleItems) {
				const complete = m.items.every((i) => isDone(i.type, i.id));
				if (complete && !isDone("module", m.id) && m.items.length > 0) add("module", { module: m.id });
				if (!complete) allModules = false;
			}
			if (allModules && !done.some((d) => d.activity_type === "course")) add("course");

			if (rows.length > 0) {
				await query("INSERT INTO course_user_activity (id_course, id_user, activity_type, id_course_test, id_course_topic, id_course_module, is_completed, meta_data) VALUES ?", [rows]);
			}
			await util.promisify(conn.commit).bind(conn)();
			conn.release();
			res.send({ inserted: rows.length });
		} catch (err) {
			await util.promisify(conn.rollback).bind(conn)().catch(() => {});
			conn.release();
			console.log(err);
			res.status(500).send({ message: "Error" });
		}
	});
});

router.post("/resetProgress", requirePermission("course", "update"), async (req, res, next) => {
	console.log("//// UPDATE COURSE PROGRESS ////");
	db.getConnection(async (error, conn) => {
		if (error) throw error;
		const query = util.promisify(conn.query).bind(conn);
		const transaction = util.promisify(conn.beginTransaction).bind(conn);
		const commit = util.promisify(conn.commit).bind(conn);
		const rollback = util.promisify(conn.rollback).bind(conn);
		try {
			await transaction();
			let data = req.body.data;
			let course = data.course;
			let modules = data.module;
			let items = data.items;
			let tests = data.tests;
			let topicsToDelete = [];
			let testsToDelete = [];
			let modulesToDelete = [];

			if (course.settings && course.settings.progression_type === "linear") {
				topicsToDelete = items
					.map((i) => (i.type === "topic" ? i.id : null))
					.filter((i) => i !== null);
				testsToDelete = tests.map((i) => i.id);
				modulesToDelete = modules.map((m) => m.id);
			} else if (course.settings.progression_type === "free") {
				topicsToDelete = items[0].type === "topic" ? items[0].id : [];
				testsToDelete = tests.map((i) => i.id);
				modulesToDelete = modules[0].id;
			}

			const resp = await query(
				`DELETE FROM course_user_activity WHERE id_user = ${data.user.id} AND id_course = ${course.id} AND id_course_module IN (?) AND activity_type = 'module'; ` +
					`DELETE FROM course_user_activity WHERE id_user = ${data.user.id} AND id_course = ${course.id} AND id_course_topic IN (?) AND activity_type = 'topic'; ` +
					`DELETE FROM course_user_activity WHERE id_user = ${data.user.id} AND id_course = ${course.id} AND id_course_test IN (?) AND activity_type = 'test' ` +
					`DELETE FROM course_user_activity WHERE id_user = ${data.user.id} AND id_course = ${course.id} AND activity_type = 'course'`,
				[modulesToDelete, topicsToDelete, testsToDelete],
			);

			console.log(resp);

			await commit();
			conn.release();
			res.send(data);
		} catch (err) {
			console.log(err);
			await rollback();
			conn.release();
			throw err;
		}
	});
});

router.post("/module", requirePermission("course", "update"), async (req, res, next) => {
	console.log("//// UPDATE COURSE MODULE ////");
	db.getConnection(async (error, conn) => {
		if (error) throw error;
		const query = util.promisify(conn.query).bind(conn);
		const transaction = util.promisify(conn.beginTransaction).bind(conn);
		const commit = util.promisify(conn.commit).bind(conn);
		const rollback = util.promisify(conn.rollback).bind(conn);
		try {
			await transaction();
			let data = req.body.data;
			
			// console.log("\n========== DELETE REQUEST ==========");
			// console.log("FULL deleted object:", JSON.stringify(req.body.deleted, null, 2));
			// console.log("deleted.items type:", typeof req.body.deleted.items, "is array?", Array.isArray(req.body.deleted.items));
			// console.log("deleted.items raw:", req.body.deleted.items);
			// console.log("deleted.items length:", req.body.deleted.items?.length);
			// console.log("deleted.modules type:", typeof req.body.deleted.modules, "is array?", Array.isArray(req.body.deleted.modules));
			// console.log("deleted.modules raw:", req.body.deleted.modules);
			// console.log("====================================\n");
			
			let deletedItems = req.body.deleted.items || [];
			let deletedModules = req.body.deleted.modules || [];
			
			// Parse de IDs dos módulos deletados para verificar ao atualizar os itens
			const deletedModuleIds = new Set(
				deletedModules
					.map((_i) => parseInt(_i.split("-")[1]))
					.filter((_id) => !isNaN(_id))
			);
			// console.log("Deleted module IDs set:", deletedModuleIds);

			for (let i = 0; i < data.length; i++) {
				const aux = data[i];

				const insertedModule = await query(
					"INSERT INTO course_module SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), position = VALUES(position)",
					{
						id:
							aux.id.split("-")[0] === "newmod"
								? null
								: parseInt(aux.id.split("-")[1]),
						id_course: aux.id_course,
						title: aux.title,
						description: aux.description,
						position: i,
					},
				);
				aux.id =
					aux.id.split("-")[0] === "newmod"
						? insertedModule.insertId
						: parseInt(aux.id.split("-")[1]);

				let newItems = [];
				
				if (aux.items && aux.items.length > 0) {
					for (let z = 0; z < aux.items.length; z++) {
						// Verifica se o item é um novo teste ou tópico
						const isNewTest = aux.items[z].id.split("-")[0] === "newtest";
						const isNewTopic = aux.items[z].id.split("-")[0] === "newtopic";
						
						const itemData = {
							id:
								isNewTest || isNewTopic
									? null
									: parseInt(aux.items[z].id.split("-")[1]),
							id_course_module: aux.id,
							title: aux.items[z].title,
							is_deleted: 0,
						};
						
						// Adiciona configurações padrão para novos testes
						if (isNewTest && aux.items[z].type === "test") {
							itemData.settings = JSON.stringify({
								passing_score: 75,
								randomize_answers: false,
								randomize_questions: false,
								show_correct_answers: false,
							});
						}
						
						const insertedItem = await query(
							`INSERT INTO ${aux.items[z].type === "test" ? "course_test" : "course_topic"} SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), id_course_module = VALUES(id_course_module), is_deleted = 0`,
							itemData,
						);

						newItems.push({
							id:
								aux.items[z].id.split("-")[0] === "newtopic" ||
								aux.items[z].id.split("-")[0] === "newtest"
									? insertedItem.insertId
									: parseInt(aux.items[z].id.split("-")[1]),
							type: aux.items[z].type,
						});
					}
				}

				// Atualiza os itens do módulo, mas verifica se o módulo foi deletado antes de atualizar
				let itemsValue;
				if (deletedModuleIds.has(aux.id)) {
					itemsValue = null;
					// console.log(`Module ${aux.id} is deleted → setting items to NULL`);
				} else {
					itemsValue = newItems.length > 0 ? JSON.stringify(newItems) : JSON.stringify([]);
					// console.log(`Updating module ${aux.id} items to:`, newItems);
				}
				
				await query("UPDATE course_module SET items = ? WHERE id = ?", [
					itemsValue,
					aux.id,
				]);
			}

			if (deletedItems.length > 0) {
				// console.log("\n PROCESSING DELETED ITEMS");
				// console.log("Raw deletedItems:", deletedItems);
				
				let deletedItemsId = deletedItems
					.filter((_t) => _t.includes("topic"))
					.map((_i) => {
						const id = parseInt(_i.split("-")[1]);
						// console.log(`  Topic: "${_i}" → ID: ${id}`);
						return id;
					})
					.filter((_id) => !isNaN(_id));
				
				// console.log("Parsed topic IDs:", deletedItemsId);
				
				if (deletedItemsId.length > 0) {
					// console.log(`Deleting ${deletedItemsId.length} topics`);
					const result = await query(
						"UPDATE course_topic SET is_deleted = 1 WHERE id IN (?)",
						[deletedItemsId]
					);
					// console.log("Topics deleted:", result.affectedRows);
				}

				let deletedTestsId = deletedItems
					.filter((_t) => _t.includes("test"))
					.map((_i) => {
						const id = parseInt(_i.split("-")[1]);
						// console.log(`  Test: "${_i}" → ID: ${id}`);
						return id;
					})
					.filter((_id) => !isNaN(_id));
				
				// console.log("Parsed test IDs:", deletedTestsId);
				
				if (deletedTestsId.length > 0) {
					// console.log(`Deleting ${deletedTestsId.length} tests`);
					const result = await query(
						"UPDATE course_test SET is_deleted = 1 WHERE id IN (?)",
						[deletedTestsId]
					);
					// console.log("Tests deleted:", result.affectedRows);
				}
			}

			if (deletedModules.length > 0) {
				// console.log("\n📋 PROCESSING DELETED MODULES");
				// console.log("Raw deletedModules:", deletedModules);
				
				let deletedModulesId = deletedModules
					.map((_i) => {
						const id = parseInt(_i.split("-")[1]);
						// console.log(`  Module: "${_i}" → ID: ${id}`);
						return id;
					})
					.filter((_id) => !isNaN(_id));
				
				// console.log("Parsed module IDs:", deletedModulesId);
				
				if (deletedModulesId.length > 0) {
					// console.log(`Deleting ${deletedModulesId.length} modules`);
					const result = await query(
						"UPDATE course_module SET is_deleted = 1 WHERE id IN (?)",
						[deletedModulesId]
					);
					// console.log("Modules deleted:", result.affectedRows);
				}
			}

			await commit();
			conn.release();
			// console.log("✅ TRANSACTION COMMITTED SUCCESSFULLY");
			res.send(data);
		} catch (err) {
			console.log(err);
			await rollback();
			conn.release();
			throw err;
		}
	});
});

router.post("/duplicate", requirePermission("course", "create"), async (req, res, next) => {
	console.log("//// DUPLICATE COURSE ////");
	db.getConnection(async (error, conn) => {
		if (error) throw error;
		const query = util.promisify(conn.query).bind(conn);
		const transaction = util.promisify(conn.beginTransaction).bind(conn);
		const commit = util.promisify(conn.commit).bind(conn);
		const rollback = util.promisify(conn.rollback).bind(conn);
		try {
			await transaction();
			let data = req.body.data;
			console.log(data);
			let course = await query("SELECT * FROM course WHERE id = ?", data.id);
			course = course[0];
			delete course.id;
			course.name = data.new_name || course.name + " (copy)";
			course.internal_name =
				data.new_internal_name || course.internal_name + " (copy)";
			course.id_lang = data.id_lang || course.id_lang;
			course.id_course_certificate = null;
			course.status = "draft";
			course.slug = courseSlug(data.new_name || course.name + " (copy)");

			const insertedCourse = await query("INSERT INTO course SET ?", course);

			let modules = await query(
				"SELECT * FROM course_module WHERE id_course = ? AND is_deleted = 0",
				data.id,
			);
			for (let i = 0; i < modules.length; i++) {
				let module = modules[i];
				delete module.id;
				module.id_course = insertedCourse.insertId;
				
				let moduleItems = null;
				try {
					moduleItems = module.items ? JSON.parse(module.items) : null;
				} catch (parseError) {
					console.log(`Warning: Failed to parse items for module, skipping...`, parseError.message);
					moduleItems = null;
				}
				
				delete module.items;
				const insertedModule = await query(
					"INSERT INTO course_module SET ?",
					module,
				);
				if (moduleItems && moduleItems.length > 0) {
					let newItems = [];

					for (let z = 0; z < moduleItems.length; z++) {
						const item = moduleItems[z];
						const rowItem =
							item.type === "test"
								? await query("SELECT * FROM course_test WHERE id = ?", item.id)
								: await query(
										"SELECT * FROM course_topic WHERE id = ?",
										item.id,
									);
						
						if (!rowItem || rowItem.length === 0) {
							console.log(`Warning: ${item.type} with id ${item.id} not found, skipping...`);
							continue;
						}
						
						const rowItemData = rowItem[0];
						delete rowItemData.id;
						rowItemData.id_course_module = insertedModule.insertId;
						const insertedItem = await query(
							`INSERT INTO ${item.type === "test" ? "course_test" : "course_topic"} SET ?`,
							rowItemData,
						);

						newItems.push({
							id: insertedItem.insertId,
							type: item.type,
						});
					}

					await query("UPDATE course_module SET items = ? WHERE id = ?", [
						JSON.stringify(newItems),
						insertedModule.insertId,
					]);
				}
			}

			await commit();
			conn.release();
			res.send({ insertId: insertedCourse.insertId });
		} catch (err) {
			console.log(err);
			await rollback();
			conn.release();
			throw err;
		}
	});
});

router.post("/delete", requirePermission("course", "delete"), async (req, res, next) => {
	console.log("//// DELETE COURSE ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const deletedRow = await query(
			"UPDATE course SET is_deleted = 1 WHERE id = " + req.body.data.id,
		);
		res.send(deletedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/deleteTry", requirePermission("course", "update"), async (req, res, next) => {
	console.log("//// DELETE TRY ////");
	try {
		console.log();
		const query = util.promisify(db.query).bind(db);
		const deletedRow = await query(
			"DELETE FROM course_user_activity WHERE id = " + req.body.data.id,
		);
		res.send(deletedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
