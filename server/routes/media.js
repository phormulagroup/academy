var express = require("express");
const dayjs = require("dayjs");
const util = require("util");
const fs = require("fs");
const path = require("path");
var fileUpload = require("express-fileupload");
const middleware = require("../utils/middleware");
const { uploadFile } = require("../utils/upload");
const { avatarFileName } = require("../utils/avatar");

var router = express.Router();
router.use(fileUpload());

var db = require("../utils/database");
const { requirePermission, hasPermission, denied } = require("../utils/permissions");

router.get("/read", middleware, requirePermission("media", "read"), (req, res) => {
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Some error on server.", error });
    try {
      const query = util.promisify(conn.query).bind(conn);
      const rows = await query("SELECT * FROM media WHERE type = 'multimedia' ORDER BY created_at DESC");
      res.send(rows);
      conn.release();
    } catch (e) {
      throw e;
    }
  });
});

// Dois usos: o avatar de um utilizador (data.id_user: o próprio ou quem pode editar utilizadores; fica com type "avatar",
// por isso não aparece na biblioteca de Multimédia) e o upload para a biblioteca (exige permissão em Multimédia)
router.post("/singleUpload", middleware, async (req, res) => {
  try {
    const data = req.body.data ? JSON.parse(req.body.data) : null;
    let fileName = null;

    if (data && data.id_user) {
      if (Number(data.id_user) !== req.user.id && !(await hasPermission(req.user, "user", "update"))) return denied(res);
    } else if (!(await hasPermission(req.user, "media", "create"))) {
      return denied(res);
    }

    // substitui o avatar atual do utilizador (se existir)
    if (data && data.id_user) {
      const query = util.promisify(db.query).bind(db);
      fileName = await avatarFileName(data.id_user, req.files.file.name.split(".").pop().toLowerCase());
      const user = await query("SELECT img FROM user WHERE id = ?", [data.id_user]);
      if (user[0].img && user[0].img !== fileName) {
        fs.unlink(path.join(__dirname, "..", "media", user[0].img), (err) => err && console.error(err));
        await query("DELETE FROM media WHERE name = ?", [user[0].img]);
      }
    }

    const fileResponse = await uploadFile(req.files.file, data && data.id_user ? "avatar" : "multimedia", fileName);
    res.send(fileResponse);
  } catch (e) {
    throw e;
  }
});

router.post("/upload", middleware, requirePermission("media", "create"), async (req, res) => {
  try {
    let files = req.files.file.length ? req.files.file : [req.files.file];

    files.forEach(async (file) => {
      await uploadFile(file);
    });

    res.send({ message: "Success, all files uploaded!" });
  } catch (e) {
    throw e;
  }
});

router.post("/delete", middleware, requirePermission("media", "delete"), (req, res) => {
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Some error on server.", error });
    let data = req.body.data;
    try {
      fs.unlink(path.join(__dirname, "..", "media", data.name), async (err) => {
        if (err) console.error(err);
        const query = util.promisify(conn.query).bind(conn);
        const deletedRow = await query("DELETE FROM media WHERE id = ?", data.id);
        res.send(deletedRow);
        conn.release();
      });
    } catch (err) {
      throw err;
    }
  });
});

module.exports = router;
