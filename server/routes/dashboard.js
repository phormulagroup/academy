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
  console.log("/// READ DASHBOARD ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM course; " +
        "SELECT * FROM user; " +
        "SELECT * FROM language; " +
        "SELECT * FROM course WHERE id_lang = ?; " +
        "SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE id_lang = ?; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ?; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ?; " +
        "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course.id_lang = ?; ",
      [req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang],
    );

    let allCourses = rows[0];
    let allUsers = rows[1];
    let languages = rows[2];
    let courses = rows[3];
    let modules = rows[4];
    let topics = rows[5];
    let tests = rows[6];
    let progress = rows[7];

    res.send({ allCourses, allUsers, languages, courses, modules, topics, tests, progress });
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

module.exports = router;
