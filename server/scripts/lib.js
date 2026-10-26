// Utilitários comuns dos scripts de manutenção (migrações e traduções): carregam o .env do ambiente e ligam à base de dados.
const path = require("path");

// Ambiente: --env=staging | NODE_ENV | development. Carrega server/.env.<ambiente> (o mesmo ficheiro que a API usa)
function loadEnv(argv = process.argv.slice(2)) {
  const flag = argv.find((a) => a.startsWith("--env="));
  const env = (flag ? flag.slice("--env=".length) : process.env.NODE_ENV) || "development";
  process.env.NODE_ENV = env;
  require("dotenv").config({ path: path.join(__dirname, "..", `.env.${env}`), quiet: true });
  return env;
}

async function connect({ multipleStatements = false } = {}) {
  const mysql = require("mysql2/promise");
  for (const key of ["DB_HOST", "DB_NAME", "DB_USER"]) {
    if (!process.env[key]) throw new Error(`${key} não está definido (ambiente "${process.env.NODE_ENV}"): confirme o ficheiro .env.${process.env.NODE_ENV}`);
  }
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements,
    connectTimeout: 10000,
  });
}

module.exports = { loadEnv, connect };
