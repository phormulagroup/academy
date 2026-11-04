require("./helpers/env");
// Com TRUST_PROXY o IP é o de quem faz o pedido (cada teste "vem" de um IP através de X-Forwarded-For) e há limites por IP e por par e-mail + IP
process.env.TRUST_PROXY = "1";
delete process.env.CLIENT_IP_HEADER;
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const bcrypt = require("bcryptjs");
const { installFakeDb } = require("./helpers/fakeDb");

const ana = { id: 7, name: "Ana", email: "ana@example.com", id_role: 2, id_lang: 3, password: bcrypt.hashSync("SenhaCerta123", 4), is_deleted: 0, status: "approved", recover_code: null };
const fake = installFakeDb((sql, params) => {
  if (/SHOW TABLES LIKE 'security_block'/.test(sql)) return []; // contadores em memória
  if (/FROM user WHERE email = \?/.test(sql)) return params[0] === ana.email ? [ana] : [];
  return [];
});
// recover/register usam transações
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

let nextIp = 10;
const newIp = () => `203.0.113.${nextIp++}`;
const call = async (path, data, ip) => {
  const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ data }) });
  return { status: res.status, body: await res.json() };
};
const login = (email, password, ip) => call("/auth/login", { email, password }, ip);

test("e-mail inexistente e password errada recebem exatamente a mesma resposta", async () => {
  const ip = newIp();
  const unknown = await login("ninguem@example.com", "qualquer", ip);
  const wrong = await login("ana@example.com", "errada", ip);
  assert.equal(unknown.status, 200);
  assert.deepEqual(unknown.body, wrong.body);
  assert.deepEqual(wrong.body, { user: null, message: "The e-mail or password is not correct, try again." });
});

test("e-mail que não é texto (objeto, lista, número) não rebenta nem revela nada: a mesma resposta", async () => {
  const ip = newIp();
  for (const email of [{ email: "1" }, ["ana@example.com"], 42, null, undefined]) {
    const res = await login(email, "x", ip);
    assert.equal(res.status, 200, JSON.stringify(email));
    assert.equal(res.body.message, "The e-mail or password is not correct, try again.");
  }
  const noPassword = await call("/auth/login", { email: "ana@example.com", password: { a: 1 } }, ip);
  assert.equal(noPassword.body.message, "The e-mail or password is not correct, try again.");
});

test("testar e-mails inexistentes também conta: ao fim de 30 falhas o IP é bloqueado (e outro IP não)", async () => {
  const ip = newIp();
  const statuses = [];
  for (let i = 0; i < 30; i++) statuses.push((await login(`inexistente${i}@example.com`, "x", ip)).status);
  assert.deepEqual([...new Set(statuses.slice(0, 29))], [200]);
  assert.equal(statuses[29], 429);
  const blocked = await login("outro@example.com", "x", ip);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.limit, "login");
  assert.ok(blocked.body.retry_after > 0);
  // Outro IP não é afetado
  assert.equal((await login("outro@example.com", "x", newIp())).status, 200);
});

test("quem erra a password dez vezes bloqueia-se a si, não a conta: o dono, de outro IP, continua a poder tentar", async () => {
  const attacker = newIp();
  const owner = newIp();
  let last;
  for (let i = 0; i < 10; i++) last = await login("ana@example.com", `errada${i}`, attacker);
  assert.equal(last.status, 429, "o atacante fica bloqueado à 10.ª falha");
  assert.equal((await login("ana@example.com", "errada", attacker)).status, 429);
  const fromOwner = await login("ana@example.com", "errada-do-dono", owner);
  assert.equal(fromOwner.status, 200, "o dono não está bloqueado pelas falhas de outro IP");
  assert.equal(fromOwner.body.message, "The e-mail or password is not correct, try again.");
});

test("vários IPs contra a mesma conta: ao fim de 30 falhas no total a conta fecha para todos", async () => {
  const victimEmail = "ana@example.com";
  // Os 10 do teste anterior já contam; novos IPs somam até ao limite do e-mail
  let blocked = false;
  for (let i = 0; i < 40 && !blocked; i++) blocked = (await login(victimEmail, `x${i}`, newIp())).status === 429;
  assert.equal(blocked, true);
  assert.equal((await login(victimEmail, "errada", newIp())).status, 429);
});

test("recuperar a password de um e-mail sem conta responde como a quem recebeu o código (status true)", async () => {
  const ip = newIp();
  const unknown = await call("/auth/recover", { email: "ninguem@example.com" }, ip);
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.status, true);
  assert.equal(unknown.body.message, undefined);
});

test("verificar um código de recuperação de uma conta que não existe é igual a um código errado, e conta as tentativas", async () => {
  const ip = newIp();
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await call("/auth/verifyRecoverCode", { email: "ninguem@example.com", code: "ABC123" }, ip));
  assert.deepEqual(results.slice(0, 4).map((r) => [r.status, r.body.message]), Array(4).fill([200, "The recover code is not correct, try again."]));
  assert.equal(results[4].status, 429);
  // Não se descobre pela mensagem se a conta existe: uma conta real, sem código pedido, responde igual
  const real = await call("/auth/verifyRecoverCode", { email: "ana@example.com", code: "ABC123" }, newIp());
  assert.equal(real.body.message, "The recover code is not correct, try again.");
});
