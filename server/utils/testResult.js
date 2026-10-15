// Resultado de um teste aprovado a 100% (todas as respostas certas), no mesmo formato do eLearning
// (pages/app/course/test.jsx › evaluateQuestion). Usado quando o Admin marca um teste como concluído em nome do aluno.
const parse = (value, fallback) => {
	try {
		return (typeof value === "string" ? JSON.parse(value) : value) || fallback;
	} catch {
		return fallback;
	}
};

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

// Corrige uma pergunta com as respostas certas da BD (mesma regra do eLearning, test.jsx › evaluateQuestion): escolha única
// é uma string igual à certa; escolha múltipla é um array com todas as certas. Sem resposta conta como errada.
function evaluateQuestion(question, correct, answer) {
	const multiple = correct.length > 1;
	const given = multiple ? (Array.isArray(answer) ? answer.filter((a) => typeof a === "string") : []) : typeof answer === "string" ? answer : "";
	const answered = multiple ? given.length > 0 : !!given;
	const is_correct = answered && (multiple ? correct.every((c) => given.includes(c.title)) : given === correct[0].title);
	return { is_correct, ...question, myAnswer: answered ? given : multiple ? [] : null, ...(answered ? {} : { unanswered: true }) };
}

// Volta a corrigir no servidor uma tentativa enviada pelo eLearning: as perguntas e as respostas certas vêm sempre da BD e só se
// aproveita do cliente a resposta dada (myAnswer), o tempo e o timeUp. As perguntas são encontradas pelo título (a ordem pode ser
// aleatória); as que faltarem contam como sem resposta. Devolve o meta_data no mesmo formato e se ficou aprovado.
// Títulos repetidos: o formulário do eLearning guarda as respostas pelo título, por isso no envio normal entra um só item por título
// e no tempo esgotado um por pergunta (como no test.jsx). Entre perguntas com o mesmo título escolhe-se a que tem as mesmas opções.
function gradeAttempt(questions, settings, metaData) {
	const meta = parse(metaData, {});
	const sent = Array.isArray(meta) ? meta : Array.isArray(meta.items) ? meta.items : [];
	// Perguntas que contam para a nota (com resposta certa definida), agrupadas pelo título
	const byTitle = new Map();
	for (const question of parse(questions, [])) {
		const correct = (question?.answer || []).filter((a) => a.is_correct);
		if (!correct.length) continue;
		if (!byTitle.has(question.title)) byTitle.set(question.title, []);
		byTitle.get(question.title).push({ question, correct });
	}
	const options = (answers) => JSON.stringify((Array.isArray(answers) ? answers.map((a) => a?.title) : []).sort());
	const limit = (list) => (meta.timeUp ? list.length : 1);
	const items = [];
	for (const item of sent) {
		const list = byTitle.get(item?.title);
		if (!list || list.filter((q) => q.used).length >= limit(list)) continue;
		const free = list.filter((q) => !q.used);
		const q = free.find((f) => options(f.question.answer) === options(item.answer)) || free[0];
		q.used = true;
		items.push(evaluateQuestion(q.question, q.correct, item.myAnswer));
	}
	// Perguntas que não vieram no pedido: sem resposta (errada)
	byTitle.forEach((list) => {
		for (let n = list.filter((q) => q.used).length; n < limit(list); n++) {
			const q = list.find((f) => !f.used);
			q.used = true;
			items.push(evaluateQuestion(q.question, q.correct, null));
		}
	});

	// Percentagem mínima: a mesma do eLearning (75% se não estiver definida)
	const passingScore = parse(settings, {})?.passing_score ?? 75;
	const percentage = items.length > 0 ? (items.filter((i) => i.is_correct).length * 100) / items.length : 0;
	const passed = items.length > 0 && percentage >= passingScore;
	const graded = Array.isArray(meta) ? items : { items, time: Number(meta.time) || 0, ...(meta.timeUp ? { timeUp: true } : {}) };
	return { passed, meta_data: JSON.stringify(graded) };
}

module.exports = { approvedResult, gradeAttempt };
