const util = require("util");
const db = require("./database");
const { ADMIN_ROLE_ID } = require("./permissions");

// Admin: todos os cursos concluídos por defeito (não precisa de fazer tópicos nem testes). Acrescenta só o que falta (inscrição, tópicos,
// testes aprovados a 100% com as respostas certas, módulos e curso), por isso também cobre um admin novo e cursos criados depois.
// Não envia o e-mail de curso concluído. Chamado no login e ao abrir o catálogo/curso; um erro aqui nunca parte o pedido.
const parse = (value, fallback) => {
	try {
		return (typeof value === "string" ? JSON.parse(value) : value) || fallback;
	} catch {
		return fallback;
	}
};

// Resultado do teste como o do eLearning (pages/app/course/test.jsx › evaluateQuestion), com todas as respostas certas
function approvedResult(questions) {
	const items = parse(questions, [])
		.map((question) => {
			const correct = (question?.answer || []).filter((a) => a.is_correct);
			if (correct.length === 0) return null;
			return { is_correct: true, ...question, myAnswer: correct.length > 1 ? correct.map((c) => c.title) : correct[0].title };
		})
		.filter(Boolean);
	return JSON.stringify({ items, time: 0, completed_by_admin: true });
}

// Uma execução de cada vez por admin: pedidos em simultâneo (login, catálogo, detalhe) liam o mesmo "falta" e duplicavam os registos
const running = new Map();

function completeAllCoursesForAdmin(user) {
	if (!user?.id || Number(user.id_role) !== ADMIN_ROLE_ID) return Promise.resolve();
	const previous = running.get(user.id) || Promise.resolve();
	const next = previous.then(() => completeMissing(user));
	running.set(user.id, next);
	return next.finally(() => {
		if (running.get(user.id) === next) running.delete(user.id);
	});
}

async function completeMissing(user) {
	const query = util.promisify(db.query).bind(db);
	try {
		const [modules, topics, tests, done] = await Promise.all([
			query("SELECT m.id, m.id_course, m.items FROM course_module m JOIN course c ON c.id = m.id_course WHERE m.is_deleted = 0 AND c.is_deleted = 0"),
			query("SELECT id FROM course_topic WHERE is_deleted = 0"),
			query("SELECT id, question FROM course_test WHERE is_deleted = 0"),
			query("SELECT id_course, activity_type, id_course_topic, id_course_test, id_course_module FROM course_user_activity WHERE id_user = ? AND is_completed = 1 AND is_deleted = 0", [user.id]),
		]);
		const topicIds = new Set(topics.map((t) => t.id));
		const testById = new Map(tests.map((t) => [t.id, t]));
		const has = new Set(done.map((d) => `${d.id_course}|${d.activity_type}|${d.id_course_topic ?? d.id_course_test ?? d.id_course_module ?? ""}`));
		const rows = [];
		const add = (course, type, ids = {}, meta = null) => {
			const key = `${course}|${type}|${ids.topic ?? ids.test ?? (type === "module" ? ids.module : "") ?? ""}`;
			if (has.has(key)) return;
			has.add(key);
			rows.push([course, user.id, type, ids.test ?? null, ids.topic ?? null, ids.module ?? null, 1, meta]);
		};

		const byCourse = new Map();
		for (const m of modules) byCourse.set(m.id_course, [...(byCourse.get(m.id_course) || []), m]);
		for (const [course, courseModules] of byCourse) {
			const items = courseModules.map((m) => ({
				id: m.id,
				items: parse(m.items, []).filter((i) => (i.type === "topic" ? topicIds.has(Number(i.id)) : i.type === "test" && testById.has(Number(i.id)))),
			}));
			if (!items.some((m) => m.items.length > 0)) continue;
			add(course, "enroll");
			for (const m of items) {
				for (const i of m.items) {
					if (i.type === "topic") add(course, "topic", { topic: Number(i.id), module: m.id });
					else add(course, "test", { test: Number(i.id), module: m.id }, approvedResult(testById.get(Number(i.id)).question));
				}
				if (m.items.length > 0) add(course, "module", { module: m.id });
			}
			add(course, "course");
		}
		if (rows.length > 0) {
			await query("INSERT INTO course_user_activity (id_course, id_user, activity_type, id_course_test, id_course_topic, id_course_module, is_completed, meta_data) VALUES ?", [rows]);
		}
	} catch (err) {
		console.error("completeAllCoursesForAdmin", err.message);
	}
}

module.exports = { completeAllCoursesForAdmin, approvedResult };
