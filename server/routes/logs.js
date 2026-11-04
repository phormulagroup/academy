var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var db = require("../utils/database");
const { requireStaff } = require("../utils/permissions");

router.get("/read", requireStaff(), async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT logs.*, user.name, user.email FROM logs LEFT JOIN user ON user.id = logs.modified_by");
    res.send(rows);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server." });
  }
});

router.get("/readByParams", requireStaff(), async (req, res) => {
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
    console.error(e);
    res.status(500).send({ message: "Some error on server." });
  }
});

// Registo de uma ação feita na app. Só se aceita o que a webapp envia, com o tamanho limitado, e o utilizador é SEMPRE quem faz o pedido (antes
// o corpo ia tal e qual para a tabela: qualquer pessoa registava ações em nome de outra, ou escolhia colunas como a data)
const text = (value, max) => (typeof value === "string" || typeof value === "number" ? String(value).slice(0, max) : null);
router.post("/create", async (req, res) => {
  const query = util.promisify(db.query).bind(db);
  try {
    const body = req.body.data || {};
    const action = text(body.action, 255);
    if (!action) return res.status(400).send({ message: "Invalid request" });
    const idLang = Number(body.id_lang);
    const rows = await query("INSERT INTO logs SET ?", {
      id_user: req.user.id,
      action,
      table_name: text(body.table_name, 255),
      meta_data: typeof body.meta_data === "string" ? body.meta_data.slice(0, 500000) : null,
      id_lang: Number.isInteger(idLang) && idLang > 0 ? idLang : null,
    });
    res.send(rows);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server." });
  }
});

module.exports = router;
