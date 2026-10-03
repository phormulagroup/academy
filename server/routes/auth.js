var express = require("express");
var dayjs = require("dayjs");
var router = express.Router();
const util = require("util");
const bcrypt = require("bcryptjs");

var db = require("../utils/database");
const crypto = require("crypto");
const { verifyToken, createToken, passwordFingerprint } = require("../utils/token");
const { createThrottle } = require("../utils/throttle");
const email = require("../utils/email");
const { notifyUser } = require("../utils/notify");
const { mergeName } = require("../utils/userName");

const saltRounds = 10;

// Travão a tentativas em massa, por e-mail: o login e a verificação do código de recuperação (5 falhas em 15 minutos) e os pedidos de código (5 por hora)
const loginThrottle = createThrottle({ scope: "login", windowMs: 15 * 60 * 1000, max: 10 });
const codeThrottle = createThrottle({ scope: "code", windowMs: 15 * 60 * 1000, max: 5 });
const recoverRequests = createThrottle({ scope: "recover", windowMs: 60 * 60 * 1000, max: 5 });
// IP de quem faz o pedido (atrás da Cloudflare vem em CF-Connecting-IP); serve para mostrar e, com TRUST_PROXY, para bloquear
const clientIp = (req) => String(req.headers["cf-connecting-ip"] || req.ip || "").slice(0, 64);
const emailKey = (value) => String(value || "").trim().toLowerCase();
const TOO_MANY = "Too many attempts, try again in a few minutes.";
// Hash de uma password qualquer: o login gasta o mesmo tempo quer o e-mail exista ou não
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", saltRounds);

router.post("/verifyToken", async (req, res, next) => {
  try {
    let token = req.body.data;
    const result = await verifyToken(token);
    if (result.token_valid) {
      const query = util.promisify(db.query).bind(db);
      const user = await query("SELECT * FROM user WHERE id = ?", result.token_decoded.id);
      if (user.length > 0) {
        // O token traz a impressão digital da password (pv); os antigos traziam o hash e continuam a valer até expirarem
        const decoded = result.token_decoded;
        const samePassword = decoded.pv !== undefined ? decoded.pv === passwordFingerprint(user[0].password) : user[0].password === decoded.password;
        if (user[0].email === decoded.email && samePassword && user[0].is_deleted === 0) {
          res.send({ token_valid: true, user: user[0] });
        } else {
          res.status(401).send("Invalid Token");
        }
      } else {
        res.status(401).send("Invalid Token");
      }
    } else {
      return res.status(401).send("Invalid Token");
    }
  } catch (err) {
    throw err;
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    let data = req.body.data || {};
    const key = emailKey(data.email);
    if (await loginThrottle.blocked(key, clientIp(req))) return res.status(429).send({ user: null, message: TOO_MANY });
    // Pendentes/não aprovados estão inativos (is_deleted = 1) mas continuam a ser encontrados para receberem a mensagem do estado
    const user = await query(
      "SELECT * FROM user WHERE email = ? AND (is_deleted = 0 OR status != 'approved') ORDER BY is_deleted ASC, id DESC",
      [data.email],
    );
    const comparePassword = await bcrypt.compare(String(data.password ?? ""), user.length > 0 ? user[0].password || DUMMY_HASH : DUMMY_HASH);
    if (user.length > 0 && comparePassword) {
      await loginThrottle.reset(key);
      // Só contas aprovadas e ativas recebem token (pendentes/não aprovadas só recebem o estado)
      const token = user[0].status === "approved" && user[0].is_deleted === 0 ? await createToken(user[0]) : null;
      res.send({ user: user[0], token, message: "Welcome " + user[0].name + "!" });
    } else {
      await loginThrottle.fail(key, clientIp(req));
      // A mesma resposta para "e-mail inexistente" e "password errada": não revela quais e-mails têm conta
      res.send({ user: null, message: "The password is not correct, try again." });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
});

const REGISTER_FIELDS = ["name", "email", "password", "country", "gender", "birth_date", "bial_starting_date", "academic_background", "id_lang"];

router.post("/register", async (req, res, next) => {

  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Some error on server.", error });
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      // Nome + Apelido do formulário → coluna name
      const merged = mergeName(req.body.data || {});
      // Só os campos do formulário de registo: nunca a função, o estado ou outros campos escolhidos pelo cliente
      const data = {};
      for (const field of REGISTER_FIELDS) if (merged[field] !== undefined) data[field] = merged[field];
      if (!data.email || typeof data.password !== "string" || data.password.length < 8) {
        await commit();
        conn.release();
        return res.status(400).send({ message: "E-mail and a password of at least 8 characters are required" });
      }
      // Contas pendentes/não aprovadas (inativas) também bloqueiam o e-mail
      const user = await query("SELECT * FROM user WHERE email = ? AND (is_deleted = 0 OR status != 'approved')", [data.email]);
      if (user.length > 0) {
        await commit();
        conn.release();
        res.send({ message: "This e-mail already exists in our database!" });
      } else {
        // Novo registo: estado pendente e atividade inativa (is_deleted = 1) até ser aprovado
        data.status = "pending";
        data.is_deleted = 1;
        data.password = await bcrypt.hash(data.password, saltRounds);
        const insertedRow = await query("INSERT INTO user SET ?", data);
        // "Registo recebido": à parte, um e-mail que falhe nunca desfaz o registo
        notifyUser("registration_received", data);
        await commit();
        conn.release();
        res.send(insertedRow);
      }
    } catch (err) {
      await rollback();
      conn.release();
      throw err;
    }
  });
});

router.post("/recover", async (req, res, next) => {

  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Some error on server.", error });
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      let data = req.body.data || {};
      if (await recoverRequests.blocked(emailKey(data.email), clientIp(req))) {
        await commit();
        conn.release();
        return res.status(429).send({ status: false, message: TOO_MANY });
      }
      await recoverRequests.fail(emailKey(data.email), clientIp(req));
      // Pendentes/não aprovados (inativos) recebem a mensagem do estado em vez de "e-mail inexistente"
      const user = await query(
        "SELECT * FROM user WHERE email = ? AND (is_deleted = 0 OR status != 'approved') ORDER BY is_deleted ASC, id DESC",
        [data.email],
      );
      if (user.length > 0) {
        if (user[0].status !== "approved") {
          await commit();
          conn.release();
          res.send({
            status: false,
            message:
              user[0].status === "pending"
                ? "This account is waiting for approval, contact your representative for more information"
                : "This account is not approved, contact your representative for more information",
          });
        } else {
          let code = "";
          let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          let charactersLength = characters.length;
          for (var i = 0; i < 6; i++) {
            code += characters.charAt(crypto.randomInt(charactersLength));
          }
          const codeEncrypt = await bcrypt.hash(code, saltRounds);
          await query("UPDATE user SET recover_code = ? WHERE id = ?", [codeEncrypt, user[0].id]);
          const emailResult = await email.recover({ ...user[0], code: code });
          await commit();
          conn.release();
          res.send({ status: true });
        }
      } else {
        await commit();
        conn.release();
        res.send({ status: false, message: "This e-mail does not exists in our database!" });
      }
    } catch (err) {
      await rollback();
      conn.release();
      throw err;
    }
  });
});

// Confere o código de recuperação enviado por e-mail, com limite de tentativas: à 5.ª falha o código é anulado e é preciso pedir outro
async function checkRecoverCode(email, code, ip) {
  const query = util.promisify(db.query).bind(db);
  const key = emailKey(email);
  if (await codeThrottle.blocked(key, ip)) return { ok: false, message: TOO_MANY };
  const user = await query("SELECT * FROM user WHERE email = ? AND is_deleted = 0", [email]);
  if (user.length === 0) return { ok: false, message: "This user does not exist on our database!" };
  if (!user[0].recover_code) return { ok: false, message: "You will need to require a recover code first." };
  if (typeof code === "string" && code !== "" && (await bcrypt.compare(code, user[0].recover_code))) return { ok: true, user: user[0] };
  if (await codeThrottle.fail(key, ip) >= 5) await query("UPDATE user SET recover_code = NULL WHERE id = ?", [user[0].id]);
  return { ok: false, message: "The recover code is not correct, try again." };
}

router.post("/verifyRecoverCode", async (req, res, next) => {
  try {
    const data = req.body.data || {};
    const result = await checkRecoverCode(data.email, data.code, clientIp(req));
    if (result.ok) res.send({ user: true, message: "The recover code is correct, now you will need to choose your new password!" });
    else res.status(result.message === TOO_MANY ? 429 : 200).send({ user: false, message: result.message });
  } catch (err) {
    throw err;
  }
});

// Nova password: exige o código de recuperação (o mesmo que foi verificado no passo anterior) e só o aceita uma vez
router.post("/password", async (req, res, next) => {
  try {
    const data = req.body.data || {};
    if (typeof data.password !== "string" || data.password.length < 8) return res.status(400).send({ status: false, message: "The password must have at least 8 characters" });
    const query = util.promisify(db.query).bind(db);
    const result = await checkRecoverCode(data.email, data.code, clientIp(req));
    if (!result.ok) return res.status(result.message === TOO_MANY ? 429 : 200).send({ status: false, message: result.message });
    const hash = await bcrypt.hash(data.password, saltRounds);
    await query("UPDATE user SET recover_code = NULL, password = ? WHERE id = ?", [hash, result.user.id]);
    await codeThrottle.reset(emailKey(data.email));
    await loginThrottle.reset(emailKey(data.email));
    notifyUser("password_changed", result.user);
    res.send({ status: true, message: "Congrats! You have a new password, now you can login!" });
  } catch (err) {
    throw err;
  }
});

module.exports = router;
