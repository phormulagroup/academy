require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { wallToInstant, parseInstant, instantToWall, testWindow, testState, countryTimeZone } = require("../utils/testSchedule");
const zones = require("../utils/countryTimezones.json");

const iso = (ms) => new Date(ms).toISOString();

test("hora de Lisboa: inverno = UTC, verão = UTC+1", () => {
  assert.equal(iso(parseInstant("2026-12-10T10:00")), "2026-12-10T10:00:00.000Z");
  assert.equal(iso(parseInstant("2026-07-01T10:00")), "2026-07-01T09:00:00.000Z");
});

test("a passagem para a hora de verão (último domingo de março) resolve-se bem", () => {
  // 29/03/2026: à 01:00 UTC os relógios de Lisboa passam das 01:00 para as 02:00
  assert.equal(iso(parseInstant("2026-03-29T00:59")), "2026-03-29T00:59:00.000Z");
  assert.equal(iso(parseInstant("2026-03-29T02:00")), "2026-03-29T01:00:00.000Z");
  // e a de inverno (25/10/2026): 01:30 existe duas vezes; fica a primeira (verão) ou a segunda, mas nunca fora da hora
  assert.equal(instantToWall(parseInstant("2026-10-25T12:00")), "2026-10-25T12:00");
});

test("datas com Z ou desvio são absolutas; sem fuso seguem o fuso dado", () => {
  assert.equal(iso(parseInstant("2026-10-28T13:54:00.000Z")), "2026-10-28T13:54:00.000Z");
  assert.equal(iso(parseInstant("2026-10-28T13:54:00+01:00")), "2026-10-28T12:54:00.000Z");
  assert.equal(iso(parseInstant("2026-12-10T10:00", "Africa/Luanda")), "2026-12-10T09:00:00.000Z");
  assert.equal(iso(parseInstant("2026-12-10 10:00:30")), "2026-12-10T10:00:00.000Z");
});

test("valores vazios ou inválidos dão null", () => {
  for (const v of [null, undefined, "", "lixo"]) assert.equal(parseInstant(v), null);
});

test("ida e volta entre instante e hora de parede", () => {
  for (const tz of ["Europe/Lisbon", "Africa/Luanda", "America/Sao_Paulo", "Asia/Dubai"]) {
    const ms = wallToInstant(2026, 11, 3, 9, 30, tz);
    assert.equal(instantToWall(ms, tz), "2026-11-03T09:30");
  }
});

test("testWindow: sem datas próprias vale a de Lisboa; com datas do país, essas mandam (cada lado à parte)", () => {
  const settings = { start_date: "2026-12-10T10:00", end_date: "2026-12-20T18:00", country_dates: { Angola: { start_date: "2026-12-10T09:00" } } };
  const base = testWindow(settings, "Portugal", zones);
  assert.equal(iso(base.start), "2026-12-10T10:00:00.000Z");
  assert.equal(iso(base.end), "2026-12-20T18:00:00.000Z");
  const angola = testWindow(settings, "Angola", zones);
  assert.equal(iso(angola.start), "2026-12-10T08:00:00.000Z"); // 09:00 em Luanda (UTC+1)
  assert.equal(iso(angola.end), "2026-12-20T18:00:00.000Z"); // o fim segue o de Lisboa
  assert.deepEqual(testWindow({}, "Angola", zones), { start: null, end: null });
  assert.deepEqual(testWindow('{"end_date":"2026-12-20T18:00"}', undefined, zones).start, null);
});

test("testState: antes, durante e depois da janela", () => {
  const settings = { start_date: "2026-12-10T10:00", end_date: "2026-12-20T18:00" };
  const at = (s) => Date.parse(s);
  assert.equal(testState(settings, "Portugal", zones, at("2026-12-10T09:59:59Z")), "upcoming");
  assert.equal(testState(settings, "Portugal", zones, at("2026-12-10T10:00:00Z")), "active");
  assert.equal(testState(settings, "Portugal", zones, at("2026-12-20T18:00:00Z")), "active");
  assert.equal(testState(settings, "Portugal", zones, at("2026-12-20T18:00:01Z")), "expired");
  assert.equal(testState({}, "Portugal", zones), "active");
});

test("um país com data própria abre na sua hora local (Moçambique, UTC+2, abre antes de Lisboa)", () => {
  const settings = { start_date: "2026-12-10T10:00", country_dates: { Mozambique: { start_date: "2026-12-10T10:00" } } };
  // 10:00 em Maputo (UTC+2) = 08:00Z, antes das 10:00Z de Lisboa
  assert.equal(testState(settings, "Mozambique", zones, Date.parse("2026-12-10T08:30:00Z")), "active");
  assert.equal(testState(settings, "Portugal", zones, Date.parse("2026-12-10T08:30:00Z")), "upcoming");
});

test("países sem fuso conhecido usam Lisboa; todos os países dos idiomas têm fuso válido", () => {
  assert.equal(countryTimeZone("Atlantis", zones), "Europe/Lisbon");
  for (const tz of Object.values(zones)) assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: tz }));
});

test("o código do servidor e o da webapp são o mesmo (e as tabelas de fusos também)", () => {
  const strip = (s) => s.replace(/^export /gm, "").replace(/module\.exports = \{[^}]*\};\n?/, "").trim();
  const server = fs.readFileSync(path.join(__dirname, "..", "utils", "testSchedule.js"), "utf8");
  const web = fs.readFileSync(path.join(__dirname, "..", "..", "webapp", "src", "utils", "testSchedule.js"), "utf8");
  assert.equal(strip(server), strip(web));
  assert.deepEqual(zones, JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "webapp", "src", "utils", "countryTimezones.json"), "utf8")));
});
