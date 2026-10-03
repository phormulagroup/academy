var express = require("express");
var util = require("util");
var router = express.Router();
var db = require("../utils/database");
const { validSignature, TOKEN_RE } = require("../utils/tracking");

const query = util.promisify(db.query).bind(db);

// Endpoint PÚBLICO (sem login): é aberto pelo programa de e-mail de quem clica no link. Nunca devolve dados.

// Clique: regista e segue para o endereço original (só links assinados por nós, e só http/https)
router.get("/c/:token", async (req, res) => {
  const { token } = req.params;
  const { u: url, s: signature } = req.query;
  let target;
  try {
    target = new URL(String(url));
  } catch {
    return res.status(400).send("Invalid link");
  }
  if (!TOKEN_RE.test(token) || !["http:", "https:"].includes(target.protocol) || !validSignature(token, String(url), signature)) return res.status(400).send("Invalid link");

  try {
    const [recipient] = await query("SELECT id, id_communication FROM communication_recipient WHERE token = ?", [token]);
    if (recipient) {
      await query("UPDATE communication_recipient SET click_count = click_count + 1, clicked_at = COALESCE(clicked_at, NOW()) WHERE id = ?", [recipient.id]);
      await query("INSERT INTO communication_click SET ?", { id_communication: recipient.id_communication, id_recipient: recipient.id, url: String(url).slice(0, 1000) });
    }
  } catch (err) {
    console.error(err.message);
  }
  res.set("Cache-Control", "no-store");
  res.redirect(302, target.toString());
});

module.exports = router;
