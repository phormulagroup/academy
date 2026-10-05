var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");
const middleware = require("../utils/middleware");

router.get("/read", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM personalization");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM personalization WHERE id_lang = ?", [req.query.id_lang]);
    // Texto público da página inicial: cache curta no browser e na Cloudflare (o backoffice lê por /read, sem cache)
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", middleware, requirePermission("personalization", "update"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;

    const insertedRow = await query("INSERT INTO personalization SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", middleware, requirePermission("personalization", "update"), async (req, res, next) => {
  try {
    let data = req.body.data;
    let whereId = data.id;

    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE personalization SET " + setClause(columns) + " WHERE id = ?", [...values, toId(whereId)]);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", middleware, requirePermission("personalization", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE personalization SET is_deleted = 1 WHERE id = ?", [toId(req.body.data.id)]);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
