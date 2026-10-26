#!/usr/bin/env node
// Migrações da base de dados (server/database/migrations/*.sql), com registo do que já foi aplicado em cada ambiente (tabela schema_migrations).
//
//   node scripts/migrate.js status                  mostra o que está aplicado e o que falta (só lê; nunca altera nada)
//   node scripts/migrate.js up [--dry-run]          aplica, por ordem, as que faltam
//   node scripts/migrate.js baseline --through=NOME marca como já aplicadas (sem correr) as migrações até NOME, para um ambiente que as aplicou à mão
//
// Ambiente: NODE_ENV ou --env=staging|production (ficheiro server/.env.<ambiente>). No cPanel: npm run migrate:status:staging / migrate:staging.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MIGRATIONS_DIR = path.join(__dirname, "..", "database", "migrations");

const checksum = (sql) => crypto.createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");

// Ficheiros .sql por ordem de nome (as datas no início do nome dão a ordem certa)
function listMigrations(dir = MIGRATIONS_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((file) => {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      return { name: file.replace(/\.sql$/, ""), file, sql, checksum: checksum(sql) };
    })
    // Por nome sem a extensão: "…-tickets" vem antes de "…-tickets-import" (com a extensão o "-" ficava antes do ".")
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// Compara os ficheiros com o que está registado: pendentes (por correr), aplicadas e alteradas depois de aplicadas
function plan(files, applied) {
  const done = new Map(applied.map((a) => [a.name, a]));
  return {
    pending: files.filter((f) => !done.has(f.name)),
    applied: files.filter((f) => done.has(f.name)),
    changed: files.filter((f) => done.has(f.name) && done.get(f.name).checksum && done.get(f.name).checksum !== f.checksum),
    unknown: applied.filter((a) => !files.some((f) => f.name === a.name)),
  };
}

async function tableExists(conn, name) {
  const [rows] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [name]);
  return rows[0].n > 0;
}

async function readApplied(conn) {
  if (!(await tableExists(conn, "schema_migrations"))) return null;
  const [rows] = await conn.query("SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name");
  return rows;
}

async function ensureTable(conn) {
  await conn.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name varchar(190) NOT NULL, checksum char(64) DEFAULT NULL, applied_at datetime NOT NULL DEFAULT current_timestamp(), PRIMARY KEY (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  );
}

function printStatus(result, tracked) {
  if (!tracked) console.log("A base de dados ainda não tem registo de migrações (tabela schema_migrations): todas aparecem como por aplicar.\n");
  for (const f of result.applied) console.log(`  ✔ ${f.name}${result.changed.includes(f) ? "   (o ficheiro mudou depois de aplicado)" : ""}`);
  for (const f of result.pending) console.log(`  ○ ${f.name}   por aplicar`);
  for (const a of result.unknown) console.log(`  ? ${a.name}   registada mas sem ficheiro`);
  console.log(`\n${result.applied.length} aplicadas, ${result.pending.length} por aplicar.`);
}

async function main() {
  const { loadEnv, connect } = require("./lib");
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith("--")) || "status";
  const env = loadEnv(args);
  const files = listMigrations();
  const conn = await connect({ multipleStatements: true });
  console.log(`Ambiente: ${env} · base de dados: ${process.env.DB_NAME} @ ${process.env.DB_HOST}\n`);
  try {
    const applied = await readApplied(conn);

    if (command === "status") {
      const result = plan(files, applied || []);
      printStatus(result, applied !== null);
      if (applied === null && (await tableExists(conn, "user"))) {
        console.log("\nEste ambiente já tem tabelas. Se as migrações foram aplicadas à mão, marque-as primeiro com:\n  npm run migrate:baseline -- --through=<última migração aplicada>");
      }
      return;
    }

    if (command === "baseline") {
      const through = (args.find((a) => a.startsWith("--through=")) || "").slice("--through=".length).replace(/\.sql$/, "");
      if (!through) throw new Error("Indique até que migração estão aplicadas: --through=2026-10-15-form-submission-read");
      if (!files.some((f) => f.name === through)) throw new Error(`Não existe a migração "${through}".`);
      await ensureTable(conn);
      const known = new Set((applied || []).map((a) => a.name));
      let marked = 0;
      for (const f of files.filter((x) => x.name <= through && !known.has(x.name))) {
        await conn.query("INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)", [f.name, f.checksum]);
        marked++;
        console.log(`  marcada como aplicada: ${f.name}`);
      }
      console.log(`\n${marked} migrações marcadas (nenhuma foi corrida).`);
      return;
    }

    if (command === "up") {
      // Sem registo num ambiente que já tem dados: correr tudo outra vez estragaria (há migrações que só se aplicam uma vez)
      if (applied === null && (await tableExists(conn, "user"))) {
        throw new Error("Esta base de dados já tem tabelas mas não tem registo de migrações. Marque primeiro o que já foi aplicado:\n  npm run migrate:baseline -- --through=<última migração aplicada>");
      }
      const result = plan(files, applied || []);
      if (result.changed.length) console.log(`Aviso: mudaram depois de aplicadas: ${result.changed.map((f) => f.name).join(", ")}\n`);
      if (!result.pending.length) return console.log("Nada por aplicar.");
      if (args.includes("--dry-run")) {
        console.log("Ficariam por aplicar (simulação, nada foi alterado):");
        result.pending.forEach((f) => console.log(`  ○ ${f.name}`));
        return;
      }
      await ensureTable(conn);
      for (const f of result.pending) {
        process.stdout.write(`  a aplicar ${f.name} ... `);
        try {
          await conn.query(f.sql);
        } catch (err) {
          console.log("ERRO");
          throw new Error(`${f.name}: ${err.message}\nAs seguintes ficam por aplicar. Corrija e volte a correr (o que já passou fica registado).`);
        }
        await conn.query("INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)", [f.name, f.checksum]);
        console.log("ok");
      }
      console.log(`\n${result.pending.length} migrações aplicadas.`);
      return;
    }

    throw new Error(`Comando desconhecido: ${command} (status | up | baseline)`);
  } finally {
    await conn.end();
  }
}

module.exports = { listMigrations, plan, checksum };

if (require.main === module) {
  main().catch((err) => {
    console.error(`\nErro: ${err.message}`);
    process.exit(1);
  });
}
