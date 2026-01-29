const mysql = require("mysql");
const PORT = process.env.PORT || 3306;

const db = mysql.createPool({
  host: "185.118.114.199",
  database: "phormuladev_share",
  user: "phormuladev_share_user",
  password: "zaYpI0hdY^RkEJVi",
  port: PORT,
  multipleStatements: true,
});

module.exports = db;
