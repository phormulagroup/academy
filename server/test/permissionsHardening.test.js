require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { installFakeDb } = require("./helpers/fakeDb");

// Pasta de media de teste, com uma imagem mínima para o fundo do certificado
const mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "academy-media-"));
process.env.MEDIA_DIR = mediaDir;
fs.writeFileSync(
  path.join(mediaDir, "bg.png"),
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
);

const ADMIN = { id: 1, id_role: 1 };
const GESTOR = { id: 4, id_role: 4 };
const ALUNO = { id: 7, id_role: 2, country: "PT" };

// Linhas da "BD": quem é cada utilizador, cursos e conclusões
const users = { 1: { id_role: 1 }, 4: { id_role: 4 }, 7: { id_role: 2 }, 20: { id_role: 2 }, 30: { id_role: 4 } };
let courseRows = [];
let completion = null;
const fake = installFakeDb((sql, params) => {
  if (/FROM permission WHERE id_role/.test(sql)) return []; // o Gestor fica com a predefinição (tudo menos o sistema); o Utilizador sem nada
  if (/SELECT id_role FROM user WHERE id = \?/.test(sql)) return users[params[0]] ? [users[params[0]]] : [];
  if (/FROM course WHERE id = \? AND is_deleted = 0/.test(sql)) return courseRows.filter((c) => c.id === params[0]);
  if (/SELECT id, settings, status, is_deleted FROM course WHERE id IN/.test(sql)) return courseRows.filter((c) => params[0].includes(c.id));
  if (/SELECT id, name FROM user WHERE id = \? AND is_deleted = 0/.test(sql)) return [{ id: params[0], name: "Ana Silva" }];
  if (/FROM course_user_activity WHERE id_user = \? AND id_course = \? AND activity_type = 'course'/.test(sql)) return completion ? [completion] : [];
  if (/SELECT \* FROM course_certificate WHERE id = \?/.test(sql)) return [{ id: 1, background: "bg.png", text: "{{name}} {{course}} {{date}}", text_align: "center" }];
  if (/SELECT user\.id, user\.is_deleted FROM user WHERE email/.test(sql)) return [{ id: 3, is_deleted: 0 }];
  return [];
});

// Só agora (a BD simulada já está instalada) é que se carregam os módulos que a usam
const { canManageRole } = require("../utils/permissions");

// Espia o gerador do PDF para ver com que dados é chamado (a rota importa-o ao carregar, por isso tem de ser antes)
const pdf = require("../utils/certificatePdf");
const realGenerate = pdf.generateCertificatePdf;
let pdfCall = null;
pdf.generateCertificatePdf = (options) => {
  pdfCall = options;
  return realGenerate(options);
};

const express = require("express");
const { patchAsyncHandlers, errorHandler } = require("../utils/asyncErrors");
patchAsyncHandlers();
const app = express();
app.use(express.json());
// "Sessão" de teste: quem faz o pedido vem no cabeçalho (o middleware real lê-a do token)
app.use((req, res, next) => {
  req.user = JSON.parse(req.headers["x-test-user"] || "null");
  next();
});
app.use("/user", require("../routes/user"));
app.use("/course", require("../routes/course"));
app.use("/certificate", require("../routes/certificate"));
app.use("/logs", require("../routes/logs"));
app.use(errorHandler);

let server;
let base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => {
  server.close();
  fs.rmSync(mediaDir, { recursive: true, force: true });
});

const call = async (method, url, user, data) => {
  const res = await fetch(base + url, {
    method,
    headers: { "content-type": "application/json", "x-test-user": JSON.stringify(user) },
    body: method === "POST" ? JSON.stringify({ data }) : undefined,
  });
  const type = res.headers.get("content-type") || "";
  return { status: res.status, type, body: type.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};
// Escritas de dados (o registo de erros e a auditoria não contam)
const writes = () => fake.calls.filter((c) => /^(INSERT|UPDATE|DELETE)/i.test(c.sql) && !/server_log|audit_log/.test(c.sql));
// Os parâmetros de "INSERT ... SET ?" chegam como o próprio objeto; os de "VALUES ?" como lista
const values = (call) => (Array.isArray(call.params) ? call.params[0] : call.params);

test("canManageRole: só o Admin mexe nas funções de Admin e de Gestor", () => {
  assert.equal(canManageRole(ADMIN, 1), true);
  assert.equal(canManageRole(ADMIN, 4), true);
  assert.equal(canManageRole(GESTOR, 1), false);
  assert.equal(canManageRole(GESTOR, 4), false);
  assert.equal(canManageRole(GESTOR, "4"), false);
  assert.equal(canManageRole(GESTOR, 2), true);
});

test("Gestor não edita a conta de um Admin (nem muda o e-mail para a recuperar)", async () => {
  fake.calls.length = 0;
  const res = await call("POST", "/user/update", GESTOR, { id: 1, email: "atacante@example.com" });
  assert.equal(res.status, 403);
  assert.equal(writes().length, 0);
});

test("Gestor não se sobe nem sobe ninguém a Admin ou Gestor; manter a função atual passa", async () => {
  fake.calls.length = 0;
  assert.equal((await call("POST", "/user/update", GESTOR, { id: 20, id_role: 1 })).status, 403);
  assert.equal((await call("POST", "/user/update", GESTOR, { id: 4, id_role: 1 })).status, 403);
  assert.equal((await call("POST", "/user/update", GESTOR, { id: 20, id_role: 4 })).status, 403);
  assert.equal((await call("POST", "/user/update", GESTOR, { id: 20, id_role: "1" })).status, 403);
  assert.equal(writes().length, 0);
  // Reenviar a função que a conta já tem não altera nada (os formulários reenviam tudo)
  const same = await call("POST", "/user/update", GESTOR, { id: 20, id_role: 2, name: "Novo Nome" });
  assert.equal(same.status, 200);
  const update = writes().find((c) => /^UPDATE user SET/i.test(c.sql));
  assert.ok(update);
  assert.doesNotMatch(update.sql, /id_role/);
});

test("Admin continua a poder atribuir a função de Admin", async () => {
  fake.calls.length = 0;
  const res = await call("POST", "/user/update", ADMIN, { id: 20, id_role: 4 });
  assert.equal(res.status, 200);
  assert.match(writes().find((c) => /^UPDATE user SET/i.test(c.sql)).sql, /id_role/);
});

test("criar utilizador: o Gestor não cria Admins e só os campos do formulário chegam à BD", async () => {
  fake.calls.length = 0;
  assert.equal((await call("POST", "/user/create", GESTOR, { name: "X", email: "x@example.com", id_role: 1 })).status, 403);
  assert.equal(writes().length, 0);
  const ok = await call("POST", "/user/create", GESTOR, { name: "Nova", email: "nova@example.com", id_role: 2, password: "em-claro", recover_code: "hash-escolhido", login_code: "x", is_deleted: 0, status: "approved", id: 99 });
  assert.equal(ok.status, 200);
  const insert = writes().find((c) => /^INSERT INTO user/i.test(c.sql));
  assert.deepEqual(Object.keys(values(insert)).sort(), ["email", "id_role", "is_deleted", "name", "status"]);
  assert.equal(values(insert).status, "pending");
  assert.equal(values(insert).is_deleted, 1);
});

test("aprovar ou apagar a conta de um Admin é só do Admin; ninguém apaga a própria; o id nunca é um objeto", async () => {
  fake.calls.length = 0;
  assert.equal((await call("POST", "/user/changeStatus", GESTOR, { id: 1, status: "approved" })).status, 403);
  assert.equal((await call("POST", "/user/delete", GESTOR, { id: 1 })).status, 403);
  assert.equal((await call("POST", "/user/delete", GESTOR, { id: 4 })).status, 400);
  assert.equal((await call("POST", "/user/delete", GESTOR, { id: { id: 1 } })).status, 400);
  assert.equal((await call("POST", "/user/changeStatus", GESTOR, { id: 20, status: "qualquer" })).status, 400);
  assert.equal(writes().length, 0);
  assert.equal((await call("POST", "/user/delete", GESTOR, { id: 20 })).status, 200);
});

test("readByEmail devolve só o id e se está ativo (nada de nome, estado ou função) e recusa e-mails que não são texto", async () => {
  fake.calls.length = 0;
  const ok = await call("GET", "/user/readByEmail?email=admin%40example.com", ALUNO);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, [{ id: 3, is_deleted: 0 }]);
  assert.doesNotMatch(fake.calls[0].sql, /id_role|status|name|role_name/);
  assert.equal((await call("GET", "/user/readByEmail?email[email]=1", ALUNO)).status, 400);
});

test("ler o conteúdo de cursos, tópicos e testes por id exige permissão (a equipa); o aluno recebe 403", async () => {
  for (const url of ["/course/readByTestId?idTest=1", "/course/readByTopicId?id=1", "/course/readById?id=1"]) {
    assert.equal((await call("GET", url, ALUNO)).status, 403, url);
    assert.equal((await call("GET", url, GESTOR)).status, 200, url);
  }
});

test("as rotas que devolviam o progresso de qualquer utilizador já não existem", async () => {
  assert.equal((await call("GET", "/course/read?id_user=1", ALUNO)).status, 404);
  assert.equal((await call("GET", "/course/readProgress?id_user=1&id_lang=3", ALUNO)).status, 404);
});

test("certificado: não sem curso concluído, não de outra pessoa, não de um curso sem modelo", async () => {
  courseRows = [{ id: 5, name: "Curso A", id_course_certificate: 1, settings: null, status: "published" }, { id: 6, name: "Sem modelo", id_course_certificate: null, settings: null, status: "published" }];
  completion = null;
  assert.equal((await call("POST", "/certificate/generate", ALUNO, { id_course: 5 })).status, 403);
  assert.equal((await call("POST", "/certificate/generate", ALUNO, { id_course: 6 })).status, 404);
  assert.equal((await call("POST", "/certificate/generate", ALUNO, { id_course: 99 })).status, 404);
  assert.equal((await call("POST", "/certificate/generate", ALUNO, { id_course: 5, id_user: 20 })).status, 403);
  assert.equal((await call("POST", "/certificate/generate", ALUNO, {})).status, 400);
  assert.equal((await call("POST", "/certificate/generate", ALUNO, { id_course: { id: 5 } })).status, 400);
});

test("certificado de um curso concluído: o nome, o curso e a data vêm da BD, nunca do pedido", async () => {
  courseRows = [{ id: 5, name: "Curso A", id_course_certificate: 1, settings: null, status: "published" }];
  completion = { completed_at: "2026-10-28 17:08" };
  pdfCall = null;
  const res = await call("POST", "/certificate/generate", ALUNO, { id_course: 5, name: "Nome Falso", course: "Curso Falso", date: "2020-01-01 00:00", id: 99 });
  assert.equal(res.status, 200);
  assert.match(res.type, /application\/pdf/);
  assert.equal(res.body.slice(0, 5).toString(), "%PDF-");
  assert.equal(pdfCall.name, "Ana Silva");
  assert.equal(pdfCall.course, "Curso A");
  assert.equal(pdfCall.date, "2026-10-28 17:08");
  // A equipa gera o de um aluno (precisa de poder ver utilizadores)
  assert.equal((await call("POST", "/certificate/generate", GESTOR, { id_course: 5, id_user: 7 })).status, 200);
});

test("um aluno não gera o certificado de um curso em rascunho", async () => {
  courseRows = [{ id: 5, name: "Curso A", id_course_certificate: 1, settings: null, status: "draft" }];
  completion = { completed_at: "2026-10-28 17:08" };
  assert.equal((await call("POST", "/certificate/generate", ALUNO, { id_course: 5 })).status, 404);
});

test("logs: o utilizador é sempre quem faz o pedido, só os campos esperados e uma ação é obrigatória", async () => {
  fake.calls.length = 0;
  const ok = await call("POST", "/logs/create", ALUNO, { id_user: 1, action: "view", table_name: "download", meta_data: "{}", id_lang: 3, created_at: "2000-01-01", id: 5 });
  assert.equal(ok.status, 200);
  const insert = writes().find((c) => /INSERT INTO logs/i.test(c.sql));
  assert.deepEqual(values(insert), { id_user: 7, action: "view", table_name: "download", meta_data: "{}", id_lang: 3 });
  assert.equal((await call("POST", "/logs/create", ALUNO, { table_name: "x" })).status, 400);
});

test("progresso: o aluno não grava em cursos em rascunho nem outras colunas além das esperadas", async () => {
  courseRows = [{ id: 5, status: "draft", settings: null, is_deleted: 0 }, { id: 6, status: "published", settings: null, is_deleted: 0 }];
  fake.calls.length = 0;
  const draft = await call("POST", "/course/updateProgress", ALUNO, [{ id_course: 5, activity_type: "enroll", is_completed: 1 }]);
  assert.equal(draft.status, 200);
  assert.equal(writes().length, 0);
  assert.equal((await call("POST", "/course/updateProgress", ALUNO, { id_course: 6 })).status, 400);

  await call("POST", "/course/updateProgress", ALUNO, [{ id: 1, id_user: 99, id_course: 6, activity_type: "enroll", is_completed: 1, is_deleted: 1, qualquer: "x" }]);
  const insert = writes().find((c) => /INSERT INTO course_user_activity/i.test(c.sql));
  assert.ok(insert, "grava no curso publicado");
  assert.match(insert.sql, /\(`id_course`, `id_user`, `activity_type`, `is_completed`\)/);
  assert.doesNotMatch(insert.sql, /is_deleted|qualquer|\(`id`/);
  assert.deepEqual(insert.params[0][0], [6, 7, "enroll", 1], "o utilizador é sempre o da sessão (7), não o enviado (99)");
});
