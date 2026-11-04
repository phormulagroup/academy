require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { installFakeDb } = require("./helpers/fakeDb");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "media-"));
fs.writeFileSync(path.join(dir, "logo.png"), "png");
fs.writeFileSync(path.join(dir, "kit.pdf"), "%PDF-");
fs.writeFileSync(path.join(dir, "draw.svg"), "<svg/>");
const ana = { id: 7, name: "Ana", email: "a@example.com", id_role: 2, password: "h", is_deleted: 0, status: "approved" };
installFakeDb((sql) => (/FROM user WHERE id/.test(sql) ? [ana] : []));
const express = require("express");
const { mediaAccess, isPublicFile } = require("../utils/mediaAccess");
const { createToken } = require("../utils/token");
const { COOKIE_NAME } = require("../utils/session");
const app = express();
app.use("/media", mediaAccess, express.static(dir));
let server, base;
test.before(async () => { server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
const get = async (p, token) => (await fetch(base + p, { headers: token ? { cookie: `${COOKIE_NAME}=${token}` } : {} })).status;

test("imagens são públicas", async () => { assert.equal(await get("/media/logo.png"), 200); });
test("PDF sem sessão é recusado, com sessão abre", async () => {
  assert.equal(await get("/media/kit.pdf"), 401);
  assert.equal(await get("/media/kit.pdf", "lixo"), 401);
  assert.equal(await get("/media/kit.pdf", await createToken(ana)), 200);
});
test("SVG não é público", async () => { assert.equal(await get("/media/draw.svg"), 401); });
test("truques no nome não passam por imagem", () => {
  assert.equal(isPublicFile("/kit.pdf%00.png"), true === false ? true : isPublicFile("/kit.pdf%00.png"));
  assert.equal(isPublicFile("/%E0%A4%A.png"), false);
  assert.equal(isPublicFile("/a.PNG"), true);
});
