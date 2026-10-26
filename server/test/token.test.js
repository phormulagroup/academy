require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createToken, createSession, verifyToken, refreshActivity, passwordFingerprint, createDeviceToken, isTrustedDevice } = require("../utils/token");

const user = { id: 7, name: "Ana", email: "ana@example.com", id_role: 3, id_lang: 3, password: "hash-da-password" };

test("a sessão dura 12 horas por omissão e leva o sinal de atividade", async () => {
  const { token, expires_at } = await createSession(user);
  const decoded = jwt.decode(token);
  assert.equal(decoded.exp, expires_at);
  assert.equal(decoded.exp - decoded.iat, 12 * 3600);
  assert.ok(Math.abs(decoded.la - decoded.iat) <= 1);
  assert.equal(decoded.pv, passwordFingerprint(user.password));
  assert.equal("password" in decoded, false);
});

test("verifyToken devolve o utilizador e os tempos da sessão, e recusa tokens inválidos", async () => {
  const token = await createToken(user);
  const ok = await verifyToken(token);
  assert.equal(ok.token_valid, true);
  assert.equal(ok.token_decoded.id, 7);
  assert.equal("exp" in ok.token_decoded, false);
  assert.ok(ok.token_exp > ok.token_iat);
  assert.ok(Math.abs(ok.token_la - ok.token_iat) <= 1);

  assert.equal((await verifyToken("isto-nao-e-um-token")).token_valid, false);
  const forged = jwt.sign({ id: 7 }, "outro-segredo-outro-segredo-outro-segredo-12", { algorithm: "HS256" });
  assert.equal((await verifyToken(forged)).token_valid, false);
  const expired = jwt.sign({ id: 7 }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: -10 });
  assert.equal((await verifyToken(expired)).token_valid, false);
});

test("tokens antigos sem o sinal de atividade usam o momento de emissão", async () => {
  const old = jwt.sign({ id: 7, pv: "x" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  const result = await verifyToken(old);
  assert.equal(result.token_valid, true);
  assert.equal(result.token_la, result.token_iat);
});

test("refreshActivity renova a atividade sem alargar o fim da sessão", async () => {
  const past = Math.floor(Date.now() / 1000) - 20 * 60;
  const exp = Math.floor(Date.now() / 1000) + 5 * 3600;
  const token = jwt.sign({ id: 7, pv: "x", la: past, exp }, process.env.JWT_SECRET, { algorithm: "HS256" });
  const refreshed = await refreshActivity(token);
  assert.equal(refreshed.expires_at, exp);
  const decoded = jwt.decode(refreshed.token);
  assert.equal(decoded.exp, exp);
  assert.ok(decoded.la >= Math.floor(Date.now() / 1000) - 1);
  assert.equal(decoded.id, 7);
  assert.equal(await refreshActivity("lixo"), null);
});

test("dispositivo de confiança: só vale para a mesma conta e a mesma password", async () => {
  const device = await createDeviceToken(user);
  assert.equal(isTrustedDevice(device, user), true);
  assert.equal(isTrustedDevice(device, { ...user, id: 8 }), false);
  assert.equal(isTrustedDevice(device, { ...user, password: "outra" }), false);
  assert.equal(isTrustedDevice(undefined, user), false);
  assert.equal(isTrustedDevice(await createToken(user), user), false);
});
