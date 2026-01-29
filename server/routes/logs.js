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
  console.log("/// READ LOG ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT logs.*, user.name, user.email FROM logs LEFT JOIN user ON user.id = logs.modified_by");
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

router.get("/readByParams", async (req, res) => {
  console.log("/// READ LOG ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const params = req.query;
    let whereString = "";
    if (params) {
      let paramsColumns = Object.keys(params);
      for (let i = 0; i < paramsColumns.length; i++) {
        if (params[paramsColumns[i]]) {
          if (i === paramsColumns.length - 1) whereString += `${paramsColumns[i]} = '${params[paramsColumns[i]]}' `;
          else whereString += `${paramsColumns[i]} = '${params[paramsColumns[i]]}' AND `;
        }
      }
    }

    const rows = await query(`SELECT logs.*, user.name, user.email FROM logs LEFT JOIN user ON user.id = logs.modified_by WHERE ${whereString} ORDER BY created_at DESC`);
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

router.post("/create", async (req, res) => {
  console.log("//// CREATE LOG ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("INSERT INTO logs SET ?", req.body.data);
    res.send(rows);
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
  }
});

module.exports = router;
