var express = require("express");
var dayjs = require("dayjs");
const util = require("util");
var router = express.Router();
var db = require("../utils/database");
const { getSocketInstance } = require("../socketInstance");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/readByUser", (req, res, next) => {
  console.log("//// READ INBOX ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(
        "WITH last_messages AS ( SELECT id_thread, MAX(created_at) AS last_message_date FROM thread_message GROUP BY id_thread ), " +
          "unread_counts AS (SELECT id_thread, COUNT(*) AS unread_count FROM thread_message WHERE is_read = 0 AND to_id_user = ? GROUP BY id_thread )" +
          "SELECT t.id, t.title, t.id_user, t.id_user_responsible, t.created_at as `initiated_at`, t.closed_at, t.status, tm.text, tm.created_at, tm.from_id_user, tm.to_id_user, " +
          "user.img as `user_img`, user.name as `user_name`, COALESCE(uc.unread_count, 0) AS unread_messages FROM thread t " +
          "JOIN last_messages lm ON t.id = lm.id_thread LEFT JOIN unread_counts uc ON uc.id_thread = t.id " +
          "JOIN thread_message tm ON tm.id_thread = lm.id_thread AND tm.created_at = lm.last_message_date " +
          "LEFT JOIN user ON t.id_user_responsible = user.id WHERE t.id_user = ? ORDER BY lm.last_message_date DESC;",
        [req.query.id_user, req.query.id_user],
      );
      res.send(rows);
      conn.release();
    } catch (err) {
      conn.release();
      throw err;
    }
  });
});

router.get("/readBySupport", (req, res, next) => {
  console.log("//// READ INBOX ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(
        "WITH last_messages AS ( SELECT id_thread, MAX(created_at) AS last_message_date FROM thread_message GROUP BY id_thread ), " +
          "unread_counts AS (SELECT id_thread, COUNT(*) AS unread_count FROM thread_message WHERE is_read = 0 AND to_id_user = ? GROUP BY id_thread )" +
          "SELECT t.id, t.title, t.id_user, t.id_user_responsible, t.created_at as `initiated_at`, t.closed_at, t.status, tm.text, tm.created_at, tm.from_id_user, tm.to_id_user, " +
          "user.img as `user_img`, user.name as `user_name`, COALESCE(uc.unread_count, 0) AS unread_messages FROM thread t " +
          "JOIN last_messages lm ON t.id = lm.id_thread LEFT JOIN unread_counts uc ON uc.id_thread = t.id " +
          "JOIN thread_message tm ON tm.id_thread = lm.id_thread AND tm.created_at = lm.last_message_date " +
          "LEFT JOIN user ON t.id_user = user.id WHERE t.id_user_responsible = ? OR t.id_user_responsible IS NULL ORDER BY lm.last_message_date DESC;",
        [req.query.id_user, req.query.id_user],
      );
      res.send(rows);
      conn.release();
    } catch (err) {
      conn.release();
      throw err;
    }
  });
});

router.get("/readByThread", (req, res, next) => {
  console.log("//// READ MESSAGES DETAILS ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query(
        "SELECT t.title, t.id_user, t.id_user_responsible, t.created_at as `initiated_at`, t.closed_at, tm.*, " +
          "user.img as `user_img`, user.name as `user_name`, resp.img as `resp_img`, resp.name as `resp_name` FROM thread t " +
          "LEFT JOIN thread_message tm ON tm.id_thread = t.id " +
          "LEFT JOIN user resp ON t.id_user_responsible = resp.id LEFT JOIN user ON t.id_user = user.id WHERE id_thread = ?",
        [req.query.id_thread],
      );
      res.send(rows);
      conn.release();
    } catch (err) {
      conn.release();
      throw err;
    }
  });
});

router.post("/create", (req, res, next) => {
  console.log("//// CREATE MESSAGES ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      let data = req.body.data;

      console.log(data);

      if (!data.id_thread) {
        const insertThread = await query("INSERT INTO thread (`title`, `id_user`) VALUES (?)", [data.title, data.from_id_user]);
        data.id_thread = insertThread.insertId;
        delete data.title;

        const socket = getSocketInstance();
        socket.notifyByRoleId({ title: "Nova thread", description: "There is a new thread, someone needs to open it!", type: "thread", meta_data: data }, 1);
      } else {
        const socket = getSocketInstance();
        socket.notifyUser({ title: "New message", description: "There is a new message, go check it out!", type: "message", meta_data: data }, data.to_id_user);
      }

      const insertRow = await query("INSERT INTO thread_message SET ?", [data]);
      await commit();
      res.send(insertRow);
      conn.release();
    } catch (err) {
      await rollback();
      conn.release();
      throw err;
    }
  });
});

router.post("/responsible", (req, res, next) => {
  console.log("//// SET RESPONSIBLE THREAD ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      const updatedThreadRow = await query("UPDATE thread SET id_user_responsible = ?, status = 'in process' WHERE id = ?", [
        req.body.data.id_user_responsible,
        req.body.data.id_thread,
      ]);
      const updatedMessageRow = await query("UPDATE thread_message SET to_id_user = ?, is_read = 1 WHERE id_thread = ?", [
        req.body.data.id_user_responsible,
        req.body.data.id_thread,
      ]);

      await commit();
      res.send({ updatedThreadRow, updatedMessageRow });
      conn.release();
    } catch (err) {
      await rollback();
      conn.release();
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
      const updatedRow = await query("UPDATE thread_message SET is_read = 1 WHERE to_id_user = ? AND id_thread = ?", [req.body.data.to_id_user, req.body.data.id_thread]);
      res.send(updatedRow);
      conn.release();
    } catch (err) {
      conn.release();
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
      const updatedRow = await query("UPDATE thread_message SET is_deleted = 1 WHERE to_id_user = ? AND from_id_user = ?", [req.body.data.to_id_user, req.body.data.from_id_user]);
      res.send(updatedRow);
      conn.release();
    } catch (err) {
      conn.release();
      throw err;
    }
  });
});

module.exports = router;
