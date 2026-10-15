const { ADMIN_ROLE_ID } = require("./permissions");

// ---- Acesso restrito: países (course.settings.country_limit + country) e utilizadores/grupos (course.settings.restrict_to_users) ----
// A verificação é feita no servidor (catálogo, detalhe do curso e resultados do perfil), para TODAS as funções (aluno, Gestor e Admin): o que o utilizador não pode ver nem chega ao
// browser. Com os dois limites ligados o curso só aparece a quem cumpre ambos (país E utilizador/grupo); dentro do limite de pessoas
// basta estar na lista de utilizadores OU num dos grupos.
function courseSettings(course) {
	let settings = course.settings;
	if (typeof settings === "string") {
		try {
			settings = settings ? JSON.parse(settings) : null;
		} catch {
			settings = null;
		}
	}
	return settings || {};
}

function isRestrictedCourse(course) {
	return !!courseSettings(course).restrict_to_users;
}

// Países do limite (sem limite ou lista vazia = todos os países)
function countryLimit(course) {
	const settings = courseSettings(course);
	return settings.country_limit && Array.isArray(settings.country) && settings.country.length > 0 ? settings.country : null;
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
		if (err.code !== "ER_NO_SUCH_TABLE") console.error(err);
		return new Set();
	}
}

// Cursos que o utilizador pode ver: limite de países (pelo país da sua conta) e limite a utilizadores/grupos.
// O Admin vê sempre todos (sem restrições)
async function visibleCourses(query, courses, user) {
	if (Number(user?.id_role) === ADMIN_ROLE_ID) return courses;
	const userId = user?.id;
	if (!courses.some((c) => isRestrictedCourse(c) || countryLimit(c))) return courses;
	const [person] = userId ? await query("SELECT country FROM user WHERE id = ? AND is_deleted = 0", [userId]) : [];
	const allowed = courses.some(isRestrictedCourse) ? await accessibleCourseIds(query, userId) : new Set();
	return courses.filter((c) => {
		const countries = countryLimit(c);
		if (countries && !countries.includes(person?.country)) return false;
		return !isRestrictedCourse(c) || allowed.has(c.id);
	});
}

// Testes que a pessoa pode ver: limite de países do teste (test.settings.country_limit + country), pelo país da sua conta.
// Um teste fora do limite não chega ao aluno: não aparece, não conta para o progresso nem o pode reprovar. O Admin vê todos
function visibleTests(tests, person) {
	if (Number(person?.id_role) === ADMIN_ROLE_ID) return tests;
	return tests.filter((t) => {
		const countries = countryLimit(t);
		return !countries || countries.includes(person?.country);
	});
}

module.exports = { courseSettings, isRestrictedCourse, countryLimit, accessibleCourseIds, visibleCourses, visibleTests };
