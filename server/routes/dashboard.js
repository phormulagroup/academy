var express = require("express");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { requireStaff, hasPermission } = require("../utils/permissions");

const query = util.promisify(db.query).bind(db);

// Data/hora recebida no pedido (ISO) → Date, ou null se faltar ou for inválida
function parseInstant(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Quantos registos de acesso seguem para o painel (a lista só mostra os mais recentes, de 5 em 5); o total vem à parte
const LOGS_LIMIT = 100;

// Painel: as consultas correm em paralelo e só trazem as colunas que o painel usa. Antes trazia as tabelas inteiras (cursos com todo o
// conteúdo, utilizadores com todas as colunas e todos os registos de acesso com o seu meta_data, que chega aos 40 KB cada): mais de 1 MB
// por abertura, que numa base de dados remota demorava vários segundos.
router.get("/read", requireStaff(), async (req, res) => {
  try {
    const lang = Number(req.query.id_lang);
    if (!Number.isInteger(lang) || lang <= 0) return res.status(400).send({ message: "Invalid language" });

    // Intervalo de datas e horas opcional (from/to): limita a atividade dos alunos e os registos de acesso a esse período
    const from = parseInstant(req.query.from);
    const to = parseInstant(req.query.to);
    if ((req.query.from && !from) || (req.query.to && !to)) return res.status(400).send({ message: "Invalid date range" });
    const range = (column) => ({ sql: `${from ? ` AND ${column} >= ?` : ""}${to ? ` AND ${column} <= ?` : ""}`, params: [from, to].filter(Boolean) });
    const activityRange = range("cua.created_at");
    const logsRange = range("logs.created_at");

    const [users, courses, modules, topics, tests, activity, logs, [logsCount]] = await Promise.all([
      query("SELECT id, name, email, img, status, country, id_role, id_lang, created_at FROM user WHERE id_lang = ? AND is_deleted = 0", [lang]),
      query("SELECT id, name, settings, id_lang FROM course WHERE id_lang = ? AND is_deleted = 0", [lang]),
      query("SELECT course_module.id, course_module.id_course, course_module.title FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course.is_deleted = 0 AND course_module.is_deleted = 0", [lang]),
      query(
        "SELECT course_topic.id, course_topic.title, course_module.id_course FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
          "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_module.is_deleted = 0 AND course_topic.is_deleted = 0 AND course.is_deleted = 0",
        [lang],
      ),
      query(
        "SELECT course_test.id, course_test.title, course_test.settings, course_module.id_course FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
          "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_module.is_deleted = 0 AND course_test.is_deleted = 0 AND course.is_deleted = 0",
        [lang],
      ),
      // meta_data (as respostas) só dos testes concluídos: é o que alimenta os melhores alunos
      query(
        "SELECT cua.id, cua.id_user, cua.id_course, cua.id_course_module, cua.id_course_topic, cua.id_course_test, cua.activity_type, cua.is_completed, cua.created_at, " +
          "IF(cua.activity_type = 'test' AND cua.is_completed = 1, cua.meta_data, NULL) AS meta_data, user.name AS `user_name`, user.email AS `user_email`, user.img AS `img` " +
          "FROM course_user_activity cua LEFT JOIN course ON course.id = cua.id_course " +
          "LEFT JOIN course_module ON cua.id_course_module = course_module.id LEFT JOIN course_topic ON cua.id_course_topic = course_topic.id " +
          "LEFT JOIN course_test ON cua.id_course_test = course_test.id LEFT JOIN user ON user.id = cua.id_user " +
          "WHERE course.id_lang = ? AND course.is_deleted = 0 AND (course_module.is_deleted = 0 OR cua.id_course_module IS NULL) " +
          "AND (course_topic.is_deleted = 0 OR cua.id_course_topic IS NULL) " +
          `AND (course_test.is_deleted = 0 OR cua.id_course_test IS NULL)${activityRange.sql} ORDER BY cua.created_at DESC`,
        [lang, ...activityRange.params],
      ),
      query(
        `SELECT logs.id, logs.id_user, logs.action, logs.created_at, user.name AS user_name, user.email AS user_email, user.img AS user_img FROM logs LEFT JOIN user ON user.id = logs.id_user WHERE logs.id_lang = ?${logsRange.sql} ORDER BY logs.created_at DESC LIMIT ?`,
        [lang, ...logsRange.params, LOGS_LIMIT],
      ),
      query(`SELECT COUNT(*) AS total FROM logs WHERE id_lang = ?${logsRange.sql.replaceAll("logs.created_at", "created_at")}`, [lang, ...logsRange.params]),
    ]);

    res.send({ users, courses, modules, topics, tests, activity, logs, logsTotal: logsCount.total });
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Some error on server." });
  }
});

// Sinais de novidades no menu do backoffice: registos à espera de aprovação e mensagens do formulário de contacto por ler.
// Só conta o que a pessoa pode ver (mesmas permissões das secções); é uma consulta leve, chamada de 30 em 30 segundos.
router.get("/badges", requireStaff(), async (req, res) => {
  const out = { users: 0, answers: 0 };
  try {
    if (await hasPermission(req.user, "user", "read")) {
      // Contas pendentes (ficam inativas, is_deleted = 1, até serem aprovadas)
      const [row] = await query("SELECT COUNT(*) AS n FROM user WHERE status = 'pending'");
      out.users = Number(row.n);
    }
    if (await hasPermission(req.user, "form_submission", "read")) {
      try {
        // Só as por ler (e de idiomas que existem: a página das respostas só mostra esses)
        const [row] = await query("SELECT COUNT(*) AS n FROM form_submission fs JOIN language l ON l.id = fs.id_lang WHERE fs.is_deleted = 0 AND fs.is_read = 0");
        out.answers = Number(row.n);
      } catch (err) {
        // Sem a coluna is_read (migração por correr): sem contador
        if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
      }
    }
  } catch (err) {
    console.error(err);
  }
  res.set("Cache-Control", "no-store");
  res.send(out);
});

module.exports = router;
