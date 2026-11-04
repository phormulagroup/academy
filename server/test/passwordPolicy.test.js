require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const bcrypt = require("bcryptjs");
const { isStrongPassword, PASSWORD_MESSAGE } = require("../utils/passwordPolicy");
const { installFakeDb } = require("./helpers/fakeDb");

const ana = { id: 7, name: "Ana", email: "ana@example.com", id_role: 2, id_lang: 3, password: bcrypt.hashSync("Antiga#123", 4), is_deleted: 0, status: "approved", recover_code: bcrypt.hashSync("ABC123", 4), recover_code_expires: null };
const fake = installFakeDb((sql, params) => {
  if (/SHOW TABLES LIKE 'security_block'/.test(sql)) return [];
  if (/SELECT country FROM language/.test(sql)) return [{ country: '["Portugal"]' }];
  if (/recover_code_expires < NOW\(\)/.test(sql)) return params[0] === ana.email ? [{ ...ana, code_expired: 0 }] : [];
  if (/FROM user WHERE email = \?/.test(sql)) return [];
  return [];
});
fake.getConnection = (cb) => cb(null, { query: fake.query, beginTransaction: (done) => done(null), commit: (done) => done(null), rollback: (done) => done(null), release() {} });

const express = require("express");
const { patchAsyncHandlers, errorHandler } = require("../utils/asyncErrors");
patchAsyncHandlers();
const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use("/auth", require("../routes/auth"));
app.use(errorHandler);
let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
const post = async (path, data) => {
  const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" }, body: JSON.stringify({ data }) });
  return { status: res.status, body: await res.json() };
};

test("a regra: pelo menos 8 caracteres, com um número e um caráter especial", () => {
  for (const ok of ["Abcdef1!", "abc123!!", "Pass-word-9", "12345678#", "Olá1234€", "A b c 1 2 3 !", "ção#2024X"]) assert.equal(isStrongPassword(ok), true, ok);
  const weak = { "Ab1!": "curta", abcdefgh: "só letras", abcdefg1: "sem especial", "abcdefg!": "sem número", "12345678": "só números", "!!!!!!!!": "só especiais", "Olá  1234": "o espaço e as letras acentuadas não são especiais", "1234 5678": "espaço não conta" };
  for (const [password, why] of Object.entries(weak)) assert.equal(isStrongPassword(password), false, `${password} (${why})`);
  for (const bad of [undefined, null, 12345678, ["Abcdef1!"], { a: 1 }, ""]) assert.equal(isStrongPassword(bad), false);
});

test("recuperar a password: uma fraca é recusada (mesmo com o código certo) e uma forte é aceite", async () => {
  for (const password of ["abcdefgh", "abcdefg1", "abcdefg!", "123456!"]) {
    const res = await post("/auth/password", { email: "ana@example.com", code: "ABC123", password });
    assert.equal(res.status, 400, password);
    assert.deepEqual(res.body, { status: false, message: PASSWORD_MESSAGE });
  }
  fake.calls.length = 0;
  const ok = await post("/auth/password", { email: "ana@example.com", code: "ABC123", password: "Nova-Pass9" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, true);
  assert.ok(fake.calls.some((c) => /UPDATE user SET recover_code = NULL/.test(c.sql)));
});

test("registo: a password fraca marca o campo password como inválido", async () => {
  const valid = { first_name: "Ana", last_name: "Silva", email: "nova@example.com", gender: "Female", academic_background: "PhD", birth_date: "1990-01-01", bial_starting_date: "2020-01-01", country: "Portugal", id_lang: 3 };
  const weak = await post("/auth/register", { ...valid, password: "senhasenha" });
  assert.equal(weak.body.message, "Some fields are missing");
  assert.deepEqual(weak.body.fields, ["password"]);
  fake.calls.length = 0;
  const strong = await post("/auth/register", { ...valid, password: "Senha#2026" });
  assert.equal(strong.body.fields, undefined);
  assert.ok(fake.calls.some((c) => /^INSERT INTO user/.test(c.sql)), "uma password forte cria a conta");
});
