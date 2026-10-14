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

module.exports = { approvedResult };
