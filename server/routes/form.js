var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");
const middleware = require("../utils/middleware");

router.get("/read", middleware, requirePermission("form_submission", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", middleware, requirePermission("form_submission", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM form_submission WHERE id_lang = ? AND is_deleted = 0", [req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const insertedRow = await query("INSERT INTO form_submission SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: "Invalid form data" });
  }
});

router.post("/delete", middleware, requirePermission("form_submission", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE form_submission SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
