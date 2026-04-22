var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", async (req, res) => {
  console.log("//// READ DOWNLOAD ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM download");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  console.log("//// READ DOWNLOAD ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM download WHERE id_lang = ?; SELECT * FROM download_item WHERE id_lang = ?", [req.query.id_lang, req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readBySlug", async (req, res) => {
  console.log("//// READ DOWNLOAD ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM download WHERE slug = ? AND id_lang = ?; SELECT * FROM download_item WHERE id_download IN (SELECT id FROM download WHERE slug = ? AND id_lang = ?)",
      [req.query.slug, req.query.id_lang, req.query.slug, req.query.id_lang],
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE DOWNLOAD ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    let items = data.items;
    delete data.items;

    data.slug = slugify(data.name, { lower: true, strict: true });
    const insertedRow = await query("INSERT INTO download SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", async (req, res, next) => {
  console.log("//// UPDATE DOWNLOAD ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    let items = data.items;
    delete data.items;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE download SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", async (req, res, next) => {
  console.log("//// DELETE DOWNLOAD ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE download SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
