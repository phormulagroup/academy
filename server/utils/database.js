const mysql = require("mysql");

// Credenciais vêm do .env.<NODE_ENV> (carregado em index.js)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 3306,
  // Uma instrução por consulta: multipleStatements ligado amplificava qualquer falha de injeção de SQL (utils/sql.js: multi() corre várias em paralelo)
  multipleStatements: false,
  // Ligações abertas em simultâneo (DB_POOL_SIZE; o limite do alojamento costuma ser baixo) e tempo máximo para ligar
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

require("./timing").instrumentPool(db);

module.exports = db;
