var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", async (req, res) => {
  console.log("//// READ CERTIFICATE ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM course_certificate");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readById", async (req, res) => {
  console.log("//// READ CERTIFICATE BY ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM course_certificate WHERE id = ?", [req.query.id]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE CERTIFICATE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    console.log(data);
    const insertedRow = await query("INSERT INTO course_certificate SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", async (req, res, next) => {
  console.log("//// UPDATE CERTIFICATE ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE course_certificate SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", async (req, res, next) => {
  console.log("//// DELETE CERTIFICATE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE course_certificate SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
