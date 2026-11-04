const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql");
const { inputGuard, badQuery, badBody } = require("../utils/inputGuard");
const { clientIp, ipKey, validIp } = require("../utils/clientIp");

test("a biblioteca mysql transforma um objeto numa condição sempre verdadeira (é isto que o filtro impede)", () => {
  assert.equal(mysql.format("SELECT * FROM user WHERE email = ?", [{ email: "1" }]), "SELECT * FROM user WHERE email = `email` = '1'");
});

test("query string: objetos aninhados são recusados; valores simples e listas simples passam", () => {
  assert.equal(badQuery({ email: { email: "1" } }), true);
  assert.equal(badQuery({ id: [{ a: 1 }] }), true);
  assert.equal(badQuery({ email: "a@b.com", id: "7", ids: ["1", "2"] }), false);
  assert.equal(badQuery({}), false);
  assert.equal(badQuery(undefined), false);
});

test("corpo: ids e campos simples não podem ser objetos; JSON legítimo (settings, content...) passa", () => {
  assert.equal(badBody({ data: { id: { id: 1 } } }), true);
  assert.equal(badBody({ data: { email: { a: 1 } } }), true);
  assert.equal(badBody({ data: { id_course: { x: 1 } } }), true);
  assert.equal(badBody({ data: [{ id_user: 1 }, { id_course: { x: 1 } }] }), true);
  assert.equal(badBody({ data: { id: 5, name: "x", settings: { a: { b: 1 } }, content: { root: {} }, question: [{ title: "q" }] } }), false);
  assert.equal(badBody({ data: [{ id_course: 1, activity_type: "topic", meta_data: { a: 1 } }] }), false);
  assert.equal(badBody({}), false);
  assert.equal(badBody({ data: "token-antigo" }), false);
});

test("o middleware responde 400 a um pedido com objetos e deixa passar os outros", () => {
  const calls = [];
  const res = { status: (s) => ({ send: (b) => calls.push([s, b]) }) };
  inputGuard({ query: { email: { email: "1" } }, body: {} }, res, () => calls.push("next"));
  inputGuard({ query: { email: "a@b.com" }, body: { data: { id: 3 } } }, res, () => calls.push("next"));
  assert.deepEqual(calls, [[400, { message: "Invalid request" }], "next"]);
});

test("clientIp: ignora cabeçalhos forjáveis por omissão e usa req.ip", () => {
  delete process.env.CLIENT_IP_HEADER;
  const req = { ip: "198.51.100.20", headers: { "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "203.0.113.10" }, socket: {} };
  assert.equal(clientIp(req), "198.51.100.20");
  assert.equal(ipKey(req), "198.51.100.20");
});

test("clientIp: com CLIENT_IP_HEADER lê só esse cabeçalho, e só se for um IP válido", () => {
  process.env.CLIENT_IP_HEADER = "CF-Connecting-IP";
  try {
    assert.equal(clientIp({ ip: "10.0.0.1", headers: { "cf-connecting-ip": "203.0.113.9" }, socket: {} }), "203.0.113.9");
    assert.equal(clientIp({ ip: "10.0.0.1", headers: { "cf-connecting-ip": "isto-nao-e-um-ip" }, socket: {} }), "10.0.0.1");
    assert.equal(clientIp({ ip: "10.0.0.1", headers: {}, socket: {} }), "10.0.0.1");
  } finally {
    delete process.env.CLIENT_IP_HEADER;
  }
});

test("IPv4 dentro de IPv6 é normalizado e IPv6 limita-se pelo bloco /64", () => {
  assert.equal(validIp("::ffff:203.0.113.9"), "203.0.113.9");
  assert.equal(validIp("lixo"), null);
  const a = ipKey({ ip: "2001:818:c51d:db00:c50e:c272:374c:15c6", headers: {}, socket: {} });
  const b = ipKey({ ip: "2001:818:c51d:db00:1:2:3:4", headers: {}, socket: {} });
  const c = ipKey({ ip: "2001:818:c51d:db01:1:2:3:4", headers: {}, socket: {} });
  assert.equal(a, "2001:0818:c51d:db00::/64");
  assert.equal(a, b);
  assert.notEqual(a, c);
});
