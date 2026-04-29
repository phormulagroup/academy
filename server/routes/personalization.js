var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const middleware = require("../utils/middleware");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", async (req, res) => {
  console.log("//// READ PERSONALIZATION ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM personalization");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  console.log("//// READ PERSONALIZATION BY LANG ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM personalization WHERE id_lang = ?", [req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", middleware, async (req, res, next) => {
  console.log("//// CREATE PERSONALIZATION ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;

    const insertedRow = await query("INSERT INTO personalization SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", middleware, async (req, res, next) => {
  console.log("//// UPDATE PERSONALIZATION ////");
  try {
    let data = req.body.data;
    let whereId = data.id;

    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE personalization SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", middleware, async (req, res, next) => {
  console.log("//// DELETE PERSONALIZATION ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE personalization SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
