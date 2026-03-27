var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var fileUpload = require("express-fileupload");
const bcrypt = require("bcryptjs");
var router = express.Router();

var db = require("../utils/database");
const { createToken } = require("../utils/token");
const { generatePassword } = require("../utils/email");
const email = require("../utils/email");

const saltRounds = 10;
router.use(fileUpload());

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", async (req, res) => {
  console.log("//// READ USER ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT user.*, role.name AS role_name FROM user LEFT JOIN role ON user.id_role = role.id");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readById", async (req, res) => {
  console.log("//// READ USER BY ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const userRow = await query("SELECT user.*, role.name AS role_name FROM user LEFT JOIN role ON user.id_role = role.id WHERE user.id = ?", [req.query.id]);
    if (userRow.length > 0) {
      const user = userRow[0];
      const rows = await query(
        "SELECT c.* FROM course c WHERE id_lang = ?; " +
          "SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? " +
          "AND course.is_deleted = 0 AND course_module.is_deleted = 0;" +
          "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
          "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course.is_deleted = 0 " +
          "AND course_module.is_deleted = 0 AND course_topic.is_deleted = 0; " +
          "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
          "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course.is_deleted = 0 " +
          "AND course_module.is_deleted = 0 AND course_test.is_deleted = 0; " +
          "SELECT cua.* FROM course_user_activity cua LEFT JOIN course ON course.id = cua.id_course " +
          "LEFT JOIN course_module ON course_module.id = cua.id_course_module " +
          "LEFT JOIN course_topic ON course_topic.id = cua.id_course_topic " +
          "LEFT JOIN course_test ON course_test.id = cua.id_course_test " +
          "WHERE cua.id_user = 11 AND course.is_deleted = 0 AND (course_module.is_deleted = 0 OR cua.id_course_module IS NULL) " +
          "AND (course_topic.is_deleted = 0 OR cua.id_course_topic IS NULL) " +
          "AND (course_test.is_deleted = 0 OR cua.id_course_test IS NULL);",
        [user.id_lang, user.id_lang, user.id_lang, user.id_lang, user.id, user.id_lang],
      );

      let courses = rows[0];
      let modules = rows[1];
      let topics = rows[2];
      let tests = rows[3];
      let progress = rows[4];

      res.send({ user, courses, modules, topics, tests, progress });
    } else {
      res.send({ user });
    }
  } catch (e) {
    throw e;
  }
});

router.get("/readByEmail", async (req, res) => {
  console.log("//// READ USER BY E-MAIL ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const rows = await query(
      "SELECT user.*, role.name AS role_name, department.name as department_name FROM user LEFT JOIN role ON user.id_role = role.id WHERE email = ?",
      req.query.email,
    );
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

router.post("/createPassword", async (req, res, next) => {
  console.log("//// CREATE PASSWORD ////");
  try {
    let data = req.body.data;
    data.password = await bcrypt.hash(data.password, saltRounds);
    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE user SET password = ?, generate_password = 0 WHERE id = ?", [data.password, data.id]);
    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE USER ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const token = await createToken(data);
    const insertedRow = await query("INSERT INTO user SET ?", data);
    const sendEmail = await generatePassword({ ...data, token });
    console.log(sendEmail);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", async (req, res, next) => {
  console.log("//// UPDATE USER ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    if (data.new_password) {
      data.password = await bcrypt.hash(data.new_password, saltRounds);
      delete data.new_password;
      delete data.confirm_new_password;
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    await query("UPDATE user SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);
    let user = await query("SELECT * FROM user WHERE id = ?", whereId);

    let newToken = await createToken(user[0]);
    res.send({ user: user[0], token: newToken });
  } catch (err) {
    throw err;
  }
});

router.post("/changeStatus", async (req, res, next) => {
  console.log("//// CHANGE USER STATUS ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE user SET status = ? WHERE id = " + whereId, data.status);
    const emailResult = await email.change_status(data);
    console.log("E-mail sent: ", emailResult.messageId);
    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", async (req, res, next) => {
  console.log("//// DELETE USER ////");
  try {
    const query = util.promisify(db.query).bind(db);
    let id_user = req.body.data.id_user;
    const deletedRow = await query("DELETE FROM user WHERE id = " + id_user);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
