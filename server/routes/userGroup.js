var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const middleware = require("../utils/middleware");
const { requirePermission, requireStaff } = require("../utils/permissions");

const query = util.promisify(db.query).bind(db);

// Grupos de utilizadores: lista global, reutilizável em vários cursos (acesso restrito a utilizadores e grupos)
router.get("/read", middleware, requireStaff(), async (req, res) => {
  try {
    res.send(await query("SELECT * FROM user_group WHERE is_deleted = 0 ORDER BY name ASC"));
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Error" });
  }
});

router.post("/create", middleware, requirePermission("user_group", "create"), async (req, res) => {
  try {
    const name = String(req.body.data?.name || "").trim();
    if (!name) return res.status(400).send({ message: "The name is required" });
    res.send(await query("INSERT INTO user_group SET ?", { name }));
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Error" });
  }
});

router.post("/update", middleware, requirePermission("user_group", "update"), async (req, res) => {
  try {
    const { id } = req.body.data || {};
    const name = String(req.body.data?.name || "").trim();
    if (!id || !name) return res.status(400).send({ message: "The name is required" });
    res.send(await query("UPDATE user_group SET name = ? WHERE id = ?", [name, id]));
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Error" });
  }
});

// Soft delete: o grupo deixa de contar para o acesso aos cursos, mas os dados ficam
router.post("/delete", middleware, requirePermission("user_group", "delete"), async (req, res) => {
  try {
    res.send(await query("UPDATE user_group SET is_deleted = 1 WHERE id = ?", [req.body.data?.id]));
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Error" });
  }
});

// Membros de um grupo
router.get("/members", middleware, requireStaff(), async (req, res) => {
  try {
    res.send(
      await query(
        "SELECT user.id, user.name, user.email FROM user_group_member " +
          "INNER JOIN user ON user.id = user_group_member.id_user " +
          "WHERE user_group_member.id_group = ? AND user.is_deleted = 0",
        [req.query.id_group],
      ),
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Error" });
  }
});

// Substitui por completo a lista de membros de um grupo pela lista enviada
router.post("/setMembers", middleware, requirePermission("user_group", "update"), (req, res) => {
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Error" });
    const q = util.promisify(conn.query).bind(conn);
    try {
      await util.promisify(conn.beginTransaction).bind(conn)();
      const { id_group, id_users } = req.body.data || {};
      await q("DELETE FROM user_group_member WHERE id_group = ?", [id_group]);
      if (id_users?.length > 0) {
        await q("INSERT INTO user_group_member (id_group, id_user) VALUES ?", [id_users.map((id_user) => [id_group, id_user])]);
      }
      await util.promisify(conn.commit).bind(conn)();
      conn.release();
      res.send({ id_group, id_users: id_users || [] });
    } catch (e) {
      console.error(e);
      await util.promisify(conn.rollback).bind(conn)();
      conn.release();
      res.status(500).send({ message: "Error" });
    }
  });
});

module.exports = router;
