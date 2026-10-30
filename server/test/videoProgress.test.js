const test = require("node:test");
const assert = require("node:assert/strict");
const { hasCompletedTopic, parseVideoProgress, saveVideoProgress, readVideoProgress, clearVideoProgress } = require("../utils/videoProgress");

const missingTable = () => Promise.reject(Object.assign(new Error("no table"), { code: "ER_NO_SUCH_TABLE" }));

test("parseVideoProgress aceita um pedido válido e arredonda os segundos para baixo", () => {
  assert.deepEqual(parseVideoProgress({ id_course_topic: "12", video_id: "1039818823", time_watched: 95.9 }), { topicId: 12, videoId: "1039818823", seconds: 95 });
  assert.deepEqual(parseVideoProgress({ id_course_topic: 3, time_watched: 0 }), { topicId: 3, videoId: "", seconds: 0 });
});

test("parseVideoProgress recusa tópico, vídeo ou tempo inválidos", () => {
  assert.equal(parseVideoProgress(undefined), null);
  assert.equal(parseVideoProgress({ id_course_topic: 0, video_id: "1", time_watched: 5 }), null);
  assert.equal(parseVideoProgress({ id_course_topic: 1.5, video_id: "1", time_watched: 5 }), null);
  assert.equal(parseVideoProgress({ id_course_topic: 1, video_id: "a b", time_watched: 5 }), null);
  assert.equal(parseVideoProgress({ id_course_topic: 1, video_id: "x".repeat(51), time_watched: 5 }), null);
  assert.equal(parseVideoProgress({ id_course_topic: 1, video_id: "1", time_watched: -1 }), null);
  assert.equal(parseVideoProgress({ id_course_topic: 1, video_id: "1", time_watched: "abc" }), null);
  assert.equal(parseVideoProgress({ id_course_topic: 1, video_id: "1", time_watched: Infinity }), null);
});

test("parseVideoProgress limita o tempo a 24 horas", () => {
  assert.equal(parseVideoProgress({ id_course_topic: 1, video_id: "1", time_watched: 10 ** 9 }).seconds, 86400);
});

test("saveVideoProgress grava com GREATEST (nunca recua) e para o aluno indicado", async () => {
  const calls = [];
  const ok = await saveVideoProgress(async (sql, params) => calls.push({ sql, params }), 7, { topicId: 12, videoId: "99", seconds: 40 });
  assert.equal(ok, true);
  assert.match(calls[0].sql, /ON DUPLICATE KEY UPDATE time_watched = GREATEST\(time_watched, VALUES\(time_watched\)\)/);
  assert.deepEqual(calls[0].params, [7, 12, "99", 40]);
});

test("saveVideoProgress com replace (tópico já concluído) substitui a posição em vez de manter a maior", async () => {
  const calls = [];
  await saveVideoProgress(async (sql, params) => calls.push({ sql, params }), 7, { topicId: 12, videoId: "99", seconds: 10 }, { replace: true });
  assert.match(calls[0].sql, /ON DUPLICATE KEY UPDATE time_watched = VALUES\(time_watched\)$/);
  assert.doesNotMatch(calls[0].sql, /GREATEST/);
  assert.deepEqual(calls[0].params, [7, 12, "99", 10]);
});

test("hasCompletedTopic só é verdadeiro se existir um registo de tópico concluído do aluno", async () => {
  let seen;
  assert.equal(await hasCompletedTopic(async (sql, params) => ((seen = params), [{ 1: 1 }]), 7, 12), true);
  assert.deepEqual(seen, [7, 12]);
  assert.equal(await hasCompletedTopic(async () => [], 7, 12), false);
});

test("sem a tabela (migração por aplicar) nada parte", async () => {
  assert.equal(await saveVideoProgress(missingTable, 7, { topicId: 1, videoId: "1", seconds: 1 }), false);
  assert.deepEqual(await readVideoProgress(missingTable, 7, [1]), []);
  assert.equal(await clearVideoProgress(missingTable, 7, [1]), 0);
});

test("outros erros da BD não são engolidos", async () => {
  const boom = () => Promise.reject(Object.assign(new Error("boom"), { code: "ER_X" }));
  await assert.rejects(() => saveVideoProgress(boom, 7, { topicId: 1, videoId: "1", seconds: 1 }), /boom/);
  await assert.rejects(() => readVideoProgress(boom, 7, [1]), /boom/);
});

test("readVideoProgress e clearVideoProgress ignoram pedidos sem utilizador, cursos ou tópicos", async () => {
  const never = () => assert.fail("não devia consultar a BD");
  assert.deepEqual(await readVideoProgress(never, null, [1]), []);
  assert.deepEqual(await readVideoProgress(never, 7, []), []);
  assert.equal(await clearVideoProgress(never, 7, []), 0);
});

test("readVideoProgress filtra por aluno e por cursos; clearVideoProgress devolve as linhas apagadas", async () => {
  let seen;
  const rows = await readVideoProgress(async (sql, params) => ((seen = params), [{ id_course_topic: 12, video_id: "99", time_watched: 40 }]), 7, [3, 4]);
  assert.deepEqual(seen, [7, [3, 4]]);
  assert.equal(rows[0].time_watched, 40);
  assert.equal(await clearVideoProgress(async () => ({ affectedRows: 2 }), 7, [12, 13]), 2);
});
