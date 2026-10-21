const util = require("util");
const db = require("./database");
const { logError } = require("./monitor");

const query = util.promisify(db.query).bind(db);

// As colunas de agendamento vêm da migração 2026-10-09-notification-schedule.sql; sem ela tudo funciona, só não se agenda
let scheduleOk = false;
let checkedAt = 0;
async function scheduleReady() {
  if (scheduleOk) return true;
  if (Date.now() - checkedAt < 30 * 1000) return false;
  checkedAt = Date.now();
  try {
    const rows = await query("SHOW COLUMNS FROM notification LIKE 'scheduled_at'");
    scheduleOk = rows.length > 0;
  } catch {
    scheduleOk = false;
  }
  return scheduleOk;
}

const parseCountries = (value) => {
  try {
    const list = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(list) ? list.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
};
// Grupos de utilizadores (notification.user_groups), como course_module.items: [{ "id": 1 }, { "id": 2 }]
const parseGroups = (value) => {
  try {
    const list = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(list) ? list.map((g) => Number(g?.id)).filter(Boolean) : [];
  } catch {
    return [];
  }
};
// Ids do formulário → JSON a gravar (sem grupos = NULL, sem filtro)
const groupsJson = (ids) => (Array.isArray(ids) && ids.length ? JSON.stringify(ids.map((id) => ({ id: Number(id) }))) : null);

// Quem recebe: utilizadores aprovados e ativos do idioma da notificação, e dos países escolhidos (sem países = todos)
function audienceWhere(n) {
  const where = ["u.status = 'approved'", "u.is_deleted = 0", "u.id_lang = ?"];
  const params = [n.id_lang];
  const countries = parseCountries(n.country);
  if (countries.length) {
    where.push("u.country IN (?)");
    params.push(countries);
  }
  // E membro de um dos grupos escolhidos, como no acesso aos cursos. Só contam grupos ativos (is_deleted = 0): sem grupos, ou se
  // nenhum dos escolhidos estiver ativo (como aparece no backoffice), não há filtro de grupos
  const groups = parseGroups(n.user_groups);
  if (groups.length) {
    where.push(
      "(NOT EXISTS (SELECT 1 FROM user_group WHERE id IN (?) AND is_deleted = 0) OR " +
        "EXISTS (SELECT 1 FROM user_group_member ugm INNER JOIN user_group ug ON ug.id = ugm.id_group AND ug.is_deleted = 0 WHERE ugm.id_user = u.id AND ugm.id_group IN (?)))",
    );
    params.push(groups, groups);
  }
  return { where, params };
}

async function countAudience(n) {
  const { where, params } = audienceWhere(n);
  const [row] = await query(`SELECT COUNT(*) AS total FROM user u WHERE ${where.join(" AND ")}`, params);
  return row.total;
}

// Entrega a notificação aos utilizadores do público que ainda não a têm (nunca duplica) e marca-a como enviada.
// Devolve quantos receberam agora. Só uma execução fica com a notificação: quem marcar sent_at primeiro.
async function deliver(id) {
  const [n] = await query("SELECT * FROM notification WHERE id = ?", [id]);
  if (!n) return null;
  const hasSchedule = await scheduleReady();
  if (hasSchedule) {
    const claimed = await query("UPDATE notification SET sent_at = NOW() WHERE id = ? AND sent_at IS NULL", [id]);
    if (claimed.affectedRows === 0) return { delivered: 0, already: true };
  }
  const { where, params } = audienceWhere(n);
  const users = await query(`SELECT u.id FROM user u WHERE ${where.join(" AND ")} AND NOT EXISTS (SELECT 1 FROM notification_user nu WHERE nu.id_notification = ? AND nu.id_user = u.id)`, [...params, id]);
  for (let i = 0; i < users.length; i += 500) {
    await query("INSERT INTO notification_user (id_notification, id_user) VALUES ?", [users.slice(i, i + 500).map((u) => [id, u.id])]);
  }
  return { delivered: users.length };
}

// Chamada de poucos em poucos segundos pelo serviço das comunicações: envia as agendadas cuja hora chegou
async function deliverDue() {
  if (!(await scheduleReady())) return;
  const due = await query("SELECT id FROM notification WHERE sent_at IS NULL AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()");
  for (const { id } of due) {
    try {
      await deliver(id);
    } catch (err) {
      logError({ source: "notification", message: `Could not send notification ${id}: ${err.message}`, stack: err.stack });
      // Volta a ficar por enviar para uma nova tentativa no ciclo seguinte
      await query("UPDATE notification SET sent_at = NULL WHERE id = ? AND NOT EXISTS (SELECT 1 FROM notification_user WHERE id_notification = ?)", [id, id]).catch(() => {});
    }
  }
}

module.exports = { scheduleReady, parseCountries, groupsJson, countAudience, deliver, deliverDue };
