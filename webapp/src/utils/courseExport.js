import dayjs from "dayjs";

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const fmtDate = (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "");
const asText = (value) => (Array.isArray(value) ? value.join(" | ") : (value ?? ""));
const short = (text, max = 60) => (String(text ?? "").length > max ? `${String(text).slice(0, max - 1)}…` : String(text ?? ""));

// Estatísticas de um aluno num teste, a partir das suas tentativas (a mais recente é a de referência para as perguntas)
function testStats(test, tries) {
  const settings = parseJson(test.settings, null);
  const maxTries = settings?.retries_allowed ?? 0;
  const parsed = tries.map((p) => {
    const meta = parseJson(p.meta_data, {});
    const items = meta?.items ?? [];
    const correct = items.filter((i) => i.is_correct).length;
    return { row: p, items, correct, total: items.length, score: items.length ? Math.round((correct / items.length) * 100) : null, seconds: meta?.time ?? null };
  });
  const passed = tries.some((p) => p.is_completed === 1);
  const failed = tries.filter((p) => p.is_completed === 0).length;
  let status = "not_started";
  if (tries.length > 0) status = passed ? "passed" : maxTries > 0 && failed >= maxTries ? "not_passed" : "in_progress";
  const scores = parsed.map((p) => p.score).filter((s) => s !== null);
  return { settings, maxTries, parsed, passed, status, last: parsed[parsed.length - 1] ?? null, bestScore: scores.length ? Math.max(...scores) : null, firstPass: tries.find((p) => p.is_completed === 1) ?? null };
}

const formatSeconds = (seconds) => (seconds == null ? "" : seconds > 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`);

// Dados do export do painel de um curso (Relatórios de curso): uma linha por aluno com o estado, as datas, o progresso, os totais
// de tentativas e, por cada teste do curso, as estatísticas do teste e o resultado e a resposta de cada pergunta (na última tentativa).
// `base` são as linhas já calculadas do painel (estado, datas, módulos/tópicos/testes).
export function buildCourseStudentExport({ course, base, data, languages, t }) {
  const courseTests = (data.tests ?? []).filter((x) => x.id_course === course.id && x.is_deleted === 0);
  const courseTopics = (data.topics ?? []).filter((x) => x.id_course === course.id);
  const activity = (data.activity ?? []).filter((a) => a.id_course === course.id && a.is_deleted === 0);
  const language = languages?.find((l) => l.id === course.id_lang)?.code?.toUpperCase() ?? "";

  const statusLabel = { passed: t("Passed"), not_passed: t("Not passed"), in_progress: t("In progress"), not_started: t("Not started") };

  // Perguntas de cada teste, pela ordem do teste (as mesmas colunas para todos os alunos)
  const testsWithQuestions = courseTests.map((test) => ({ test, questions: parseJson(test.question, []) }));

  const columns = [
    { title: "ID", dataIndex: "ID" },
    { title: t("Name"), dataIndex: "name" },
    { title: t("E-mail"), dataIndex: "email" },
    { title: t("Country"), dataIndex: "country" },
    { title: t("Course"), dataIndex: "course" },
    { title: t("Language"), dataIndex: "lang" },
    { title: t("Status"), dataIndex: "status" },
    { title: t("Date start"), dataIndex: "start_date" },
    { title: t("Date end"), dataIndex: "end_date" },
    { title: t("Last activity"), dataIndex: "last_activity" },
    { title: t("Days in the course"), dataIndex: "days" },
    { title: t("Progress (%)"), dataIndex: "progress" },
    { title: t("Modules"), dataIndex: "nr_modules" },
    { title: t("Topics"), dataIndex: "nr_topics" },
    { title: t("Tests"), dataIndex: "nr_tests" },
    { title: t("Total test tries"), dataIndex: "total_tries" },
    { title: t("Passed tries"), dataIndex: "passed_tries" },
    { title: t("Failed tries"), dataIndex: "failed_tries" },
  ];

  testsWithQuestions.forEach(({ test, questions }, ti) => {
    const prefix = courseTests.length > 1 ? `${short(test.title, 40)} · ` : "";
    const k = `t${ti}`;
    columns.push(
      { title: `${prefix}${t("Test status")}`, dataIndex: `${k}_status` },
      { title: `${prefix}${t("Tries")}`, dataIndex: `${k}_tries` },
      { title: `${prefix}${t("Best score (%)")}`, dataIndex: `${k}_best` },
      { title: `${prefix}${t("Last score (%)")}`, dataIndex: `${k}_last` },
      { title: `${prefix}${t("Correct answers (last try)")}`, dataIndex: `${k}_correct` },
      { title: `${prefix}${t("Time (last try)")}`, dataIndex: `${k}_time` },
      { title: `${prefix}${t("Passing score")}`, dataIndex: `${k}_passing` },
      { title: `${prefix}${t("Date of last try")}`, dataIndex: `${k}_last_date` },
      { title: `${prefix}${t("Date passed")}`, dataIndex: `${k}_passed_date` },
    );
    questions.forEach((q, qi) => {
      columns.push(
        { title: `${prefix}Q${qi + 1} ${short(q.title)} — ${t("Result")}`, dataIndex: `${k}_q${qi}_result` },
        { title: `${prefix}Q${qi + 1} — ${t("Student's answer")}`, dataIndex: `${k}_q${qi}_answer` },
      );
    });
  });

  const rows = base.map((row) => {
    const userActivity = activity.filter((a) => a.id_user === row.ID);
    const completed = (type, id) => userActivity.some((a) => a.activity_type === type && a.is_completed === 1 && a[`id_course_${type}`] === id);
    const topicsDone = courseTopics.filter((x) => completed("topic", x.id)).length;
    const testsDone = courseTests.filter((x) => completed("test", x.id)).length;
    const totalItems = courseTopics.length + courseTests.length;
    const progress = totalItems > 0 ? Math.round(((topicsDone + testsDone) * 100) / totalItems) : 0;
    const lastActivity = userActivity.map((a) => a.created_at).sort().pop();
    const startedRaw = userActivity.map((a) => a.created_at).sort()[0];
    const endedRaw = userActivity.find((a) => a.activity_type === "course" && a.is_completed === 1)?.created_at;
    const days = startedRaw ? Math.max(0, dayjs(endedRaw && row.status === t("Approved") ? endedRaw : undefined).diff(dayjs(startedRaw), "day")) : "";

    const allTries = userActivity.filter((a) => a.activity_type === "test");
    const out = {
      ...row,
      last_activity: fmtDate(lastActivity),
      days,
      progress,
      total_tries: allTries.length,
      passed_tries: allTries.filter((a) => a.is_completed === 1).length,
      failed_tries: allTries.filter((a) => a.is_completed === 0).length,
    };

    testsWithQuestions.forEach(({ test, questions }, ti) => {
      const k = `t${ti}`;
      const tries = allTries.filter((a) => a.id_course_test === test.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const stats = testStats(test, tries);
      out[`${k}_status`] = statusLabel[stats.status];
      out[`${k}_tries`] = stats.maxTries > 0 ? `${tries.length}/${stats.maxTries}` : tries.length;
      out[`${k}_best`] = stats.bestScore ?? "";
      out[`${k}_last`] = stats.last?.score ?? "";
      out[`${k}_correct`] = stats.last ? `${stats.last.correct}/${stats.last.total}` : "";
      out[`${k}_time`] = formatSeconds(stats.last?.seconds);
      out[`${k}_passing`] = `${stats.settings?.passing_score ?? 80}%`;
      out[`${k}_last_date`] = fmtDate(stats.last?.row.created_at);
      out[`${k}_passed_date`] = fmtDate(stats.firstPass?.created_at);
      questions.forEach((q, qi) => {
        // A pergunta da última tentativa: pelo título (a ordem pode ser aleatória) e, em último caso, pela posição
        const item = stats.last?.items.find((i) => i.title === q.title) ?? stats.last?.items[qi];
        out[`${k}_q${qi}_result`] = item ? (item.is_correct ? t("Correct") : t("Incorrect")) : "";
        out[`${k}_q${qi}_answer`] = item ? asText(item.myAnswer) : "";
      });
    });
    return out;
  });

  return { rows, columns };
}
