require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { listMigrations, plan, checksum } = require("../scripts/migrate");
const { mergeTranslations, parseList } = require("../scripts/translations");

test("as migrações do projeto têm nomes únicos, por ordem de data, e nenhuma está vazia", () => {
  const files = listMigrations();
  assert.ok(files.length > 0);
  assert.deepEqual(files.map((f) => f.name), [...files.map((f) => f.name)].sort());
  assert.equal(new Set(files.map((f) => f.name)).size, files.length);
  for (const f of files) {
    assert.match(f.name, /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/, f.name);
    assert.ok(f.sql.trim().length > 0, `${f.name} está vazia`);
  }
});

test("plan separa pendentes, aplicadas, alteradas e registadas sem ficheiro", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mig-"));
  fs.writeFileSync(path.join(dir, "2026-01-01-a.sql"), "SELECT 1;");
  fs.writeFileSync(path.join(dir, "2026-01-02-b.sql"), "SELECT 2;");
  fs.writeFileSync(path.join(dir, "2026-01-03-c.sql"), "SELECT 3;");
  fs.writeFileSync(path.join(dir, "leia-me.txt"), "ignorado");
  const files = listMigrations(dir);
  assert.deepEqual(files.map((f) => f.name), ["2026-01-01-a", "2026-01-02-b", "2026-01-03-c"]);
  const result = plan(files, [
    { name: "2026-01-01-a", checksum: checksum("SELECT 1;") },
    { name: "2026-01-02-b", checksum: "outro" },
    { name: "2025-12-31-antiga", checksum: null },
  ]);
  assert.deepEqual(result.pending.map((f) => f.name), ["2026-01-03-c"]);
  assert.deepEqual(result.applied.map((f) => f.name), ["2026-01-01-a", "2026-01-02-b"]);
  assert.deepEqual(result.changed.map((f) => f.name), ["2026-01-02-b"]);
  assert.deepEqual(result.unknown.map((a) => a.name), ["2025-12-31-antiga"]);
});

test("o checksum ignora a diferença entre fins de linha", () => {
  assert.equal(checksum("a\r\nb"), checksum("a\nb"));
});

test("mergeTranslations acrescenta as chaves em falta e não mexe nas existentes sem overwrite", () => {
  const existing = [{ key: "Hello", value: "Olá" }];
  const rows = [{ key: "Hello", value: "Oi" }, { key: "Bye", value: "Adeus" }];
  const kept = mergeTranslations(existing, rows);
  assert.deepEqual(kept.added, ["Bye"]);
  assert.deepEqual(kept.changed, ["Hello"]);
  assert.deepEqual(kept.next, [{ key: "Hello", value: "Olá" }, { key: "Bye", value: "Adeus" }]);
  const over = mergeTranslations(existing, rows, { overwrite: true });
  assert.deepEqual(over.next, [{ key: "Hello", value: "Oi" }, { key: "Bye", value: "Adeus" }]);
  assert.deepEqual(existing, [{ key: "Hello", value: "Olá" }]); // o original não é alterado
});

test("parseList aceita texto vazio ou inválido", () => {
  assert.deepEqual(parseList(null), []);
  assert.deepEqual(parseList("{lixo"), []);
  assert.deepEqual(parseList('{"a":1}'), []);
  assert.deepEqual(parseList('[{"key":"a","value":"b"}]'), [{ key: "a", value: "b" }]);
});
