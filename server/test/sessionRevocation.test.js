require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const jwt = require("jsonwebtoken");
const { installFakeDb } = require("./helpers/fakeDb");
const { COOKIE_NAME, CSRF_HEADER_VALUE } = require("../utils/session");

const ana = { id: 7, name: "Ana", email: "ana@example.com", id_role: 2, id_lang: 3, password: "hash", is_deleted: 0, status: "approved" };
let override = null; // permite a um teste simular respostas da BD
const fake = installFakeDb((sql, params) => {
  if (override) return override(sql, params);
  return /FROM user WHERE id/.test(sql) ? [ana] : [];
});
const express = require("express");
const { patchAsyncHandlers, errorHandler } = require("../utils/asyncErrors");
const { createToken, verifyToken, passwordFingerprint } = require("../utils/token");
const middleware = require("../utils/middleware");
const revokedSessions = require("../utils/revokedSessions");
patchAsyncHandlers();

const app = express();
app.use(express.json());
app.use("/auth", require("../routes/auth"));
app.get("/protegida", middleware, (req, res) => res.send({ user: req.user.id }));
app.use(errorHandler);

let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const web = { "x-requested-with": CSRF_HEADER_VALUE };
const call = async (path, token, { method = "POST", headers = web } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(token ? { cookie: `${COOKIE_NAME}=${token}` } : {}), ...headers }, body: method === "POST" ? "{}" : undefined });
  return res.status;
};
const legacyToken = (extra = {}) => jwt.sign({ id: 7, name: "Ana", email: ana.email, pv: passwordFingerprint(ana.password), la: Math.floor(Date.now() / 1000), ...extra }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "12h" });

test("cada sessão tem o seu identificador (jti)", async () => {
  const a = jwt.decode(await createToken(ana));
  const b = jwt.decode(await createToken(ana));
  assert.ok(a.jti && b.jti);
  assert.notEqual(a.jti, b.jti);
});

test("depois do logout o token deixa de valer em todo o lado, mesmo dentro do prazo", async () => {
  const token = await createToken(ana);
  assert.equal(await call("/protegida", token, { method: "GET" }), 200);
  assert.equal(await call("/auth/verifyToken", token), 200);
  assert.equal(await call("/auth/ping", token), 200);

  assert.equal(await call("/auth/logout", token), 200);

  assert.equal(await call("/protegida", token, { method: "GET" }), 401);
  assert.equal(await call("/auth/verifyToken", token), 401);
  assert.equal(await call("/auth/ping", token), 401);
  assert.equal((await verifyToken(token)).token_valid, false);
});

test("terminar uma sessão não termina as outras da mesma pessoa", async () => {
  const desktop = await createToken(ana);
  const phone = await createToken(ana);
  await call("/auth/logout", desktop);
  assert.equal(await call("/protegida", desktop, { method: "GET" }), 401);
  assert.equal(await call("/protegida", phone, { method: "GET" }), 200);
});

test("o logout fica guardado na BD até ao fim da validade do token", async () => {
  fake.calls.length = 0;
  const token = await createToken(ana);
  const exp = jwt.decode(token).exp;
  await call("/auth/logout", token);
  const insert = fake.calls.find((c) => /INSERT INTO revoked_session/.test(c.sql));
  assert.ok(insert);
  assert.equal(insert.params[0], jwt.decode(token).jti);
  assert.equal(insert.params[1], exp);
});

test("sem a tabela (migração por correr) o logout continua a valer em memória", async () => {
  override = (sql) => {
    if (/revoked_session/.test(sql)) throw Object.assign(new Error("no table"), { code: "ER_NO_SUCH_TABLE" });
    return /FROM user WHERE id/.test(sql) ? [ana] : [];
  };
  try {
    const token = await createToken(ana);
    assert.equal(await call("/auth/logout", token), 200);
    assert.equal(await call("/protegida", token, { method: "GET" }), 401);
  } finally {
    override = null;
  }
});

test("sessões antigas (sem jti) também se terminam, pelo hash do token", async () => {
  const mine = legacyToken();
  const other = legacyToken({ la: Math.floor(Date.now() / 1000) - 5 }); // outra sessão antiga da mesma pessoa
  assert.equal(await call("/protegida", mine, { method: "GET" }), 200);
  await call("/auth/logout", mine);
  assert.equal(await call("/protegida", mine, { method: "GET" }), 401);
  assert.equal(await call("/protegida", other, { method: "GET" }), 200);
});

test("renovar a sessão (ping) dá um jti às sessões antigas, para o logout as apanhar", async () => {
  const res = await fetch(`${base}/auth/ping`, { method: "POST", headers: { "content-type": "application/json", cookie: `${COOKIE_NAME}=${legacyToken({ la: Math.floor(Date.now() / 1000) - 60 })}`, ...web }, body: "{}" });
  assert.equal(res.status, 200);
  const renewed = decodeURIComponent((res.headers.get("set-cookie") || "").split(";")[0].split("=").slice(1).join("="));
  assert.ok(jwt.decode(renewed).jti);
});

test("logout sem sessão, ou sem o cabeçalho da webapp com cookie, não rebenta e não termina nada", async () => {
  assert.equal(await call("/auth/logout", null), 200);
  const token = await createToken(ana);
  assert.equal(await call("/auth/logout", token, { headers: {} }), 200); // sem X-Requested-With: o cookie apaga-se mas a sessão não é terminada por um pedido de outro site
  assert.equal(await call("/protegida", token, { method: "GET", headers: web }), 200);
});

test("o arranque volta a carregar as sessões terminadas que ainda não expiraram", async () => {
  const later = Math.floor(Date.now() / 1000) + 3600;
  override = (sql) => (/FROM revoked_session WHERE expires_at > NOW\(\)/.test(sql) ? [{ jti: "sessao-de-antes-do-reinicio", exp: later }] : []);
  try {
    await revokedSessions.load();
  } finally {
    override = null;
  }
  assert.equal(revokedSessions.isRevoked({ jti: "sessao-de-antes-do-reinicio" }, "x"), true);
  assert.equal(revokedSessions.isRevoked({ jti: "outra" }, "x"), false);
});
