var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { requireAdmin, ADMIN_ROLE_ID, GESTOR_ROLE_ID, USER_ROLE_ID } = require("../utils/permissions");

const query = util.promisify(db.query).bind(db);

// Qualquer utilizador autenticado lê as funções (precisa delas para mostrar o nome); criar, editar e apagar é só Admin
router.get("/read", async (req, res) => {
  try {
    res.send(await query("SELECT * FROM role"));
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Error" });
  }
});

router.post("/create", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.data?.name || "").trim();
    if (!name) return res.status(400).send({ message: "The name is required" });
    res.send(await query("INSERT INTO role SET ?", { name }));
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error" });
  }
});

router.post("/update", requireAdmin, async (req, res) => {
  try {
    const { id } = req.body.data || {};
    const name = String(req.body.data?.name || "").trim();
    if (!id || !name) return res.status(400).send({ message: "The name is required" });
    if (id === ADMIN_ROLE_ID) return res.status(400).send({ message: "The Admin role cannot be changed" });
    if (id === USER_ROLE_ID) return res.status(400).send({ message: "The User role cannot be renamed, only its permissions can be changed" });
    if (id === GESTOR_ROLE_ID) return res.status(400).send({ message: "The Gestor role cannot be renamed, only its permissions can be changed" });
    res.send(await query("UPDATE role SET name = ? WHERE id = ?", [name, id]));
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error" });
  }
});

// Não se apagam o Admin nem o Utilizador (a função que o registo atribui), nem uma função que ainda tenha utilizadores (ficavam com uma função inexistente).
// As permissões da função apagam-se em cascata.
router.post("/delete", requireAdmin, async (req, res) => {
  try {
    const id = req.body.data?.id;
    if (id === ADMIN_ROLE_ID) return res.status(400).send({ message: "The Admin role cannot be deleted" });
    // O Gestor tem o acesso definido no código pelo id: não se apaga
    if (id === GESTOR_ROLE_ID) return res.status(400).send({ message: "The Gestor role cannot be deleted" });
    if (id === USER_ROLE_ID) return res.status(400).send({ message: "The User role cannot be deleted" });
    const used = await query("SELECT COUNT(*) AS n FROM user WHERE id_role = ? AND is_deleted = 0", [id]);
    if (used[0].n > 0) return res.status(400).send({ message: "A role with users cannot be deleted. Change their role first" });
    res.send(await query("DELETE FROM role WHERE id = ?", [id]));
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error" });
  }
});

module.exports = router;
