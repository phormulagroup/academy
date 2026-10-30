require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { installFakeDb } = require("./helpers/fakeDb");

// A pasta de media e o servidor "remoto" (fallback) são de teste: tudo antes de carregar a rota
const mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "academy-media-"));
process.env.MEDIA_DIR = mediaDir;
installFakeDb(() => []);

const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5000, 65), Buffer.from("\n%%EOF\n")]);
fs.writeFileSync(path.join(mediaDir, "local.pdf"), PDF);

const remote = http.createServer((req, res) => {
  if (req.url.endsWith("/remote.pdf")) return res.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": PDF.length }).end(PDF);
  if (req.url.endsWith("/page.pdf")) return res.writeHead(200, { "Content-Type": "text/html" }).end("<html>index</html>");
  res.writeHead(404, { "Content-Type": "application/json" }).end("{}");
});

let server;
let base;
test.before(async () => {
  await new Promise((r) => remote.listen(0, "127.0.0.1", r));
  process.env.MEDIA_FALLBACK_URL = `http://127.0.0.1:${remote.address().port}/api/media/`;
  const app = express();
  // O CORS da API (index.js): devolve a origem do pedido, com credenciais
  app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true, exposedHeaders: ["Date"] }));
  app.use("/document", require("../routes/document"));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/document/readFile`;
});
test.after(() => {
  server.close();
  remote.close();
  fs.rmSync(mediaDir, { recursive: true, force: true });
});

const get = (file, headers = {}) => fetch(`${base}?file=${encodeURIComponent(file)}`, { headers });

test("serve o PDF local com tipo, cache privada e ETag", async () => {
  const res = await get("local.pdf");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/pdf/);
  assert.equal(res.headers.get("cache-control"), "private, max-age=3600");
  assert.ok(res.headers.get("etag"));
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PDF);
});

test("o mesmo PDF sem alterações responde 304 sem corpo (não volta a descarregar)", async () => {
  const first = await get("local.pdf");
  await first.arrayBuffer();
  // http.get em vez de fetch: o fetch do Node não deixa ver o 304 de um pedido condicional
  const { status, bytes } = await new Promise((resolve, reject) =>
    http
      .get(`${base}?file=local.pdf`, { headers: { "If-None-Match": first.headers.get("etag") } }, (res) => {
        let n = 0;
        res.on("data", (c) => (n += c.length)).on("end", () => resolve({ status: res.statusCode, bytes: n }));
      })
      .on("error", reject),
  );
  assert.equal(status, 304);
  assert.equal(bytes, 0);
});

test("suporta pedidos parciais (Range)", async () => {
  const res = await get("local.pdf", { Range: "bytes=0-99" });
  assert.equal(res.status, 206);
  assert.equal((await res.arrayBuffer()).byteLength, 100);
});

test("sem ficheiro local vai buscá-lo ao servidor remoto, em stream", async () => {
  const res = await get("remote.pdf");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "private, max-age=3600");
  assert.match(res.headers.get("content-type"), /application\/pdf/);
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PDF);
});

test("as respostas de erro nunca ficam em cache do browser (um erro de uma vez não pode durar uma hora)", async () => {
  for (const file of ["nao-existe.pdf", "page.pdf"]) {
    const res = await get(file);
    assert.ok(res.status >= 400, file);
    assert.equal(res.headers.get("cache-control"), "no-store", file);
  }
  assert.equal((await fetch(base)).headers.get("cache-control"), "no-store");
});

test("ficheiro que não existe em lado nenhum: 404 em JSON, nunca um 'PDF' com a página de erro", async () => {
  const res = await get("nao-existe.pdf");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /json/);
  assert.deepEqual(await res.json(), { message: "File not found" });
});

test("o servidor remoto responde 200 mas com uma página (não é PDF): 404", async () => {
  const res = await get("page.pdf");
  assert.equal(res.status, 404);
});

test("pedido sem ficheiro: 400; nomes com caminhos não saem da pasta de media", async () => {
  assert.equal((await fetch(base)).status, 400);
  const res = await get("../../etc/passwd");
  assert.equal(res.status, 404);
});

test("CORS: devolve a origem do pedido com credenciais (nunca '*', que o browser recusa num pedido com sessão)", async () => {
  const headers = await new Promise((resolve, reject) =>
    http
      .get(`${base}?file=local.pdf`, { headers: { Origin: "http://localhost:5173" } }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.headers));
      })
      .on("error", reject),
  );
  assert.equal(headers["access-control-allow-origin"], "http://localhost:5173");
  assert.equal(headers["access-control-allow-credentials"], "true");
  assert.match(headers["access-control-expose-headers"], /Content-Length/);
  assert.match(headers["access-control-expose-headers"], /Date/);
});
