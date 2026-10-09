var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");
const middleware = require("../utils/middleware");

router.get("/read", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs ORDER BY position ASC, id ASC");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs WHERE id_lang = ? ORDER BY position ASC, id ASC", [req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readBySlug", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM faqs WHERE slug = ? AND id_lang = ?", [req.query.slug, req.query.id_lang]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.post("/create", middleware, requirePermission("faqs", "create"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    // Uma FAQ nova fica no fim da lista do seu idioma
    const last = await query("SELECT COALESCE(MAX(position), 0) AS position FROM faqs WHERE id_lang = ?", [data.id_lang]);
    const insertedRow = await query("INSERT INTO faqs SET ?", { ...data, position: last[0].position + 1 });
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", middleware, requirePermission("faqs", "update"), async (req, res, next) => {
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE faqs SET " + setClause(columns) + " WHERE id = ?", [...values, toId(whereId)]);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

// Guarda a ordem: `ids` são os ids de um idioma pela nova ordem. Só reordena FAQs do mesmo idioma.
router.post("/reorder", middleware, requirePermission("faqs", "update"), async (req, res) => {
  const ids = Array.isArray(req.body.data?.ids) ? req.body.data.ids.map(Number).filter(Number.isInteger) : [];
  if (ids.length === 0 || new Set(ids).size !== ids.length) return res.status(400).send({ message: "Invalid order" });
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Error" });
    const query = util.promisify(conn.query).bind(conn);
    try {
      await util.promisify(conn.beginTransaction).bind(conn)();
      const rows = await query("SELECT id, id_lang FROM faqs WHERE id IN (?)", [ids]);
      if (rows.length !== ids.length || new Set(rows.map((r) => r.id_lang)).size !== 1) {
        await util.promisify(conn.rollback).bind(conn)();
        conn.release();
        return res.status(400).send({ message: "Invalid order" });
      }
      for (let i = 0; i < ids.length; i++) await query("UPDATE faqs SET position = ? WHERE id = ?", [i + 1, ids[i]]);
      await util.promisify(conn.commit).bind(conn)();
      conn.release();
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      await util.promisify(conn.rollback).bind(conn)().catch(() => {});
      conn.release();
      res.status(500).send({ message: "Error" });
    }
  });
});

// A tabela faqs não tem is_deleted: apaga a FAQ de vez (como nas notificações)
router.post("/delete", middleware, requirePermission("faqs", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("DELETE FROM faqs WHERE id = ?", [toId(req.body.data.id)]);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
