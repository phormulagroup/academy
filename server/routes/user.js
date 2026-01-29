var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var fileUpload = require("express-fileupload");
const bcrypt = require("bcryptjs");
var router = express.Router();

var db = require("../utils/database");
const { createToken } = require("../utils/token");
const { generatePassword } = require("../utils/email");

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
    const rows = await query(
      "SELECT user.*, role.name AS role_name, department.name as department_name FROM user LEFT JOIN role ON user.id_role = role.id LEFT JOIN department ON department.id = user.id_department"
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByEmail", async (req, res) => {
  console.log("//// READ USER BY E-MAIL ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const rows = await query(
      "SELECT user.*, role.name AS role_name, department.name as department_name FROM user " +
        "LEFT JOIN role ON user.id_role = role.id " +
        "LEFT JOIN department ON department.id = user.id_department WHERE email = ?",
      req.query.email
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
