var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");
const middleware = require("../utils/middleware");

// Segredos das definições SMTP: nunca saem da API (nem para quem tem permissão em Definições). Vai só `has_<campo>`, para a página saber se existem.
const SECRETS = ["password", "brevo_api_key"];
const parseMeta = (raw) => {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};

router.get("/read", middleware, requirePermission("settings", "read"), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM settings");
    res.send(
      rows.map((row) => {
        if (row.name_key !== "smtp") return row;
        const meta = parseMeta(row.meta_data);
        for (const key of SECRETS) {
          meta[`has_${key}`] = !!meta[key];
          delete meta[key];
        }
        return { ...row, meta_data: JSON.stringify(meta) };
      }),
    );
  } catch (e) {
    throw e;
  }
});

router.post("/create", middleware, requirePermission("settings", "create"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;

    const insertedRow = await query("INSERT INTO settings SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", middleware, requirePermission("settings", "update"), async (req, res, next) => {
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    // Segredo vazio = manter o guardado (a página nunca o recebe); os `has_*` são só da página
    if (data.meta_data) {
      const [row] = await util.promisify(db.query).bind(db)("SELECT name_key, meta_data FROM settings WHERE id = ?", [toId(whereId)]);
      if (row?.name_key === "smtp") {
        const old = parseMeta(row.meta_data);
        const next = parseMeta(data.meta_data);
        for (const key of SECRETS) {
          if (!next[key] && old[key]) next[key] = old[key];
          delete next[`has_${key}`];
        }
        data.meta_data = JSON.stringify(next);
      }
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE settings SET " + setClause(columns) + " WHERE id = ?", [...values, toId(whereId)]);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", middleware, requirePermission("settings", "delete"), async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE settings SET is_deleted = 1 WHERE id = ?", [toId(req.body.data.id)]);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
