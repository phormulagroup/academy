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
  console.log("//// READ COURSE ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM course");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readById", async (req, res) => {
  console.log("//// READ COURSE BY ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM course WHERE id = ?; SELECT * FROM course_module WHERE id_course = ?; " +
        "SELECT * FROM course_topic LEFT JOIN course_module ON course_topic.id_module = course_module.id WHERE course_module.id_course = ?",
      [req.query.id, req.query.id, req.query.id],
    );
    res.send({ course: rows[0], modules: rows[1], topics: rows[2] });
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE COURSE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const insertedRow = await query("INSERT INTO course SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", async (req, res, next) => {
  console.log("//// UPDATE COURSE ////");
  try {
    let data = req.body.data;
    console.log(req.body);

    res.send(data);
  } catch (err) {
    throw err;
  }
});

router.post("/module", async (req, res, next) => {
  console.log("//// UPDATE COURSE MODULE ////");
  try {
    let data = req.body.data;
    const query = util.promisify(db.query).bind(db);
    for (let i = 0; i < data.length; i++) {
      const aux = data[i];
      console.log(aux);
      // New module
      const insertedModule = await query(
        "INSERT INTO course_module SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), position = VALUES(position)",
        {
          id: aux.id.split("-")[0] === "newmod" ? null : aux.id,
          id_course: aux.id_course,
          title: aux.title,
          description: aux.description,
          position: i,
        },
      );
      aux.id = insertedModule.insertId;
    }

    res.send(data);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", async (req, res, next) => {
  console.log("//// DELETE COURSE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE course SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
