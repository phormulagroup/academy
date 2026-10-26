require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCookies, readSession, csrfOk, isIdle, IDLE_MINUTES, IDLE_GRACE_SECONDS, COOKIE_NAME, CSRF_HEADER_VALUE, setSessionCookie, clearSessionCookie } = require("../utils/session");
const { fakeReq, fakeRes } = require("./helpers/fakeDb");

test("parseCookies lê vários cookies e ignora o que está mal formado", () => {
  assert.deepEqual(parseCookies("a=1; b=dois%20tres; c"), { a: "1", b: "dois tres" });
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies("x=%E0%A4%A"), {});
});

test("parseCookies: o primeiro valor de um nome repetido é o que vale", () => {
  assert.equal(parseCookies("s=primeiro; s=segundo").s, "primeiro");
});

test("readSession prefere o cookie ao cabeçalho Authorization", () => {
  const req = fakeReq({ headers: { cookie: `${COOKIE_NAME}=do-cookie`, authorization: "do-cabecalho" } });
  assert.deepEqual(readSession(req), { token: "do-cookie", source: "cookie" });
});

test("readSession aceita o cabeçalho quando não há cookie, e devolve null sem sessão", () => {
  assert.deepEqual(readSession(fakeReq({ headers: { authorization: "tok" } })), { token: "tok", source: "header" });
  assert.equal(readSession(fakeReq()), null);
});

test("csrfOk: com cookie, só pedidos que alteram dados precisam do cabeçalho da webapp", () => {
  assert.equal(csrfOk(fakeReq({ method: "GET" }), "cookie"), true);
  assert.equal(csrfOk(fakeReq({ method: "POST" }), "cookie"), false);
  assert.equal(csrfOk(fakeReq({ method: "POST", headers: { "X-Requested-With": "outro" } }), "cookie"), false);
  assert.equal(csrfOk(fakeReq({ method: "POST", headers: { "X-Requested-With": CSRF_HEADER_VALUE } }), "cookie"), true);
  // Com o cabeçalho Authorization não há CSRF (o browser não o envia sozinho)
  assert.equal(csrfOk(fakeReq({ method: "POST" }), "header"), true);
});

test("isIdle: respeita o limite com a margem", () => {
  const now = Date.now();
  const limit = IDLE_MINUTES * 60 + IDLE_GRACE_SECONDS;
  assert.equal(isIdle(now / 1000 - 60, now), false);
  assert.equal(isIdle(now / 1000 - (limit - 5), now), false);
  assert.equal(isIdle(now / 1000 - (limit + 5), now), true);
  assert.equal(isIdle(undefined, now), false);
});

test("o cookie da sessão é HttpOnly, SameSite=Lax e dura até ao fim da sessão", () => {
  const res = fakeRes();
  const exp = Math.floor(Date.now() / 1000) + 3600;
  setSessionCookie(fakeReq({ secure: true }), res, "tok", exp);
  const { name, value, options } = res.cookies[0];
  assert.equal(name, COOKIE_NAME);
  assert.equal(value, "tok");
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.secure, true);
  assert.ok(options.maxAge > 3500 * 1000 && options.maxAge <= 3600 * 1000);

  const res2 = fakeRes();
  setSessionCookie(fakeReq({ secure: false }), res2, "tok", exp);
  assert.equal(res2.cookies[0].options.secure, false);

  const res3 = fakeRes();
  clearSessionCookie(fakeReq(), res3);
  assert.equal(res3.cookies[0].cleared, true);
});
