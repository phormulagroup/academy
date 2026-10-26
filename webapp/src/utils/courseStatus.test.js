import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  parseSettings,
  testsForStudent,
  isTestFailed,
  isCourseFailed,
  courseDateState,
  testDateState,
  isMissedExpiredTest,
  previousRequiredItem,
  isAllowedByCountry,
  itemCountsLabel,
} from "./courseStatus";

const NOW = new Date("2026-10-20T12:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const done = (id, extra = {}) => ({ activity_type: "test", id_course_test: id, is_completed: 1, is_deleted: 0, ...extra });
const failedTry = (id) => ({ activity_type: "test", id_course_test: id, is_completed: 0, is_deleted: 0 });

describe("parseSettings", () => {
  it("aceita objeto, JSON em texto e valores inválidos", () => {
    expect(parseSettings({ a: 1 })).toEqual({ a: 1 });
    expect(parseSettings('{"a":2}')).toEqual({ a: 2 });
    expect(parseSettings("{lixo")).toEqual({});
    expect(parseSettings(null)).toEqual({});
  });
});

describe("testsForStudent", () => {
  const tests = [
    { id: 1, settings: { country_limit: true, country: ["ES"] } },
    { id: 2, settings: '{"country_limit":true,"country":["PT"]}' },
    { id: 3, settings: {} },
  ];
  it("o aluno só vê os testes do seu país", () => {
    expect(testsForStudent(tests, { id_role: 3, country: "PT" }).map((t) => t.id)).toEqual([2, 3]);
  });
  it("o Admin vê todos", () => {
    expect(testsForStudent(tests, { id_role: 1, country: "PT" })).toHaveLength(3);
  });
});

describe("isTestFailed / isCourseFailed", () => {
  const test = { id: 5, settings: { retries_allowed: 2 } };
  it("reprova ao esgotar as tentativas sem nenhuma aprovada", () => {
    expect(isTestFailed([failedTry(5)], test)).toBe(false);
    expect(isTestFailed([failedTry(5), failedTry(5)], test)).toBe(true);
  });
  it("uma tentativa aprovada nunca reprova", () => {
    expect(isTestFailed([failedTry(5), failedTry(5), done(5)], test)).toBe(false);
  });
  it("tentativas apagadas e de outros testes não contam", () => {
    expect(isTestFailed([failedTry(5), { ...failedTry(5), is_deleted: 1 }, failedTry(6)], test)).toBe(false);
  });
  it("sem limite de tentativas não reprova", () => {
    expect(isTestFailed([failedTry(1), failedTry(1), failedTry(1)], { id: 1, settings: {} })).toBe(false);
  });
  it("o curso reprova se algum teste reprovar", () => {
    expect(isCourseFailed([failedTry(5), failedTry(5)], [{ id: 9, settings: {} }, test])).toBe(true);
    expect(isCourseFailed([], [test])).toBe(false);
  });
});

describe("datas", () => {
  it("curso: ainda não abriu, aberto e fechado", () => {
    const course = (start, end) => ({ settings: { course_access_expiration: true, course_access_expiration_dates: { start_date: start, end_date: end } } });
    expect(courseDateState(course("2026-11-01", null))).toBe("upcoming");
    expect(courseDateState(course("2026-10-01", "2026-12-01"))).toBe("active");
    expect(courseDateState(course("2026-09-01", "2026-10-10"))).toBe("expired");
    expect(courseDateState({ settings: {} })).toBe("active");
  });
  it("teste: antes, durante e depois da janela", () => {
    expect(testDateState({ settings: { start_date: "2026-11-01" } })).toBe("upcoming");
    expect(testDateState({ settings: { start_date: "2026-10-01", end_date: "2026-12-01" } })).toBe("active");
    expect(testDateState({ settings: { end_date: "2026-10-10" } })).toBe("expired");
    expect(testDateState({})).toBe("active");
  });
});

describe("testes expirados (a pessoa não pode concluir o curso sem o teste)", () => {
  const expired = { type: "test", id: 7, settings: { end_date: "2026-10-10" } };
  it("expirado e por fazer conta como perdido", () => {
    expect(isMissedExpiredTest(expired, [])).toBe(true);
  });
  it("expirado mas já concluído não é perdido", () => {
    expect(isMissedExpiredTest(expired, [done(7)])).toBe(false);
  });
  it("uma conclusão apagada não vale", () => {
    expect(isMissedExpiredTest(expired, [done(7, { is_deleted: 1 })])).toBe(true);
  });
  it("tópicos e testes dentro do prazo nunca são perdidos", () => {
    expect(isMissedExpiredTest({ type: "topic", id: 1 }, [])).toBe(false);
    expect(isMissedExpiredTest({ type: "test", id: 8, settings: { end_date: "2026-12-01" } }, [])).toBe(false);
  });
  it("previousRequiredItem salta os testes expirados por fazer", () => {
    const items = [{ type: "topic", id: 1 }, expired, { type: "topic", id: 3 }];
    expect(previousRequiredItem(items, 2, []).id).toBe(1);
    expect(previousRequiredItem(items, 2, [done(7)]).id).toBe(7);
    expect(previousRequiredItem(items, 0, [])).toBeNull();
  });
});

describe("isAllowedByCountry", () => {
  it("sem restrição, todos; com restrição, só esses países; o Admin sempre", () => {
    expect(isAllowedByCountry([], { country: "PT" })).toBe(true);
    expect(isAllowedByCountry(["ES"], { id_role: 3, country: "PT" })).toBe(false);
    expect(isAllowedByCountry(["PT"], { id_role: 3, country: "PT" })).toBe(true);
    expect(isAllowedByCountry(["ES"], { id_role: 1, country: "PT" })).toBe(true);
  });
});

describe("itemCountsLabel", () => {
  const t = (s) => s;
  it("conta tópicos e testes, com singular e plural", () => {
    expect(itemCountsLabel([{ type: "topic" }, { type: "test" }, { type: "test" }], t)).toBe("1 topic | 2 tests");
  });
});
