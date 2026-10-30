// Posição dos vídeos dos tópicos (tabela course_video_progress): validação do que a app envia e leitura/limpeza por aluno.
// Se a migração ainda não foi aplicada (tabela em falta), nada daqui parte a app: lê-se como "sem progresso" e não se grava.
const MAX_SECONDS = 24 * 60 * 60;
const VIDEO_ID = /^[A-Za-z0-9_-]{1,50}$/;

const isMissingTable = (err) => err?.code === "ER_NO_SUCH_TABLE";

// { topicId, videoId, seconds } ou null se o pedido não é válido. Os segundos são inteiros entre 0 e 24 h.
function parseVideoProgress(body) {
  const topicId = Number(body?.id_course_topic);
  const videoId = body?.video_id === undefined || body?.video_id === null ? "" : String(body.video_id);
  const seconds = Number(body?.time_watched);
  if (!Number.isInteger(topicId) || topicId <= 0) return null;
  if (videoId !== "" && !VIDEO_ID.test(videoId)) return null;
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return { topicId, videoId, seconds: Math.min(Math.floor(seconds), MAX_SECONDS) };
}

// Grava a posição de um vídeo. Por omissão nunca recua o valor já guardado (um pedido atrasado não sobrepõe um mais recente): é a regra
// de quem ainda está a ver o tópico pela primeira vez. Com `replace` (o aluno já concluiu o tópico e está a revê-lo) substitui-o, senão a
// posição ficava para sempre no fim do vídeo e nunca retomava onde o aluno realmente parou.
async function saveVideoProgress(query, userId, { topicId, videoId, seconds }, { replace = false } = {}) {
  try {
    await query(
      "INSERT INTO course_video_progress (id_user, id_course_topic, video_id, time_watched) VALUES (?, ?, ?, ?) " +
        `ON DUPLICATE KEY UPDATE time_watched = ${replace ? "VALUES(time_watched)" : "GREATEST(time_watched, VALUES(time_watched))"}`,
      [userId, topicId, videoId, seconds],
    );
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

// Posições guardadas por um aluno nos vídeos dos tópicos dos cursos indicados
async function readVideoProgress(query, userId, courseIds) {
  if (!userId || !courseIds?.length) return [];
  try {
    return await query(
      "SELECT v.id_course_topic, v.video_id, v.time_watched FROM course_video_progress v " +
        "JOIN course_topic t ON t.id = v.id_course_topic JOIN course_module m ON m.id = t.id_course_module " +
        "WHERE v.id_user = ? AND m.id_course IN (?)",
      [userId, courseIds],
    );
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

// Apaga as posições de um aluno em alguns tópicos (quando a equipa desmarca o progresso: o aluno recomeça os vídeos do início)
async function clearVideoProgress(query, userId, topicIds) {
  if (!topicIds?.length) return 0;
  try {
    return (await query("DELETE FROM course_video_progress WHERE id_user = ? AND id_course_topic IN (?)", [userId, topicIds])).affectedRows;
  } catch (err) {
    if (isMissingTable(err)) return 0;
    throw err;
  }
}

// O aluno já concluiu este tópico? (as posições dos vídeos passam a substituir-se, ver saveVideoProgress)
async function hasCompletedTopic(query, userId, topicId) {
  const rows = await query(
    "SELECT 1 FROM course_user_activity WHERE id_user = ? AND id_course_topic = ? AND activity_type = 'topic' AND is_completed = 1 AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 1",
    [userId, topicId],
  );
  return rows.length > 0;
}

module.exports = { hasCompletedTopic, parseVideoProgress, saveVideoProgress, readVideoProgress, clearVideoProgress };
