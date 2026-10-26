require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const { installFakeDb } = require("./helpers/fakeDb");
installFakeDb(() => []);
const { courseSettings, isRestrictedCourse, countryLimit, visibleCourses, visibleTests, accessibleCourseIds } = require("../utils/courseAccess");

const admin = { id: 1, id_role: 1 };
const student = { id: 7, id_role: 3, country: "PT" };

test("courseSettings aceita JSON em texto, objeto e valores inválidos", () => {
  assert.deepEqual(courseSettings({ settings: '{"a":1}' }), { a: 1 });
  assert.deepEqual(courseSettings({ settings: { a: 2 } }), { a: 2 });
  assert.deepEqual(courseSettings({ settings: "{lixo" }), {});
  assert.deepEqual(courseSettings({}), {});
});

test("countryLimit só existe com o limite ligado e uma lista com países", () => {
  assert.equal(countryLimit({ settings: { country_limit: false, country: ["PT"] } }), null);
  assert.equal(countryLimit({ settings: { country_limit: true, country: [] } }), null);
  assert.deepEqual(countryLimit({ settings: { country_limit: true, country: ["PT", "ES"] } }), ["PT", "ES"]);
});

test("isRestrictedCourse", () => {
  assert.equal(isRestrictedCourse({ settings: { restrict_to_users: true } }), true);
  assert.equal(isRestrictedCourse({ settings: {} }), false);
});

test("visibleTests: o aluno só vê os testes do seu país; o admin vê todos", () => {
  const tests = [{ id: 1, settings: { country_limit: true, country: ["ES"] } }, { id: 2, settings: { country_limit: true, country: ["PT"] } }, { id: 3, settings: {} }];
  assert.deepEqual(visibleTests(tests, student).map((t) => t.id), [2, 3]);
  assert.deepEqual(visibleTests(tests, admin).map((t) => t.id), [1, 2, 3]);
  assert.deepEqual(visibleTests(tests, { id_role: 3, country: null }).map((t) => t.id), [3]);
});

test("visibleCourses: sem restrições devolve tudo sem consultar a base de dados", async () => {
  const query = async () => assert.fail("não devia consultar");
  const courses = [{ id: 1, settings: {} }, { id: 2 }];
  assert.deepEqual(await visibleCourses(query, courses, student), courses);
});

test("visibleCourses: limite de países e de utilizadores/grupos", async () => {
  const courses = [
    { id: 1, settings: {} },
    { id: 2, settings: { country_limit: true, country: ["ES"] } },
    { id: 3, settings: { country_limit: true, country: ["PT"] } },
    { id: 4, settings: { restrict_to_users: true } },
    { id: 5, settings: { restrict_to_users: true } },
    { id: 6, settings: { restrict_to_users: true, country_limit: true, country: ["ES"] } },
  ];
  const query = async (sql) => (/FROM user WHERE/.test(sql) ? [{ country: "PT" }] : [{ id_course: 4 }, { id_course: 6 }]);
  assert.deepEqual((await visibleCourses(query, courses, student)).map((c) => c.id), [1, 3, 4]);
  // O admin vê tudo
  assert.equal((await visibleCourses(query, courses, admin)).length, 6);
});

test("accessibleCourseIds sem utilizador ou sem as tabelas devolve um conjunto vazio", async () => {
  assert.equal((await accessibleCourseIds(async () => [], null)).size, 0);
  const missing = async () => {
    throw Object.assign(new Error("x"), { code: "ER_NO_SUCH_TABLE" });
  };
  assert.equal((await accessibleCourseIds(missing, 7)).size, 0);
});
