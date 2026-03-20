var express = require("express");
var dayjs = require("dayjs");
const util = require("util");
var router = express.Router();
var db = require("../utils/database");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", (req, res, next) => {
  console.log("//// READ INBOX ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(
        "SELECT m.*, u1.name as 'from_name', u2.name as 'to_name', u1.img as 'from_img', u2.img as 'to_img' FROM messages m JOIN ( SELECT from_id_user, to_id_user, MAX(date) AS date_sended " +
          "FROM messages WHERE from_id_user = ? OR to_id_user = ? GROUP BY from_id_user, to_id_user) AS grp " +
          "ON  grp.from_id_user = m.from_id_user AND grp.to_id_user = m.to_id_user AND grp.date_sended = m.date " +
          "LEFT JOIN users u1 on m.from_id_user = u1.id " +
          "LEFT JOIN users u2 on m.to_id_user = u2.id " +
          "ORDER BY date, from_id_user, to_id_user",
        [req.query.id, req.query.id],
      );
      res.send(rows);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.get("/readUnread", (req, res, next) => {
  console.log("//// READ MESSAGES UNREAD ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      //"SELECT COUNT(*) as total, from_id_user FROM `messages` WHERE is_read = 0 AND to_id_user = ? GROUP BY from_id_user"
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(
        "SELECT messages.*, u1.name as from_name, u2.name as to_name FROM messages LEFT JOIN users u1 ON u1.id = messages.from_id_user " +
          "LEFT JOIN users u2 ON u2.id = messages.to_id_user WHERE to_id_user = ? AND is_read = 0 AND u1.name IS NOT NULL AND u2.name IS NOT NULL; ",
        req.query.id,
      );
      res.send(rows);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.get("/readDetails", (req, res, next) => {
  console.log("//// READ MESSAGES DETAILS ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      console.log(req.query);
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(
        "SELECT messages.*, u1.name as from_name, u2.name as to_name FROM messages " +
          "LEFT JOIN users u1 ON u1.id = messages.from_id_user " +
          "LEFT JOIN users u2 ON u2.id = messages.to_id_user " +
          "WHERE (from_id_user = ? AND to_id_user = ?) OR (from_id_user = ? AND to_id_user = ?) " +
          "ORDER BY date; SELECT * FROM users WHERE id = ?",
        [req.query.id_1, req.query.id_2, req.query.id_2, req.query.id_1, req.query.id_2],
      );
      res.send({ messages: rows[0], otherUser: rows[1] });
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.post("/create", (req, res, next) => {
  console.log("//// CREATE MESSAGES ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      let data = req.body.data;
      if (!data.id_thread) {
        const insertThread = await query("INSERT INTO thread (`title`) VALUES (?)", [data.title]);
        data.id_thread = insertThread.insertId;
      }

      const insertRow = await query("INSERT INTO messages (`id_thread`, `from_id_user`, `to_id_user`, `text`) VALUES (?)", [
        [data, id_thread, data.from_id_user, data.to_id_user, data.text],
      ]);
      res.send(insertRow);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.post("/update", (req, res, next) => {
  console.log("//// UPDATE MESSAGE ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const updatedRow = await query("UPDATE messages SET is_read = 1 WHERE to_id_user = ? AND id_thread = ?", [req.body.data.to_id_user, req.body.data.id_thread]);
      res.send(updatedRow);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

router.post("/delete", (req, res, next) => {
  console.log("//// DELETE MESSAGE ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const updatedRow = await query("UPDATE messages SET is_deleted = 1 WHERE to_id_user = ? AND from_id_user = ?", [req.body.data.to_id_user, req.body.data.from_id_user]);
      res.send(updatedRow);
      conn.release();
    } catch (err) {
      throw err;
    }
  });
});

module.exports = router;
