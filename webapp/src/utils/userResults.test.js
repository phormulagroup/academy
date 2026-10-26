import { describe, expect, it } from "vitest";
import { courseStats, testResult, formatSeconds, reportCourseItems, reportCourseState, activityByStudentCourse } from "./userResults";

const topic = (id) => ({ type: "topic", id });
const test = (id, settings = {}) => ({ type: "test", id, settings });
const doneTopic = (id, at = "2026-10-01T10:00:00Z") => ({ activity_type: "topic", id_course_topic: id, is_completed: 1, is_deleted: 0, created_at: at });
const doneTest = (id, at = "2026-10-02T10:00:00Z") => ({ activity_type: "test", id_course_test: id, is_completed: 1, is_deleted: 0, created_at: at });
const course = (allItems, progress, modules = []) => ({ allItems, progress, modules });

describe("courseStats", () => {
  it("curso sem atividade: não iniciado, 0%", () => {
    const stats = courseStats(course([topic(1), test(2)], []));
    expect(stats).toMatchObject({ status: "not_started", percent: 0, hasCertificate: false, startedAt: null });
  });

  it("inscrito sem itens feitos já está em curso", () => {
    const enroll = { activity_type: "enroll", is_completed: 1, created_at: "2026-10-01T09:00:00Z" };
    const stats = courseStats(course([topic(1)], [enroll]));
    expect(stats.status).toBe("in_progress");
    expect(stats.startedAt).toBe("2026-10-01T09:00:00Z");
  });

  it("percentagem pelos itens concluídos, arredondada às centésimas", () => {
    const stats = courseStats(course([topic(1), topic(2), test(3)], [doneTopic(1)]));
    expect(stats.percent).toBe(33.33);
    expect(stats.topicsDone).toBe(1);
    expect(stats.testsDone).toBe(0);
  });

  it("aprovado só com todos os itens, e o teste expirado por fazer impede a conclusão", () => {
    const items = [topic(1), test(2, { end_date: "2020-01-01" })];
    expect(courseStats(course(items, [doneTopic(1)])).status).toBe("in_progress");
    const all = courseStats(course(items, [doneTopic(1, "2026-10-01T10:00:00Z"), doneTest(2, "2026-10-03T10:00:00Z")]));
    expect(all).toMatchObject({ status: "completed", percent: 100, hasCertificate: true, completedAt: "2026-10-03T10:00:00Z" });
  });

  it("um item repetido em dois módulos conta uma só vez e registos apagados não contam", () => {
    const stats = courseStats(course([topic(1), topic(1), topic(2)], [doneTopic(1), { ...doneTopic(2), is_deleted: 1 }]));
    expect(stats.topicsTotal).toBe(2);
    expect(stats.topicsDone).toBe(1);
    expect(stats.percent).toBe(50);
  });

  it("módulo concluído quando todos os seus itens estão feitos", () => {
    const modules = [{ items: [topic(1)] }, { items: [topic(2)] }, { items: [] }];
    expect(courseStats(course([topic(1), topic(2)], [doneTopic(1)], modules)).modulesDone).toBe(1);
  });
});

describe("testResult", () => {
  const attempt = (completed, meta) => ({ activity_type: "test", id_course_test: 9, is_completed: completed, meta_data: JSON.stringify(meta) });

  it("sem tentativas: não iniciado, com a nota mínima por omissão (75)", () => {
    expect(testResult(course([], []), { id: 9, settings: "{}" })).toMatchObject({ status: "not_started", passingScore: 75, maxTries: 0 });
  });

  it("aprovado, em curso e reprovado (tentativas esgotadas)", () => {
    const t = { id: 9, settings: { retries_allowed: 2, passing_score: 80 } };
    expect(testResult(course([], [attempt(1, {})]), t).status).toBe("passed");
    expect(testResult(course([], [attempt(0, {})]), t).status).toBe("in_progress");
    expect(testResult(course([], [attempt(0, {}), attempt(0, {})]), t)).toMatchObject({ status: "not_passed", maxTries: 2, passingScore: 80 });
  });

  it("conta as respostas certas e não dá tempo a testes concluídos pelo Admin", () => {
    const items = [{ is_correct: true }, { is_correct: false }, { is_correct: true }];
    const result = testResult(course([], [attempt(1, { items, time: 120 }), attempt(1, { items, completed_by_admin: true })]), { id: 9, settings: {} });
    expect(result.tries[0]).toMatchObject({ correct: 2, totalAnswers: 3, seconds: 120 });
    expect(result.tries[1].seconds).toBeNull();
  });
});

describe("formatSeconds", () => {
  it("segundos, minutos e sem valor", () => {
    expect(formatSeconds(45)).toBe("45 s");
    expect(formatSeconds(125)).toBe("2 min");
    expect(formatSeconds(null)).toBe("-");
  });
});

describe("relatórios", () => {
  const data = {
    topics: [{ id: 1 }, { id: 2 }],
    tests: [{ id: 5, status: "published", settings: { retries_allowed: 1 } }, { id: 6, status: "draft" }],
    modules: [{ id_course: 10, items: JSON.stringify([{ type: "topic", id: 1 }, { type: "topic", id: 2 }, { type: "test", id: 5 }, { type: "test", id: 6 }, { type: "topic", id: 99 }]) }],
  };

  it("só contam os itens que existem e os testes que não são rascunho", () => {
    const entry = reportCourseItems(data).get(10);
    expect([...entry.keys].sort()).toEqual(["test-5", "topic-1", "topic-2"]);
    expect(entry.tests.map((t) => t.id)).toEqual([5]);
  });

  it("estado do aluno: percentagem, concluído e reprovado", () => {
    const entry = reportCourseItems(data).get(10);
    const t1 = { activity_type: "topic", id_course_topic: 1, is_completed: 1, is_deleted: 0 };
    const t2 = { activity_type: "topic", id_course_topic: 2, is_completed: 1, is_deleted: 0 };
    const passed = { activity_type: "test", id_course_test: 5, is_completed: 1, is_deleted: 0 };
    const failed = { activity_type: "test", id_course_test: 5, is_completed: 0, is_deleted: 0 };
    expect(reportCourseState(entry, [t1])).toEqual({ percent: 33, completed: false, failed: false });
    expect(reportCourseState(entry, [t1, t2, passed])).toEqual({ percent: 100, completed: true, failed: false });
    expect(reportCourseState(entry, [t1, failed])).toMatchObject({ completed: false, failed: true });
    expect(reportCourseState(undefined, [])).toEqual({ percent: 0, completed: false, failed: false });
  });

  it("atividade agrupada só de alunos aprovados e sem registos apagados", () => {
    const { students, map } = activityByStudentCourse({
      users: [
        { id: 1, id_role: 2, status: "Approved" },
        { id: 2, id_role: 2, status: "pending" },
        { id: 3, id_role: 1, status: "approved" },
      ],
      activity: [
        { id_user: 1, id_course: 10, id: "a" },
        { id_user: 1, id_course: 10, id: "b", is_deleted: 1 },
        { id_user: 2, id_course: 10, id: "c" },
        { id_user: 3, id_course: 10, id: "d" },
      ],
    });
    expect([...students]).toEqual([1]);
    expect(map.get(1).get(10).map((a) => a.id)).toEqual(["a"]);
    expect(map.has(2)).toBe(false);
  });
});
