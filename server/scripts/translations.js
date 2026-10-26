#!/usr/bin/env node
// Traduções do site (pt, es, fr) a partir do ficheiro Excel (database/translations.xlsx no servidor; docs/translations/admin-redesign-translations.xlsx
// no repositório). Guarda-as na coluna language.translation de cada idioma.
//
//   node scripts/translations.js check [--file=...]                 mostra o que mudaria (só lê)
//   node scripts/translations.js import [--overwrite] [--file=...]  aplica: acrescenta as chaves em falta (com --overwrite também corrige as diferentes)
//
// Antes de alterar guarda uma cópia de cada idioma em database/backups/. Ambiente: NODE_ENV ou --env=staging|production.
const fs = require("fs");
const path = require("path");

// Coluna do Excel → código do idioma (a coluna English só dá o nome da chave)
const COLUMNS = { Português: "pt", Español: "es", Français: "fr" };
const DEFAULT_FILES = [path.join(__dirname, "..", "database", "translations.xlsx"), path.join(__dirname, "..", "..", "docs", "translations", "admin-redesign-translations.xlsx")];

function parseList(text) {
  try {
    const list = JSON.parse(text || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Lê o Excel: { pt: [{key, value}], es: [...], fr: [...] } (linhas sem chave ou sem texto são ignoradas)
function readWorkbook(file) {
  const XLSX = require("xlsx");
  const sheet = XLSX.readFile(file).Sheets;
  const rows = XLSX.utils.sheet_to_json(sheet[Object.keys(sheet)[0]], { defval: "" });
  const out = { pt: [], es: [], fr: [] };
  for (const row of rows) {
    const key = String(row.Key ?? "").trim();
    if (!key) continue;
    for (const [column, code] of Object.entries(COLUMNS)) {
      const value = String(row[column] ?? "").trim();
      if (value) out[code].push({ key, value });
    }
  }
  return out;
}

// Junta as linhas do Excel às traduções existentes: acrescenta as chaves em falta; com overwrite também corrige as que mudaram
function mergeTranslations(existing, rows, { overwrite = false } = {}) {
  const next = existing.map((e) => ({ ...e }));
  const byKey = new Map(next.map((e) => [e.key, e]));
  const added = [];
  const changed = [];
  for (const { key, value } of rows) {
    const current = byKey.get(key);
    if (!current) {
      const entry = { key, value };
      next.push(entry);
      byKey.set(key, entry);
      added.push(key);
    } else if (current.value !== value) {
      if (overwrite) current.value = value;
      changed.push(key);
    }
  }
  return { next, added, changed };
}

async function main() {
  const { loadEnv, connect } = require("./lib");
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith("--")) || "check";
  const overwrite = args.includes("--overwrite");
  const env = loadEnv(args);
  const fileArg = (args.find((a) => a.startsWith("--file=")) || "").slice("--file=".length);
  const file = fileArg || DEFAULT_FILES.find((f) => fs.existsSync(f));
  if (!file || !fs.existsSync(file)) throw new Error("Não encontrei o ficheiro Excel das traduções (database/translations.xlsx).");
  if (!["check", "import"].includes(command)) throw new Error(`Comando desconhecido: ${command} (check | import)`);

  const sheet = readWorkbook(file);
  const conn = await connect();
  console.log(`Ambiente: ${env} · base de dados: ${process.env.DB_NAME} @ ${process.env.DB_HOST}\nFicheiro: ${file}\n`);
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (const code of Object.keys(sheet)) {
      const [row] = (await conn.query("SELECT id, translation FROM language WHERE code = ?", [code]))[0];
      if (!row) {
        console.log(`  ${code}: idioma não existe na base de dados, ignorado`);
        continue;
      }
      const { next, added, changed } = mergeTranslations(parseList(row.translation), sheet[code], { overwrite });
      console.log(`  ${code}: ${added.length} novas${changed.length ? `, ${changed.length} diferentes${overwrite ? " (corrigidas)" : " (mantidas; use --overwrite para as corrigir)"}` : ""}`);
      if (command === "import" && (added.length || (overwrite && changed.length))) {
        const dir = path.join(__dirname, "..", "database", "backups");
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `translations-${code}-${stamp}.json`), row.translation || "[]");
        await conn.query("UPDATE language SET translation = ? WHERE id = ?", [JSON.stringify(next), row.id]);
      }
    }
    console.log(command === "import" ? "\nImportado (cópias de segurança em database/backups/)." : "\nSimulação: nada foi alterado.");
  } finally {
    await conn.end();
  }
}

module.exports = { mergeTranslations, readWorkbook, parseList };

if (require.main === module) {
  main().catch((err) => {
    console.error(`\nErro: ${err.message}`);
    process.exit(1);
  });
}
