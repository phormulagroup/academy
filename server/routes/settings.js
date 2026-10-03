var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");
const middleware = require("../utils/middleware");

// Tem as credenciais do SMTP: só quem tem permissão em Definições as lê
router.get("/read", middleware, requirePermission("settings", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM settings");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", middleware, requirePermission("settings", "create"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;

    const insertedRow = await query("INSERT INTO settings SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", middleware, requirePermission("settings", "update"), async (req, res, next) => {
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE settings SET " + setClause(columns) + " WHERE id = ?", [...values, toId(whereId)]);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", middleware, requirePermission("settings", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE settings SET is_deleted = 1 WHERE id = ?", [toId(req.body.data.id)]);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
