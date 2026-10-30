const test = require("node:test");
const assert = require("node:assert/strict");
const { attemptsFor, defaultTestSettings, courseLanguageCode, settingsForLanguage } = require("../utils/testDefaults");

test("tentativas por idioma: pt e fr 1, es e en 2, outros sem limite", () => {
  assert.equal(attemptsFor("pt"), 1);
  assert.equal(attemptsFor("fr"), 1);
  assert.equal(attemptsFor("es"), 2);
  assert.equal(attemptsFor("en"), 2);
  assert.equal(attemptsFor("EN"), 2);
  assert.equal(attemptsFor("de"), undefined);
  assert.equal(attemptsFor(undefined), undefined);
});

test("um teste novo tem 45 minutos, 75% e as tentativas do idioma", () => {
  assert.deepEqual(defaultTestSettings("pt"), { time: 45, passing_score: 75, retries_allowed: 1, randomize_answers: false, randomize_questions: false, show_correct_answers: false });
  assert.equal(defaultTestSettings("es").retries_allowed, 2);
  assert.equal(defaultTestSettings("fr").retries_allowed, 1);
  assert.equal(defaultTestSettings("en").retries_allowed, 2);
});

test("num idioma sem regra o teste novo fica sem limite de tentativas (não se inventa um)", () => {
  const settings = defaultTestSettings("de");
  assert.equal("retries_allowed" in settings, false);
  assert.equal(settings.time, 45);
  assert.equal(settings.passing_score, 75);
});

test("courseLanguageCode lê o código do idioma do curso", async () => {
  let seen;
  assert.equal(await courseLanguageCode(async (sql, params) => ((seen = params), [{ code: "es" }]), 12), "es");
  assert.deepEqual(seen, [12]);
  assert.equal(await courseLanguageCode(async () => [], 12), undefined);
});

test("copiar um teste para outro idioma só muda as tentativas", () => {
  const original = JSON.stringify({ time: 30, passing_score: 80, retries_allowed: 1, randomize_answers: true });
  assert.deepEqual(JSON.parse(settingsForLanguage(original, "en")), { time: 30, passing_score: 80, retries_allowed: 2, randomize_answers: true });
  assert.deepEqual(JSON.parse(settingsForLanguage(original, "fr")).retries_allowed, 1);
  assert.equal(settingsForLanguage(original, "de"), original);
  assert.equal(settingsForLanguage("{lixo", "en"), "{lixo");
  assert.deepEqual(JSON.parse(settingsForLanguage(null, "pt")), { retries_allowed: 1 });
});
