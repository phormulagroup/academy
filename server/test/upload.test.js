require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "media-"));
process.env.MEDIA_DIR = dir;
const { installFakeDb } = require("./helpers/fakeDb");
const media = [];
const db = installFakeDb((sql, params) => {
  if (/^SELECT name FROM media WHERE name LIKE/.test(sql)) return media.filter((m) => m.includes(String(params[0]).replace(/\\|%/g, "")));
  if (/^INSERT INTO media/.test(sql)) {
    media.push(params[0]);
    return { insertId: media.length };
  }
  return [];
});
const { uploadFile } = require("../utils/upload");

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
const file = (name, data = png) => ({ name, data, size: data.length, mv: (target, cb) => fs.writeFile(target, data, cb) });

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("guarda dentro da pasta media mesmo com um nome com ../", async () => {
  const saved = await uploadFile(file("../../fora.png"), "multimedia");
  assert.equal(saved, "fora.png");
  assert.ok(fs.existsSync(path.join(dir, "fora.png")));
  assert.equal(fs.existsSync(path.join(dir, "..", "..", "fora.png")), false);
});

test("o nome do ficheiro nunca vai concatenado no SQL (injeção)", async () => {
  db.calls.length = 0;
  await uploadFile(file("x' OR '1'='1.png"), "multimedia");
  for (const { sql } of db.calls) assert.equal(sql.includes("OR '1'='1"), false, sql);
  assert.ok(db.calls.some((c) => c.params.some((p) => String(p).includes("OR"))));
});

test("um ficheiro com o mesmo nome não substitui o anterior", async () => {
  const a = await uploadFile(file("repetido.png"), "multimedia");
  const b = await uploadFile(file("repetido.png"), "multimedia");
  assert.notEqual(a, b);
  assert.ok(fs.existsSync(path.join(dir, a)) && fs.existsSync(path.join(dir, b)));
});

test("recusa tipos perigosos e conteúdo que não corresponde, sem gravar nada", async () => {
  const before = fs.readdirSync(dir).length;
  await assert.rejects(uploadFile(file("mau.html", Buffer.from("<script>1</script>")), "multimedia"), /not allowed/);
  await assert.rejects(uploadFile(file("mau.png", Buffer.from("<script>1</script>")), "multimedia"), /does not match/);
  assert.equal(fs.readdirSync(dir).length, before);
});

test("um avatar tem nome definido por nós e só aceita imagens", async () => {
  assert.equal(await uploadFile(file("qualquer.png"), "avatar", "ana_silva_avatar_PT.png"), "ana_silva_avatar_PT.png");
  assert.ok(fs.existsSync(path.join(dir, "ana_silva_avatar_PT.png")));
  await assert.rejects(uploadFile(file("a.pdf", Buffer.from("%PDF-1.7")), "avatar", "x.png"), /not allowed/);
});
