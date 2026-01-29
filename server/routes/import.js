var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var db = require("../utils/database");

var router = express.Router();

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/table", (req, res, next) => {
  console.log("---- TABLE COLUMNS ----");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      let rowsOtherTable = [];
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(`SHOW COLUMNS FROM ${req.query.table}`);
      if (req.query.otherTable) rowsOtherTable = await query(`SHOW COLUMNS FROM ${req.query.otherTable}`);
      res.send({ table: rows, otherTable: rowsOtherTable });
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.post("/course", (req, res, next) => {
  console.log("---- IMPORT COURSE ----");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);

    try {
      await transaction();
      const clients = await query("SELECT * FROM course");
      const users = await query("SELECT * FROM user");
      const data = JSON.parse(JSON.stringify(req.body.data.values));
      let insertData = [];
      let values = [];

      for (let i = 0; i < data.length; i++) {
        values.push(Object.values(data[i]));
      }

      let columns = Object.keys(insertData[0]);
      console.log(`---- INSERT INTO TABLE | COURSE ----`);
      const insert = await query(`INSERT INTO course (${columns.join(", ")}) VALUES ? `, [values]);
      console.log("INSERT: ", insert);
      console.log("----------");

      let inserted = [];

      if (insert.insertId && insert.changedRows >= 0 && insert.changedRows !== data.length) {
        console.log(`---- READ INSERTED IDS AND ROWS ----`);
        const lastInsertId = await query("SELECT MAX(id) as id FROM course");
        inserted = await query(`SELECT * FROM course WHERE id BETWEEN ? AND ?`, [insert.insertId, lastInsertId[0].id]);
        console.log("INSERTED COURSES: ", inserted);
      }

      await commit();

      res.send({
        inserted,
      });
      conn.release();
    } catch (err) {
      await rollback();
      throw err;
    }
  });
});

module.exports = router;
