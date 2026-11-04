const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const { honeypot } = require("../utils/honeypot");

let reached = [];
const app = express();
app.use(express.json());
app.post("/f", honeypot({ insertId: 1 }), (req, res) => { reached.push(req.body.data); res.send({ insertId: 99 }); });
let server, base;
test.before(async () => { server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
const post = async (data) => (await fetch(base + "/f", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data }) })).json();

test("campo isca preenchido: resposta de sucesso falsa e o pedido não segue", async () => {
  reached = [];
  assert.deepEqual(await post({ email: "a@b.pt", hp_company: "Spam Lda" }), { insertId: 1 });
  assert.equal(reached.length, 0);
});
test("campo isca vazio ou ausente: segue, sem o campo isca nos dados", async () => {
  reached = [];
  assert.deepEqual(await post({ email: "a@b.pt", hp_company: "" }), { insertId: 99 });
  assert.deepEqual(await post({ email: "a@b.pt" }), { insertId: 99 });
  assert.deepEqual(reached, [{ email: "a@b.pt" }, { email: "a@b.pt" }]);
});
