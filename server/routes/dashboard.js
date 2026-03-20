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
      "SELECT * FROM user WHERE id_lang = ? AND is_deleted = 0; " +
        "SELECT * FROM course WHERE id_lang = ? AND is_deleted = 0; " +
        "SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE id_lang = ? AND course.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_topic.*, course_module.id_course FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_module.is_deleted = 0 AND course_topic.is_deleted = 0 AND course.is_deleted = 0; " +
        "SELECT course_test.*, course_module.id_course FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_module.is_deleted = 0 AND course_test.is_deleted = 0 AND course.is_deleted = 0; " +
        "SELECT course_user_activity.*, user.name as `user_name` FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "LEFT JOIN user ON user.id = course_user_activity.id_user WHERE course.id_lang = ? ORDER BY course_user_activity.created_at DESC; " +
        "SELECT logs.*, user.name as `user_name` FROM logs LEFT JOIN user ON user.id = logs.id_user WHERE logs.id_lang = ? ",
      [req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang],
    );

    let users = rows[0];
    let courses = rows[1];
    let modules = rows[2];
    let topics = rows[3];
    let tests = rows[4];
    let activity = rows[5];
    let logs = rows[6];

    res.send({ users, courses, modules, topics, tests, activity, logs });
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

module.exports = router;
