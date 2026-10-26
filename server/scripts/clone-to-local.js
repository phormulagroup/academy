#!/usr/bin/env node
// Copia o esquema e os dados da BD configurada em .env.development (staging: SÓ LEITURA) para a BD local academy_local (MySQL 8.0 na porta 3307,
// ver scripts/local-db.sh). Não copia os dados de logs/segurança/envios e apaga as definições de SMTP locais para a app local nunca enviar e-mails reais.
// Aviso: a cópia leva as contas dos utilizadores (e-mails e hashes de password) para esta máquina.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.development"), quiet: true });
const mysql = require("mysql2/promise");

const SKIP_DATA = new Set(["logs", "server_log", "audit_log", "email_log", "security_block", "communication_recipient", "communication_click"]);
const LOCAL = { host: "127.0.0.1", port: 3307, user: "root", database: "academy_local", multipleStatements: true };

(async () => {
  if (!process.env.DB_HOST || /^(127\.0\.0\.1|localhost)$/.test(process.env.DB_HOST)) throw new Error("O .env.development tem de apontar para a staging (a origem da cópia).");
  const src = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const dst = await mysql.createConnection(LOCAL);
  await dst.query("DROP DATABASE IF EXISTS academy_local; CREATE DATABASE academy_local CHARACTER SET utf8mb4; USE academy_local; SET FOREIGN_KEY_CHECKS=0; SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO'");
  const [tables] = await src.query("SELECT TABLE_NAME n, TABLE_TYPE t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
  for (const { n, t } of tables) {
    if (t !== "BASE TABLE") continue;
    const [[row]] = await src.query("SHOW CREATE TABLE ??", [n]);
    await dst.query(row["Create Table"]);
    if (SKIP_DATA.has(n)) continue;
    const [rows] = await src.query("SELECT * FROM ??", [n]);
    for (let i = 0; i < rows.length; i += 200) {
      const part = rows.slice(i, i + 200);
      const cols = Object.keys(part[0]);
      await dst.query(`INSERT INTO \`${n}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES ?`, [part.map((r) => cols.map((c) => r[c]))]);
    }
    console.log(n.padEnd(28), rows.length);
  }
  await dst.query("SET FOREIGN_KEY_CHECKS=1; UPDATE settings SET meta_data = '{}' WHERE name_key = 'smtp'");
  await src.end();
  await dst.end();
  console.log("\nBD local pronta: academy_local (127.0.0.1:3307). Arranque a API com: npm run dev:local");
})().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
