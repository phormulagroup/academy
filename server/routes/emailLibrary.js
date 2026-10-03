var express = require("express");
var util = require("util");
var router = express.Router();
var db = require("../utils/database");
const { hasPermission, denied } = require("../utils/permissions");

const query = util.promisify(db.query).bind(db);

// Biblioteca do editor de e-mails (blocos e modelos guardados), usada pelo editor das Comunicações e dos Templates: quem pode ler/editar
// qualquer um dos dois pode ler/gravar aqui.
const RESOURCES = ["communication", "email_template"];
const can = async (user, action) => {
  for (const resource of RESOURCES) if (await hasPermission(user, resource, action)) return true;
  return false;
};
const require_ = (action) => async (req, res, next) => {
  try {
    if (!(await can(req.user, action))) return denied(res);
    next();
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error" });
  }
};

// Até correr a migração 2026-10-06-email-library.sql a biblioteca está vazia (e não deixa gravar), sem partir o editor
let ready = false;
let checkedAt = 0;
let pending = null;
async function libraryReady() {
  if (ready) return true;
  if (pending) return pending;
  if (Date.now() - checkedAt < 30 * 1000) return false;
  checkedAt = Date.now();
  pending = query("SHOW TABLES LIKE 'email_library'")
    .then((rows) => (ready = rows.length > 0))
    .catch(() => false)
    .finally(() => (pending = null));
  return pending;
}

const KINDS = ["block", "template"];

router.get("/read", require_("read"), async (req, res) => {
  try {
    if (!(await libraryReady())) return res.send({ available: false, rows: [] });
    const kind = KINDS.includes(req.query.kind) ? req.query.kind : null;
    // Na lista, os blocos levam o conteúdo (são pequenos); os modelos só o HTML de pré-visualização (o projeto lê-se ao usar)
    const rows = await query(
      `SELECT l.id, l.kind, l.name, IF(l.kind = 'block', l.content, NULL) AS content, l.html, l.created_at, l.created_by, u.name AS created_by_name
       FROM email_library l LEFT JOIN user u ON u.id = l.created_by ${kind ? "WHERE l.kind = ?" : ""} ORDER BY l.created_at DESC`,
      kind ? [kind] : [],
    );
    res.send({ available: true, rows });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

router.get("/readById", require_("read"), async (req, res) => {
  try {
    if (!(await libraryReady())) return res.status(404).send({ message: "Not found" });
    const [row] = await query("SELECT id, kind, name, content, html FROM email_library WHERE id = ?", [req.query.id]);
    if (!row) return res.status(404).send({ message: "Not found" });
    res.send(row);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

router.post("/create", require_("update"), async (req, res) => {
  try {
    if (!(await libraryReady())) return res.status(503).send({ message: "The library is not available yet (database migration pending)" });
    const { kind, name, content, html } = req.body.data || {};
    if (!KINDS.includes(kind)) return res.status(400).send({ message: "Invalid kind" });
    if (!String(name || "").trim()) return res.status(400).send({ message: "A name is required" });
    if (!content) return res.status(400).send({ message: "No content" });
    const result = await query("INSERT INTO email_library SET ?", { kind, name: String(name).trim().slice(0, 255), content: typeof content === "string" ? content : JSON.stringify(content), html: kind === "template" ? html || null : null, created_by: req.user.id });
    res.send({ id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

router.post("/update", require_("update"), async (req, res) => {
  try {
    const { id, name } = req.body.data || {};
    if (!String(name || "").trim()) return res.status(400).send({ message: "A name is required" });
    await query("UPDATE email_library SET name = ? WHERE id = ?", [String(name).trim().slice(0, 255), id]);
    res.send({ updated: true });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

router.post("/delete", require_("update"), async (req, res) => {
  try {
    await query("DELETE FROM email_library WHERE id = ?", [req.body.data?.id]);
    res.send({ deleted: true });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server.", error: e.message });
  }
});

module.exports = router;
