require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const jwt = require("jsonwebtoken");
const { installFakeDb } = require("./helpers/fakeDb");
const { COOKIE_NAME, CSRF_HEADER_VALUE, IDLE_MINUTES, IDLE_GRACE_SECONDS } = require("../utils/session");

const person = { id: 7, name: "Ana", email: "ana@example.com", id_role: 3, id_lang: 3, password: "hash", is_deleted: 0, status: "approved" };
installFakeDb((sql) => (/FROM user WHERE id/.test(sql) ? [person] : []));
const express = require("express");
const { patchAsyncHandlers, errorHandler } = require("../utils/asyncErrors");
const { createToken, passwordFingerprint } = require("../utils/token");
patchAsyncHandlers();

const app = express();
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

const call = async (path, { token, headers = {}, body } = {}) => {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { cookie: `${COOKIE_NAME}=${token}` } : {}), ...headers },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // texto simples
  }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") || "" };
};
const web = { "x-requested-with": CSRF_HEADER_VALUE };
const tokenWith = (la) => jwt.sign({ id: 7, name: "Ana", email: person.email, pv: passwordFingerprint(person.password), la }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "3h" });
const now = () => Math.floor(Date.now() / 1000);

test("ping com sessão ativa renova o cookie HttpOnly e mantém o fim da sessão", async () => {
  const token = tokenWith(now() - 600);
  const exp = jwt.decode(token).exp;
  const res = await call("/auth/ping", { token, headers: web });
  assert.equal(res.status, 200);
  assert.equal(res.data.expires_at, exp);
  assert.match(res.setCookie, new RegExp(`${COOKIE_NAME}=`));
  assert.match(res.setCookie, /HttpOnly/i);
  assert.match(res.setCookie, /SameSite=Lax/i);
  const renewed = decodeURIComponent(res.setCookie.split(";")[0].split("=").slice(1).join("="));
  const decoded = jwt.decode(renewed);
  assert.equal(decoded.exp, exp);
  assert.ok(decoded.la >= now() - 2);
});

test("ping sem o cabeçalho da webapp (CSRF) é recusado", async () => {
  const res = await call("/auth/ping", { token: tokenWith(now()) });
  assert.equal(res.status, 403);
});

test("ping de uma sessão já inativa não a revive: 401 session_idle", async () => {
  const res = await call("/auth/ping", { token: tokenWith(now() - (IDLE_MINUTES * 60 + IDLE_GRACE_SECONDS + 60)), headers: web });
  assert.equal(res.status, 401);
  assert.equal(res.data.code, "session_idle");
  assert.equal(res.setCookie, "");
});

test("ping sem sessão ou com token inválido: 401", async () => {
  assert.equal((await call("/auth/ping", { headers: web })).status, 401);
  assert.equal((await call("/auth/ping", { token: "lixo", headers: web })).status, 401);
});

test("verifyToken com o cookie devolve o utilizador e quando a sessão termina, sem o token no corpo", async () => {
  const res = await call("/auth/verifyToken", { token: tokenWith(now()), headers: web });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.id, 7);
  assert.ok(res.data.session.expires_at > now());
  assert.equal(res.data.session.idle_minutes, IDLE_MINUTES);
  assert.equal(JSON.stringify(res.data).includes("eyJ"), false);
});

test("verifyToken com sessão inativa só devolve a identidade mínima (idle)", async () => {
  const res = await call("/auth/verifyToken", { token: tokenWith(now() - 3 * 3600 + 60 - (IDLE_MINUTES * 60 + IDLE_GRACE_SECONDS + 60)), headers: web });
  assert.equal(res.status, 200);
  assert.equal(res.data.idle, true);
  assert.deepEqual(Object.keys(res.data.user).sort(), ["email", "id", "name"]);
});

test("sessão antiga (token no corpo) passa a cookie HttpOnly", async () => {
  const legacy = await createToken(person);
  const res = await call("/auth/verifyToken", { body: { data: legacy } });
  assert.equal(res.status, 200);
  assert.match(res.setCookie, new RegExp(`${COOKIE_NAME}=`));
  assert.match(res.setCookie, /HttpOnly/i);
});

test("sessão antiga já inativa não é trocada por cookie", async () => {
  const res = await call("/auth/verifyToken", { body: { data: tokenWith(now() - (IDLE_MINUTES * 60 + IDLE_GRACE_SECONDS + 600)) } });
  assert.equal(res.status, 401);
  assert.equal(res.setCookie, "");
});

test("verifyToken sem sessão: 401", async () => {
  assert.equal((await call("/auth/verifyToken", {})).status, 401);
});

test("logout apaga o cookie", async () => {
  const res = await call("/auth/logout", { token: tokenWith(now()), headers: web });
  assert.equal(res.status, 200);
  assert.match(res.setCookie, new RegExp(`${COOKIE_NAME}=;`));
  assert.match(res.setCookie, /Expires=Thu, 01 Jan 1970/);
});
