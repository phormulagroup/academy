require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { installFakeDb, fakeReq, fakeRes } = require("./helpers/fakeDb");
const { COOKIE_NAME, CSRF_HEADER_VALUE, IDLE_MINUTES, IDLE_GRACE_SECONDS } = require("../utils/session");
const { createToken, passwordFingerprint } = require("../utils/token");

const row = { id: 7, id_role: 3, id_lang: 3, country: "PT", is_deleted: 0, password: "hash" };
const person = { id: 7, name: "Ana", email: "ana@example.com", id_role: 3, id_lang: 3, password: "hash" };
let userRow = row;
installFakeDb(() => (userRow ? [userRow] : []));
const middleware = require("../utils/middleware");
const { clear } = require("../utils/authCache");

async function run(req) {
  clear();
  const res = fakeRes();
  let nextCalled = false;
  await middleware(req, res, () => (nextCalled = true));
  return { res, nextCalled };
}
const cookieReq = (token, extra = {}) => fakeReq({ headers: { cookie: `${COOKIE_NAME}=${token}`, ...extra.headers }, method: extra.method });

test("sem sessão: 403", async () => {
  userRow = row;
  const { res, nextCalled } = await run(fakeReq());
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("cookie válido: segue e identifica o utilizador pela base de dados", async () => {
  userRow = row;
  const { nextCalled } = await run(cookieReq(await createToken(person)));
  assert.equal(nextCalled, true);
});

test("cabeçalho Authorization continua a funcionar (ferramentas e sessões antigas)", async () => {
  userRow = row;
  const req = fakeReq({ headers: { authorization: await createToken(person) }, method: "POST" });
  const { nextCalled } = await run(req);
  assert.equal(nextCalled, true);
  assert.deepEqual({ id: req.user.id, id_role: req.user.id_role }, { id: 7, id_role: 3 });
});

test("pedido que altera dados com cookie sem o cabeçalho da webapp: 403 (CSRF)", async () => {
  userRow = row;
  const token = await createToken(person);
  const blocked = await run(cookieReq(token, { method: "POST" }));
  assert.equal(blocked.res.statusCode, 403);
  assert.equal(blocked.nextCalled, false);
  const ok = await run(cookieReq(token, { method: "POST", headers: { "x-requested-with": CSRF_HEADER_VALUE } }));
  assert.equal(ok.nextCalled, true);
});

test("sessão inativa há mais do que o limite: 401 session_idle", async () => {
  userRow = row;
  const la = Math.floor(Date.now() / 1000) - (IDLE_MINUTES * 60 + IDLE_GRACE_SECONDS + 30);
  const token = jwt.sign({ id: 7, pv: passwordFingerprint("hash"), la }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  const { res, nextCalled } = await run(cookieReq(token));
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "session_idle");
  assert.equal(nextCalled, false);
});

test("atividade recente dentro do limite: passa", async () => {
  userRow = row;
  const la = Math.floor(Date.now() / 1000) - 10 * 60;
  const token = jwt.sign({ id: 7, pv: passwordFingerprint("hash"), la }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  assert.equal((await run(cookieReq(token))).nextCalled, true);
});

test("token válido de um utilizador apagado ou inexistente: 401", async () => {
  const token = await createToken(person);
  userRow = { ...row, is_deleted: 1 };
  assert.equal((await run(cookieReq(token))).res.statusCode, 401);
  userRow = null;
  assert.equal((await run(cookieReq(token))).res.statusCode, 401);
});

test("token emitido antes de mudar a password: 401", async () => {
  const token = await createToken(person);
  userRow = { ...row, password: "hash-novo" };
  assert.equal((await run(cookieReq(token))).res.statusCode, 401);
});

test("token com assinatura inválida: 401", async () => {
  userRow = row;
  const forged = jwt.sign({ id: 7 }, "outro-segredo-outro-segredo-outro-segredo-12", { algorithm: "HS256" });
  assert.equal((await run(cookieReq(forged))).res.statusCode, 401);
});
