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
      "SELECT * FROM user WHERE id_lang = ?; " +
        "SELECT * FROM course WHERE id_lang = ?; " +
        "SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE id_lang = ?; " +
        "SELECT course_topic.*, course_module.id_course FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ?; " +
        "SELECT course_test.*, course_module.id_course FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ?; " +
        "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course.id_lang = ? ORDER BY course_user_activity.created_at DESC; ",
      [req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang],
    );

    let users = rows[0];
    let courses = rows[1];
    let modules = rows[2];
    let topics = rows[3];
    let tests = rows[4];
    let activity = rows[5];

    res.send({ users, courses, modules, topics, tests, activity });
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

module.exports = router;
