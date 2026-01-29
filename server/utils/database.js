const mysql = require("mysql");
const PORT = process.env.PORT || 3306;

const db = mysql.createPool({
  host: "185.118.114.199",
  database: "phormuladev_academy",
  user: "phormuladev_academy_user",
  password: "6%JSdBxc[5IB,zgA",
  port: PORT,
  multipleStatements: true,
});

module.exports = db;
