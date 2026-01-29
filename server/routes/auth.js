var express = require("express");
var dayjs = require("dayjs");
var router = express.Router();
const util = require("util");
const bcrypt = require("bcryptjs");

var db = require("../utils/database");
const { verifyToken, createToken } = require("../utils/token");
const email = require("../utils/email");

const saltRounds = 10;

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.post("/verifyToken", async (req, res, next) => {
  try {
    let token = req.body.data;
    const result = await verifyToken(token);
    if (result.token_valid) {
      const query = util.promisify(db.query).bind(db);
      const user = await query("SELECT * FROM user WHERE id = ?", result.token_decoded.id);
      if (user.length > 0) {
        if (user[0].email === result.token_decoded.email && user[0].password === result.token_decoded.password && user[0].is_deleted === 0) {
          console.log("///// TOKEN IS VALID");
          res.send({ token_valid: true, user: user[0] });
        } else {
          console.log("///// TOKEN IS NOT VALID");
          res.send({ token_valid: false });
        }
      } else {
        res.send({ token_valid: false });
      }
    } else {
      return res.status(401).send("Invalid Token");
    }
  } catch (err) {
    throw err;
  }
});

router.post("/verifyTokenGeneratePassword", async (req, res, next) => {
  try {
    console.log("---- VERIFY TOKEN ----");
    let token = req.body.data;
    const result = await verifyToken(token);
    if (result.token_valid) {
      const query = util.promisify(db.query).bind(db);
      const user = await query("SELECT * FROM user WHERE user.email = ?", result.token_decoded.email);
      if (user.length > 0) {
        if (user[0].email === result.token_decoded.email && user[0].is_deleted === 0 && (!user[0].password || user[0].generate_password)) {
          console.log("TOKEN IS VALID");
          res.send({ token_valid: true, user: user[0] });
        } else {
          console.log("TOKEN IS NOT VALID");
          res.send({ token_valid: false });
        }
      } else {
        res.send({ token_valid: false });
      }
    } else {
      res.send({ token_valid: false });
    }
  } catch (err) {
    throw err;
  }
});

router.post("/generatePassword", async (req, res, next) => {
  try {
    console.log("---- GENERATE PASSWORD ----");
    let data = req.body.data;
    const query = util.promisify(db.query).bind(db);
    const password = await bcrypt.hash(data.password, saltRounds);
    await query("UPDATE user SET password = ?, generate_password = 0 WHERE email = ?", [password, data.email]);
    res.send({ updated: true });
  } catch (err) {
    throw err;
  }
});

router.post("/login", async (req, res, next) => {
  console.log("///// LOGIN /////");
  try {
    const query = util.promisify(db.query).bind(db);
    let data = req.body.data;
    const user = await query("SELECT * FROM user WHERE email = ? AND is_deleted = 0", [data.email]);
    if (user.length > 0) {
      const comparePassword = await bcrypt.compare(data.password, user[0].password);
      if (comparePassword) {
        const token = await createToken(user[0]);
        res.send({ user: user[0], token, message: "Welcome " + user[0].name + "!" });
      } else {
        res.send({ user: null, message: "The password is not correct, try again." });
      }
    } else {
      res.send({ user: null, message: "This user does not exist on our database!" });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
});

module.exports = router;
