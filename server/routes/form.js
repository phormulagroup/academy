var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");
const middleware = require("../utils/middleware");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", middleware, async (req, res) => {
  console.log("//// READ FORM ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", middleware, async (req, res) => {
  console.log("//// READ FORM ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM form_submission WHERE id_lang = ?", [req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE FORM ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const insertedRow = await query("INSERT INTO form_submission SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", middleware, async (req, res, next) => {
  console.log("//// DELETE FORM ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE form_submission SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
