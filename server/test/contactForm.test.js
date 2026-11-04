require("./helpers/env");
process.env.TRUST_PROXY = "1";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { installFakeDb } = require("./helpers/fakeDb");

const fake = installFakeDb((sql) => {
  if (/COUNT\(\*\) AS recent/.test(sql)) return [{ recent: 0 }];
  if (/COUNT\(\*\) AS n/.test(sql)) return [{ n: 1 }]; // sem e-mails de confirmação nem avisos à equipa nestes testes
  if (/^INSERT INTO form_submission/.test(sql)) return { insertId: 1 };
  return [];
});
const express = require("express");
const { patchAsyncHandlers, errorHandler } = require("../utils/asyncErrors");
patchAsyncHandlers();
const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use("/form", require("../routes/form"));
app.use(errorHandler);

let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const send = async (data, ip) => {
  const res = await fetch(`${base}/form/create`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ data }) });
  return res.status;
};
const valid = { name: "Ana", email: "ana@example.com", subject: "Olá", message: "Uma pergunta", acceptance: true, id_lang: 3 };

test("o formulário público tem um limite por IP (10 por hora), mesmo trocando de e-mail a cada pedido", async () => {
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push(await send({ ...valid, email: `pessoa${i}@example.com` }, "198.51.100.1"));
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
  assert.deepEqual(statuses.slice(10), [429, 429]);
  assert.equal(await send(valid, "198.51.100.2"), 200, "outro IP não é afetado");
});

test("campos com texto a mais ou que não são texto são recusados, e só os campos do formulário são gravados", async () => {
  const ip = "198.51.100.3";
  assert.equal(await send({ ...valid, message: "x".repeat(5001) }, ip), 400);
  assert.equal(await send({ ...valid, name: "n".repeat(201) }, ip), 400);
  assert.equal(await send({ ...valid, subject: { a: 1 } }, ip), 400);
  assert.equal(await send({ ...valid, email: ["a@b.com"] }, ip), 400);
  fake.calls.length = 0;
  assert.equal(await send({ ...valid, id: 99, is_deleted: 1, created_at: "2000-01-01" }, ip), 200);
  const insert = fake.calls.find((c) => /^INSERT INTO form_submission/.test(c.sql));
  assert.deepEqual(Object.keys(insert.params).sort(), ["acceptance", "email", "id_lang", "message", "name", "subject"]);
});
