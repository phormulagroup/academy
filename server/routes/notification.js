var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");

router.get("/read", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM notification");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByUser", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT notification.title, notification.description, notification_user.* FROM notification_user " +
        "LEFT JOIN notification ON notification.id = notification_user.id_notification WHERE id_user = ? ORDER BY created_at DESC",
      [req.query.id_user],
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM notification WHERE id_lang = ?", [req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", requirePermission("notification", "create"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const insertedRow = await query("INSERT INTO notification SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", requirePermission("notification", "update"), async (req, res, next) => {
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE notification SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/markAsRead", async (req, res, next) => {
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE notification_user SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/send", requirePermission("notification", "update"), async (req, res, next) => {
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Some error on server.", error });
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      let data = req.body.data;

      data.country = data.country ? (typeof data.country === "string" ? JSON.parse(data.country) : data.country) : null;
      let insertData = [];
      const rows = await query("SELECT * FROM user WHERE status = 'approved' AND id_lang = ?", data.id_lang);

      for (let i = 0; i < rows.length; i++) {
        insertData.push([data.id, rows[i].id]);
      }

      await query("INSERT INTO notification_user (id_notification, id_user) VALUES ?", [insertData]);

      await commit();
      conn.release();
      res.send({ send: true });
    } catch (err) {
      await rollback();
      conn.release();
      throw err;
    }
  });
});

router.post("/delete", requirePermission("notification", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE language SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
