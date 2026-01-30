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
  console.log("//// READ LANGUAGE ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM language");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE LANGUAGE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    data.country = data.country ? JSON.stringify(data.country) : null;
    console.log(data);
    const insertedRow = await query("INSERT INTO language SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", async (req, res, next) => {
  console.log("//// UPDATE LANGUAGE ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    data.country = data.country ? JSON.stringify(data.country) : null;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE language SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", async (req, res, next) => {
  console.log("//// DELETE LANGUAGE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE language SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/default", async (req, res, next) => {
  console.log("//// DEFAULT LANGUAGE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE language SET is_default = 1 WHERE id = ?; UPDATE language SET is_default = 0 WHERE id != ?", [req.body.data.id, req.body.data.id]);
    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
