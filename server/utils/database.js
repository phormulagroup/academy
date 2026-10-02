const mysql = require("mysql");

// Credenciais vêm do .env.<NODE_ENV> (carregado em index.js)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 3306,
  multipleStatements: true,
});

module.exports = db;
