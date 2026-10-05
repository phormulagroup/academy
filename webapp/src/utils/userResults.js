// Cálculos dos resultados de um aluno nos cursos (página de detalhes do utilizador no backoffice)

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

// Percentagem de itens (tópicos e testes) concluídos de um curso
export function courseStats(c) {
  const topics = c.allItems.filter((i) => i.type === "topic");
  const tests = c.allItems.filter((i) => i.type === "test");
  // Conta cada item uma só vez (há registos repetidos) e só os que ainda existem no curso
  const itemDone = (item) => c.progress.some((p) => p.is_completed === 1 && p.activity_type === item.type && p[`id_course_${item.type}`] === item.id);
  const topicsDone = topics.filter(itemDone).length;
  const testsDone = tests.filter(itemDone).length;
  const totalItems = topics.length + tests.length;
  const percent = totalItems > 0 ? Math.round(((100 * (topicsDone + testsDone)) / totalItems) * 100) / 100 : 0;
  const courseDone = c.progress.find((p) => p.activity_type === "course" && p.is_completed);
  const enroll = c.progress.find((p) => p.activity_type === "enroll");
  const lastActivity = c.progress.length > 0 ? c.progress[c.progress.length - 1].created_at : null;

  let status = "not_started";
  if (c.progress.length > 0) status = courseDone || percent === 100 ? "completed" : "in_progress";

  return {
    percent,
    status,
    topicsTotal: topics.length,
    topicsDone,
    testsTotal: tests.length,
    testsDone,
    modulesTotal: c.modules.length,
    modulesDone: c.modules.filter((m) => c.progress.some((p) => p.activity_type === "module" && p.is_completed && p.id_course_module === m.id)).length,
    startedAt: enroll?.created_at ?? null,
    completedAt: courseDone?.created_at ?? null,
    lastActivity,
    hasCertificate: percent === 100,
  };
}

// Resultado de um teste: tentativas, definições e estado
export function testResult(c, test) {
  const tries = c.progress.filter((p) => p.activity_type === "test" && p.id_course_test === test.id);
  const settings = parseJson(test.settings, null);
  // question_count vem do servidor (as perguntas em si não seguem na listagem); o JSON só existe quando o teste vem completo
  const questionCount = test.question_count ?? parseJson(test.question, []).length;
  const maxTries = settings?.retries_allowed ?? 0;
  const passed = tries.some((p) => p.is_completed);
  const failedTries = tries.filter((p) => p.is_completed === 0).length;

  let status = "not_started";
  if (tries.length > 0) status = passed ? "passed" : maxTries > 0 && failedTries >= maxTries ? "not_passed" : "in_progress";

  return {
    status,
    tries: tries.map((p) => {
      const meta = parseJson(p.meta_data, {});
      const answers = meta?.items ?? [];
      return { ...p, seconds: meta?.time ?? null, items: answers, correct: answers.filter((a) => a.is_correct).length, totalAnswers: answers.length };
    }),
    maxTries,
    questions: questionCount,
    time: settings?.time ?? null,
    passingScore: settings?.passing_score ?? 80,
  };
}

export const formatSeconds = (seconds) => {
  if (seconds == null) return "-";
  return seconds > 60 ? `${Math.floor(seconds / 60)} min` : `${seconds} s`;
};
