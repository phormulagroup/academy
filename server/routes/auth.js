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
const { notifyUser, notifyTeam, appUrl } = require("../utils/notify");
const { mergeName } = require("../utils/userName");

const saltRounds = 10;

// Travão a tentativas em massa, por e-mail. Cada fluxo tem os seus limites; o scope é também o "limit" devolvido ao front com o tempo de espera.
// Pedir um código novo não depende dos códigos errados (são pedidos distintos): o código novo chega, mas só se valida no fim desse bloqueio.
const loginThrottle = createThrottle({ scope: "login", windowMs: 15 * 60 * 1000, max: 10 });
const loginCodeRequests = createThrottle({ scope: "otp_send", windowMs: 60 * 60 * 1000, max: 5 });
const loginCodeThrottle = createThrottle({ scope: "otp", windowMs: 15 * 60 * 1000, max: 5 });
const recoverRequests = createThrottle({ scope: "recover", windowMs: 60 * 60 * 1000, max: 5 });
const codeThrottle = createThrottle({ scope: "code", windowMs: 15 * 60 * 1000, max: 5 });
// Verificação em dois passos (2FA): validade do código enviado no login
const LOGIN_CODE_MINUTES = 10;
// Validade do código pedido em "Recuperar password"
const RECOVER_CODE_MINUTES = 15;
// IP de quem faz o pedido (atrás da Cloudflare vem em CF-Connecting-IP); serve para mostrar e, com TRUST_PROXY, para bloquear
const clientIp = (req) => String(req.headers["cf-connecting-ip"] || req.ip || "").slice(0, 64);
const emailKey = (value) => String(value || "").trim().toLowerCase();
// Mensagens de bloqueio, uma por tipo de limite (o front mostra também quanto falta)
const TOO_MANY_PASSWORDS = "Too many wrong passwords. Wait before trying again.";
const TOO_MANY_CODES = "Too many wrong codes. Wait before verifying again.";
const TOO_MANY_REQUESTS = "Too many code requests. Wait before requesting a new code.";
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

// 2FA: gera um código de 6 dígitos, guarda o hash com a validade e envia-o por e-mail (template "login_code", no idioma do utilizador)
async function sendLoginCode(query, user) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const hash = await bcrypt.hash(code, saltRounds);
  await query("UPDATE user SET login_code = ?, login_code_expires = NOW() + INTERVAL ? MINUTE WHERE id = ?", [hash, LOGIN_CODE_MINUTES, user.id]);
  await notifyUser("login_code", user, { login_code: code, minutes: LOGIN_CODE_MINUTES }, { strict: true });
}

router.post("/login", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    let data = req.body.data || {};
    const key = emailKey(data.email);
    // retry_after: segundos até poder tentar outra vez (o front mostra a contagem e desativa o botão); limit: qual dos limites
    const wait = await loginThrottle.blocked(key, clientIp(req));
    if (wait) return res.status(429).send({ user: null, message: TOO_MANY_PASSWORDS, limit: "login", retry_after: wait });
    // Pendentes/não aprovados estão inativos (is_deleted = 1) mas continuam a ser encontrados para receberem a mensagem do estado
    const user = await query(
      "SELECT * FROM user WHERE email = ? AND (is_deleted = 0 OR status != 'approved') ORDER BY is_deleted ASC, id DESC",
      [data.email],
    );
    // 1.º o e-mail: sem conta, nem chega a verificar a password (o limite de tentativas é só para a password)
    if (user.length === 0) return res.send({ user: null, message: "This user does not exist on our database!" });
    // 2.º a password
    const comparePassword = await bcrypt.compare(String(data.password ?? ""), user[0].password || DUMMY_HASH);
    if (comparePassword) {
      await loginThrottle.reset(key);
      // Contas aprovadas e ativas: 2FA, a sessão só é entregue depois de confirmar o código enviado por e-mail (/verifyLoginCode)
      if (user[0].status === "approved" && user[0].is_deleted === 0) {
        // Cada login com sucesso envia um código: conta para o mesmo limite de pedidos do Reenviar
        const sendWait = await loginCodeRequests.blocked(key, clientIp(req));
        if (sendWait) return res.status(429).send({ user: null, message: TOO_MANY_REQUESTS, limit: "otp_send", retry_after: sendWait });
        await loginCodeRequests.fail(key, clientIp(req));
        await sendLoginCode(query, user[0]);
        // retry_after: se este foi o último pedido permitido, o Reenviar do passo do código já aparece bloqueado
        return res.send({ user: null, otp_required: true, email: user[0].email, name: user[0].name, retry_after: await loginCodeRequests.blocked(key, clientIp(req)) });
      }
      // Pendentes/não aprovadas: não entram (sem sessão nem código); só o estado, para o front mostrar a mensagem certa
      res.send({ user: null, status: user[0].status });
    } else {
      await loginThrottle.fail(key, clientIp(req));
      // Esta falha esgotou as tentativas: avisa já com o tempo de espera
      const waitAfter = await loginThrottle.blocked(key, clientIp(req));
      if (waitAfter) return res.status(429).send({ user: null, message: TOO_MANY_PASSWORDS, limit: "login", retry_after: waitAfter });
      res.send({ user: null, message: "The password is not correct, try again." });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
});

// 2FA: confirma o código enviado por e-mail no login e, se estiver certo e dentro da validade, entrega a sessão (token)
router.post("/verifyLoginCode", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data || {};
    const key = emailKey(data.email);
    const ip = clientIp(req);
    const wait = await loginCodeThrottle.blocked(key, ip);
    if (wait) return res.status(429).send({ user: null, message: TOO_MANY_CODES, limit: "otp", retry_after: wait });
    const user = await query("SELECT * FROM user WHERE email = ? AND is_deleted = 0 AND status = 'approved'", [data.email]);
    if (user.length === 0 || !user[0].login_code) return res.send({ user: null, restart: true, message: "Your verification session ended, log in again." });
    if (new Date(user[0].login_code_expires) < new Date()) return res.send({ user: null, expired: true, message: "The verification code has expired, request a new one." });
    const valid = typeof data.code === "string" && /^\d{6}$/.test(data.code) && (await bcrypt.compare(data.code, user[0].login_code));
    if (!valid) {
      // À 5.ª falha fica bloqueado até ao fim da janela (15 min desde a 1.ª falha). Continua no passo do código, com a contagem; o código
      // não precisa de ser anulado: vale 10 min desde o envio, por isso já expirou quando o bloqueio acaba e aí pede-se outro (Reenviar)
      if ((await loginCodeThrottle.fail(key, ip)) >= 5) {
        return res.status(429).send({ user: null, message: TOO_MANY_CODES, limit: "otp", retry_after: await loginCodeThrottle.blocked(key, ip) });
      }
      return res.send({ user: null, message: "The verification code is not correct, try again." });
    }
    await query("UPDATE user SET login_code = NULL, login_code_expires = NULL WHERE id = ?", [user[0].id]);
    await loginCodeThrottle.reset(key);
    const token = await createToken(user[0]);
    res.send({ user: user[0], token, message: "Welcome " + user[0].name + "!" });
  } catch (err) {
    throw err;
  }
});

// 2FA: reenvia um código novo. Só para quem acabou de acertar a password (há um código pendente), com limite por hora
router.post("/resendLoginCode", async (req, res, next) => {
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data || {};
    const key = emailKey(data.email);
    const ip = clientIp(req);
    // Limite de pedidos de código do 2FA (partilhado com o login). Com códigos errados a mais o código novo é enviado na mesma, mas só se
    // valida no fim desse bloqueio
    const wait = await loginCodeRequests.blocked(key, ip);
    if (wait) return res.status(429).send({ status: false, message: TOO_MANY_REQUESTS, limit: "otp_send", retry_after: wait });
    await loginCodeRequests.fail(key, ip);
    const user = await query("SELECT * FROM user WHERE email = ? AND is_deleted = 0 AND status = 'approved' AND login_code IS NOT NULL", [data.email]);
    if (user.length === 0) return res.send({ status: false, restart: true, message: "Your verification session ended, log in again." });
    await sendLoginCode(query, user[0]);
    // Se este foi o último pedido permitido, o front já mostra quando pode pedir outro
    res.send({ status: true, retry_after: await loginCodeRequests.blocked(key, ip) });
  } catch (err) {
    throw err;
  }
});

const REGISTER_FIELDS =["name", "email", "password", "country", "gender", "birth_date", "bial_starting_date", "academic_background", "id_lang"];

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
        // E a equipa (Admin e quem pode ver os utilizadores) fica a saber que há um registo para aprovar
        notifyTeam("registration_new", "user", { name: data.name || "", email: data.email, country: data.country || "—", id_user: insertedRow.insertId }).catch((err) => console.error("[notify:registration_new]", err.message));
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
      // Pedidos de código de recuperação (Enviar código e Reenviar partilham o limite). Com códigos errados a mais o código novo é enviado
      // na mesma, mas só se valida no fim desse bloqueio
      const wait = await recoverRequests.blocked(emailKey(data.email), clientIp(req));
      if (wait) {
        await commit();
        conn.release();
        return res.status(429).send({ status: false, message: TOO_MANY_REQUESTS, limit: "recover", retry_after: wait });
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
          await query("UPDATE user SET recover_code = ?, recover_code_expires = NOW() + INTERVAL ? MINUTE WHERE id = ?", [codeEncrypt, RECOVER_CODE_MINUTES, user[0].id]);
          const emailResult = await email.recover({ ...user[0], code: code, minutes: RECOVER_CODE_MINUTES, url: `${appUrl()}/recover` });
          await commit();
          conn.release();
          // Se este foi o último pedido permitido, o front já mostra quando pode pedir outro
          res.send({ status: true, retry_after: await recoverRequests.blocked(emailKey(data.email), clientIp(req)) });
        }
      } else {
        await commit();
        conn.release();
        res.send({ status: false, message: "This e-mail does not exists in our database!" });
      }
    } catch (err) {
      await rollback();
      conn.release();
            console.error(err);
      throw err;
    }
  });
});

// Confere o código de recuperação enviado por e-mail, com limite de tentativas: à 5.ª falha o código é anulado e é preciso pedir outro
async function checkRecoverCode(email, code, ip) {
  const query = util.promisify(db.query).bind(db);
  const key = emailKey(email);
  const wait = await codeThrottle.blocked(key, ip);
  if (wait) return { ok: false, message: TOO_MANY_CODES, retry_after: wait };
  const user = await query("SELECT * FROM user WHERE email = ? AND is_deleted = 0", [email]);
  if (user.length === 0) return { ok: false, message: "This user does not exist on our database!" };
  if (!user[0].recover_code) return { ok: false, message: "You will need to require a recover code first." };
  // Como no 2FA: código fora da validade não conta como tentativa errada, é preciso pedir outro (sem data = código de acesso, não expira)
  if (user[0].recover_code_expires && new Date(user[0].recover_code_expires) < new Date())
    return { ok: false, expired: true, message: "The recover code has expired, request a new one." };
  if (typeof code === "string" && code !== "" && (await bcrypt.compare(code, user[0].recover_code))) return { ok: true, user: user[0] };
  if (await codeThrottle.fail(key, ip) >= 5) {
    await query("UPDATE user SET recover_code = NULL, recover_code_expires = NULL WHERE id = ?", [user[0].id]);
    return { ok: false, message: TOO_MANY_CODES, retry_after: await codeThrottle.blocked(key, ip) };
  }
  return { ok: false, message: "The recover code is not correct, try again." };
}

router.post("/verifyRecoverCode", async (req, res, next) => {
  try {
    const data = req.body.data || {};
    const result = await checkRecoverCode(data.email, data.code, clientIp(req));
    if (result.ok) res.send({ user: true, message: "The recover code is correct, now you will need to choose your new password!" });
    else res.status(result.retry_after ? 429 : 200).send({ user: false, message: result.message, expired: result.expired, limit: result.retry_after ? "code" : undefined, retry_after: result.retry_after });
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
    if (!result.ok) return res.status(result.retry_after ? 429 : 200).send({ status: false, message: result.message, expired: result.expired, limit: result.retry_after ? "code" : undefined, retry_after: result.retry_after });
    const hash = await bcrypt.hash(data.password, saltRounds);
    await query("UPDATE user SET recover_code = NULL, recover_code_expires = NULL, password = ? WHERE id = ?", [hash, result.user.id]);
    await codeThrottle.reset(emailKey(data.email));
    await loginThrottle.reset(emailKey(data.email));
    notifyUser("password_changed", result.user);
    res.send({ status: true, message: "Congrats! You have a new password, now you can login!" });
  } catch (err) {
    throw err;
  }
});

module.exports = router;
