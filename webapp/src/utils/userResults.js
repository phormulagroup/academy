import dayjs from "dayjs";
import { isCourseFailed } from "./courseStatus";

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
  // Cada item uma só vez, mesmo que esteja em dois módulos (como no catálogo, no detalhe e no eLearning)
  const items = [...new Map(c.allItems.map((i) => [`${i.type}_${i.id}`, i])).values()];
  const topics = items.filter((i) => i.type === "topic");
  const tests = items.filter((i) => i.type === "test");
  // Conta cada item uma só vez (há registos repetidos) e só os que ainda existem no curso
  const itemDone = (item) => c.progress.some((p) => p.is_completed === 1 && p.is_deleted !== 1 && p.activity_type === item.type && p[`id_course_${item.type}`] === item.id);
  const topicsDone = topics.filter(itemDone).length;
  const testsDone = tests.filter(itemDone).length;
  const totalItems = topics.length + tests.length;
  const percent = totalItems > 0 ? Math.round(((100 * (topicsDone + testsDone)) / totalItems) * 100) / 100 : 0;
  const enroll = c.progress.find((p) => p.activity_type === "enroll");
  // Data em que ficou a 100%: a conclusão mais recente de um item do curso (o registo "curso concluído" pode ser de antes de um reset)
  const lastItemDone = c.progress
    .filter((p) => p.is_completed === 1 && (p.activity_type === "topic" || p.activity_type === "test") && c.allItems.some((i) => i.type === p.activity_type && i.id === p[`id_course_${p.activity_type}`]))
    .reduce((last, p) => (!last || dayjs(p.created_at).isAfter(last) ? p.created_at : last), null);
  const firstActivity = c.progress.reduce((first, p) => (!first || dayjs(p.created_at).isBefore(first) ? p.created_at : first), null);
  // Atividade mais recente (o progresso não vem ordenado por data)
  const lastActivity = c.progress.reduce((last, p) => (!last || dayjs(p.created_at).isAfter(last) ? p.created_at : last), null);

  // Estado pelos itens concluídos (não pelo registo "curso concluído", que pode ter ficado de antes de o Admin desmarcar um item):
  // aprovado com tudo feito; em curso se já se inscreveu (mesmo a 0%, ex.: o Admin desmarcou tudo), fez algo ou tentou um teste;
  // não iniciado só se nunca começou o curso
  const triedTest = c.progress.some((p) => p.activity_type === "test" && tests.some((t) => t.id === p.id_course_test));
  let status = "not_started";
  if (totalItems > 0 && percent === 100) status = "completed";
  else if (enroll || topicsDone + testsDone > 0 || triedTest) status = "in_progress";

  return {
    percent,
    status,
    topicsTotal: topics.length,
    topicsDone,
    testsTotal: tests.length,
    testsDone,
    modulesTotal: c.modules.length,
    // Módulo concluído pelos itens (como no Progresso do backoffice), não pelo registo "módulo concluído"
    modulesDone: c.modules.filter((m) => (m.items ?? []).length > 0 && m.items.every(itemDone)).length,
    // Início: inscrição; sem ela (ex.: progresso marcado pelo Admin antigo), a primeira atividade
    startedAt: status === "not_started" ? null : (enroll?.created_at ?? firstActivity),
    completedAt: status === "completed" ? lastItemDone : null,
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
      // Concluído pelo Admin: sem tempo de resposta (não foi feito pelo aluno)
      return { ...p, seconds: meta?.completed_by_admin ? null : (meta?.time ?? null), items: answers, correct: answers.filter((a) => a.is_correct).length, totalAnswers: answers.length };
    }),
    maxTries,
    questions: questionCount,
    time: settings?.time ?? null,
    passingScore: settings?.passing_score ?? 75,
  };
}

export const formatSeconds = (seconds) => {
  if (seconds == null) return "-";
  return seconds > 60 ? `${Math.floor(seconds / 60)} min` : `${seconds} s`;
};

// ---- Relatórios: as mesmas regras do perfil/backoffice, a partir dos dados do /course/report ----
// Itens que contam em cada curso: os dos módulos que ainda existem; testes de alunos sem rascunhos (os expirados contam: o curso não se conclui sem eles)
export function reportCourseItems(data) {
  const topics = new Set((data.topics || []).map((t) => t.id));
  const tests = new Map((data.tests || []).filter((t) => t.status !== "draft").map((t) => [t.id, t]));
  const byCourse = new Map();
  (data.modules || []).forEach((m) => {
    if (!byCourse.has(m.id_course)) byCourse.set(m.id_course, { keys: new Set(), tests: [] });
    const entry = byCourse.get(m.id_course);
    parseJson(m.items, []).forEach((i) => {
      const id = Number(i.id);
      if (i.type === "topic" && topics.has(id)) entry.keys.add(`topic-${id}`);
      if (i.type === "test" && tests.has(id) && !entry.keys.has(`test-${id}`)) {
        entry.keys.add(`test-${id}`);
        entry.tests.push(tests.get(id));
      }
    });
  });
  return byCourse;
}

// Estado de um aluno num curso: % de itens feitos, aprovado (100%) e reprovado (esgotou as tentativas de um teste)
export function reportCourseState(entry, activities) {
  const keys = entry?.keys ?? new Set();
  const done = new Set(
    activities
      .filter((a) => a.is_completed === 1 && a.is_deleted !== 1 && (a.activity_type === "topic" || a.activity_type === "test"))
      .map((a) => `${a.activity_type}-${a.activity_type === "topic" ? a.id_course_topic : a.id_course_test}`)
      .filter((k) => keys.has(k)),
  );
  const completed = keys.size > 0 && done.size === keys.size;
  return {
    percent: keys.size > 0 ? Math.round((done.size * 100) / keys.size) : 0,
    completed,
    failed: !completed && isCourseFailed(activities, entry?.tests ?? []),
  };
}

// Atividade agrupada por aluno e curso (só alunos aprovados, sem registos apagados)
export function activityByStudentCourse(data) {
  const students = new Set((data.users || []).filter((u) => u.id_role === 2 && u.status?.toLowerCase() === "approved").map((u) => u.id));
  const map = new Map();
  (data.activity || []).forEach((a) => {
    if (a.is_deleted === 1 || !students.has(a.id_user)) return;
    if (!map.has(a.id_user)) map.set(a.id_user, new Map());
    const courses = map.get(a.id_user);
    if (!courses.has(a.id_course)) courses.set(a.id_course, []);
    courses.get(a.id_course).push(a);
  });
  return { students, map };
}
