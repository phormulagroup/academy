var express = require("express");
var dayjs = require("dayjs");
var customParseFormat = require("dayjs/plugin/customParseFormat");
var util = require("util");
var bcrypt = require("bcryptjs");
var crypto = require("crypto");
var db = require("../utils/database");
var email = require("../utils/email");
const { appUrl } = require("../utils/notify");
const { requirePermission } = require("../utils/permissions");

dayjs.extend(customParseFormat);

var router = express.Router();
const saltRounds = 10;
const poolQuery = util.promisify(db.query).bind(db);

// Campos que o ficheiro pode trazer para um utilizador: o assistente só deixa associar colunas a estes (nunca às colunas cruas
// da tabela, para uma coluna "id_role" ou "is_deleted" do ficheiro não chegar à base de dados). `label` é a chave de tradução.
const USER_FIELDS = [
  { Field: "first_name", label: "First Name", required: "name", example: "Maria" },
  { Field: "last_name", label: "Last Name", required: "name", example: "Silva" },
  { Field: "name", label: "Full name", required: "name", example: "Maria Silva" },
  { Field: "email", label: "E-mail", required: true, example: "maria.silva@exemplo.com" },
  { Field: "language", label: "Language", example: "pt" },
  { Field: "country", label: "Country", example: "Portugal" },
  { Field: "gender", label: "Gender", example: "Female" },
  { Field: "birth_date", label: "Birth date", example: "1990-05-21" },
  { Field: "academic_background", label: "Academic background", example: "University Degree" },
  { Field: "bial_starting_date", label: "Bial's starting date", example: "2024-01-15" },
];

router.get("/fields", requirePermission("user", "create"), (req, res) => {
  if (req.query.table !== "user") return res.status(400).send({ message: "Invalid table" });
  res.send({ fields: USER_FIELDS });
});

const GENDERS = { male: "Male", masculino: "Male", m: "Male", female: "Female", feminino: "Female", f: "Female", "prefer not to say": "Prefer not to say", "prefiro não dizer": "Prefer not to say" };
const BACKGROUNDS = {
  "secondary school": "Secondary School",
  "ensino secundário": "Secondary School",
  "university degree": "University Degree",
  licenciatura: "University Degree",
  phd: "PhD",
  doutoramento: "PhD",
  other: "Other",
  outro: "Other",
};

const text = (value) => (value === null || value === undefined ? "" : String(value).trim());

function parseDate(value) {
  const raw = text(value);
  if (!raw) return { value: null };
  const parsed = dayjs(raw, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "YYYY/MM/DD"], true);
  return parsed.isValid() ? { value: parsed.format("YYYY-MM-DD") } : { error: true };
}

// Importa utilizadores em lote. Cada linha é validada e ou fica em `inserted` ou em `skipped` com o motivo (reason); nada é
// inserido por metade. Os novos utilizadores ficam aprovados e ativos, com uma palavra-passe aleatória que ninguém conhece; opcionalmente
// recebem o e-mail de recuperação com o código para definirem a sua (a mesma recuperação de "Esqueci-me da palavra-passe").
router.post("/user", requirePermission("user", "create"), (req, res) => {
  db.getConnection(async (error, conn) => {
    if (error) return res.status(500).send({ message: "Error" });
    const query = util.promisify(conn.query).bind(conn);
    try {
      await util.promisify(conn.beginTransaction).bind(conn)();
      const rows = Array.isArray(req.body.data?.values) ? req.body.data.values : [];
      const sendEmails = req.body.data?.sendEmails !== false;

      const languages = await query("SELECT id, code, is_default, country FROM language");
      const defaultLanguage = languages.find((l) => l.is_default === 1) ?? languages[0];
      const existing = new Set((await query("SELECT email FROM user")).map((u) => String(u.email).toLowerCase()));

      const toInsert = [];
      const skipped = [];
      const skip = (row, reason) => skipped.push({ row, reason });

      for (const row of rows) {
        const emailValue = text(row.email).toLowerCase();
        const name = text(row.name) || [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ");
        if (!name) {
          skip(row, "missing_name");
          continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
          skip(row, "invalid_email");
          continue;
        }
        if (existing.has(emailValue)) {
          skip(row, "already_exists");
          continue;
        }

        const languageValue = text(row.language ?? row.id_lang).toLowerCase();
        const language = languageValue ? languages.find((l) => l.code.toLowerCase() === languageValue || String(l.id) === languageValue) : defaultLanguage;
        if (!language) {
          skip(row, "invalid_language");
          continue;
        }

        let country = text(row.country) || null;
        if (country) {
          const allowed = JSON.parse(language.country || "[]");
          country = allowed.find((c) => c.toLowerCase() === country.toLowerCase());
          if (!country) {
            skip(row, "invalid_country");
            continue;
          }
        }
        const gender = text(row.gender) ? GENDERS[text(row.gender).toLowerCase()] : null;
        if (text(row.gender) && !gender) {
          skip(row, "invalid_gender");
          continue;
        }
        const background = text(row.academic_background) ? BACKGROUNDS[text(row.academic_background).toLowerCase()] : null;
        if (text(row.academic_background) && !background) {
          skip(row, "invalid_academic_background");
          continue;
        }
        const birth = parseDate(row.birth_date);
        const start = parseDate(row.bial_starting_date);
        if (birth.error || start.error) {
          skip(row, "invalid_date");
          continue;
        }

        existing.add(emailValue); // repetidos dentro do próprio ficheiro
        toInsert.push({
          name,
          email: emailValue,
          password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), saltRounds),
          id_role: 2,
          id_lang: language.id,
          country,
          gender,
          birth_date: birth.value,
          academic_background: background,
          bial_starting_date: start.value,
          status: "approved",
          is_deleted: 0,
        });
      }

      let inserted = [];
      if (toInsert.length > 0) {
        const columns = Object.keys(toInsert[0]);
        await query(`INSERT INTO user (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES ?`, [toInsert.map((u) => columns.map((c) => u[c]))]);
        inserted = await query("SELECT id, name, email, id_lang FROM user WHERE email IN (?)", [toInsert.map((u) => u.email)]);
      }
      await util.promisify(conn.commit).bind(conn)();
      conn.release();

      // Os e-mails saem depois de a importação estar guardada; falhar um e-mail nunca anula utilizadores já importados
      const emailResult = { sent: 0, failed: 0 };
      if (sendEmails) {
        for (const user of inserted) {
          try {
            const code = crypto.randomBytes(4).toString("hex").slice(0, 6);
            await poolQuery("UPDATE user SET recover_code = ? WHERE id = ?", [await bcrypt.hash(code, saltRounds), user.id]);
            // "Acesso à conta": o código para definir a password (antes reutilizava o e-mail de recuperação de password)
            const info = await email.notify({ type: "account_access", to: user.email, id_lang: user.id_lang, vars: { name: user.name, email: user.email, code, url: `${appUrl()}/recover` } });
            if (info === null) emailResult.failed++;
            else emailResult.sent++;
          } catch (err) {
            emailResult.failed++;
          }
        }
      }
      res.send({ inserted, skipped, emails: sendEmails ? emailResult : null });
    } catch (err) {
      console.error(err);
      await util.promisify(conn.rollback).bind(conn)().catch(() => {});
      conn.release();
      res.status(500).send({ message: "Error importing the users" });
    }
  });
});

module.exports = router;
