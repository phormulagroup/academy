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

router.get("/read", async (req, res) => {
  console.log("//// READ FAQ ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  console.log("//// READ FAQ ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs WHERE id_lang = ?", [req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readBySlug", async (req, res) => {
  console.log("//// READ FAQ ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs WHERE slug = ? AND id_lang = ?", [req.query.slug, req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", middleware, async (req, res, next) => {
  console.log("//// CREATE FAQ ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const insertedRow = await query("INSERT INTO faqs SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", middleware, async (req, res, next) => {
  console.log("//// UPDATE FAQ ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE faqs SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", middleware, async (req, res, next) => {
  console.log("//// DELETE FAQ ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE faqs SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
