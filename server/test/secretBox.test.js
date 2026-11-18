const test = require("node:test");
const assert = require("node:assert");

process.env.SETTINGS_ENCRYPTION_KEY = "k".repeat(40);
const { encrypt, decrypt, isEncrypted } = require("../utils/secretBox");
const { internals } = require("../utils/email");

test("encrypt/decrypt: ida e volta, com IV novo a cada vez", () => {
  const a = encrypt("xkeysib-segredo");
  assert.ok(isEncrypted(a));
  assert.ok(!a.includes("segredo"));
  assert.notStrictEqual(a, encrypt("xkeysib-segredo"));
  assert.strictEqual(decrypt(a), "xkeysib-segredo");
});

test("decrypt: texto simples antigo lê-se como está", () => {
  assert.strictEqual(decrypt("palavra-passe-antiga"), "palavra-passe-antiga");
});

test("decrypt: valor adulterado ou chave errada falha", () => {
  const value = encrypt("abc");
  const tampered = value.slice(0, -2) + (value.endsWith("AA") ? "BB" : "AA");
  assert.throws(() => decrypt(tampered));
  process.env.SETTINGS_ENCRYPTION_KEY = "z".repeat(40);
  assert.throws(() => decrypt(value));
  process.env.SETTINGS_ENCRYPTION_KEY = "k".repeat(40);
});

test("encrypt: sem chave não guarda em texto simples", () => {
  const saved = process.env.SETTINGS_ENCRYPTION_KEY;
  delete process.env.SETTINGS_ENCRYPTION_KEY;
  assert.throws(() => encrypt("abc"), /SETTINGS_ENCRYPTION_KEY/);
  process.env.SETTINGS_ENCRYPTION_KEY = saved;
});

test("smtpFromRows devolve os segredos em claro, cifrados ou não", () => {
  const brevo = internals.smtpFromRows([{ meta_data: JSON.stringify({ provider: "brevo", email: "a@b.com", brevo_api_key: encrypt("chave") }) }]);
  assert.strictEqual(brevo.brevo_api_key, "chave");
  const smtp = internals.smtpFromRows([{ meta_data: JSON.stringify({ host: "h", password: "antiga" }) }]);
  assert.strictEqual(smtp.password, "antiga");
});
