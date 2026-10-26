require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const { approvedResult, gradeAttempt } = require("../utils/testResult");

const q = (title, answers) => ({ title, answer: answers.map(([t, c]) => ({ title: t, is_correct: !!c })) });
const questions = [q("Capital de Portugal?", [["Lisboa", 1], ["Porto", 0]]), q("Cores primárias?", [["Azul", 1], ["Vermelho", 1], ["Verde", 0]])];

test("approvedResult marca tudo certo e que foi concluído pelo admin", () => {
  const result = JSON.parse(approvedResult(questions));
  assert.equal(result.completed_by_admin, true);
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every((i) => i.is_correct));
  assert.deepEqual(result.items[1].myAnswer, ["Azul", "Vermelho"]);
});

test("gradeAttempt: tudo certo aprova", () => {
  const meta = { items: [{ title: "Capital de Portugal?", myAnswer: "Lisboa" }, { title: "Cores primárias?", myAnswer: ["Azul", "Vermelho"] }], time: 30 };
  const { passed, meta_data } = gradeAttempt(questions, { passing_score: 75 }, meta);
  assert.equal(passed, true);
  assert.equal(JSON.parse(meta_data).items.every((i) => i.is_correct), true);
  assert.equal(JSON.parse(meta_data).time, 30);
});

test("gradeAttempt: escolha múltipla incompleta é errada", () => {
  const meta = { items: [{ title: "Capital de Portugal?", myAnswer: "Lisboa" }, { title: "Cores primárias?", myAnswer: ["Azul"] }] };
  const { passed, meta_data } = gradeAttempt(questions, { passing_score: 75 }, meta);
  assert.equal(passed, false); // 50% < 75%
  assert.deepEqual(JSON.parse(meta_data).items.map((i) => i.is_correct), [true, false]);
});

test("gradeAttempt: perguntas em falta contam como sem resposta e a nota mínima é a das definições", () => {
  const meta = { items: [{ title: "Capital de Portugal?", myAnswer: "Lisboa" }] };
  const lenient = gradeAttempt(questions, { passing_score: 50 }, meta);
  assert.equal(lenient.passed, true);
  const missing = JSON.parse(lenient.meta_data).items.find((i) => i.title === "Cores primárias?");
  assert.equal(missing.unanswered, true);
  assert.equal(gradeAttempt(questions, { passing_score: 75 }, meta).passed, false);
});

test("gradeAttempt: usa 75% quando não há nota mínima e ignora a resposta do cliente sobre o que é certo", () => {
  const meta = { items: [{ title: "Capital de Portugal?", myAnswer: "Porto", is_correct: true }, { title: "Cores primárias?", myAnswer: ["Azul", "Vermelho"], is_correct: false }] };
  const { passed, meta_data } = gradeAttempt(questions, {}, meta);
  assert.equal(passed, false);
  assert.deepEqual(JSON.parse(meta_data).items.map((i) => i.is_correct), [false, true]);
});

test("gradeAttempt: títulos repetidos contam cada pergunta à parte, pela posição", () => {
  const repeated = [q("Mesma pergunta", [["A", 1], ["B", 0]]), q("Mesma pergunta", [["C", 0], ["D", 1]])];
  const meta = { items: [{ title: "Mesma pergunta", position: 1, myAnswer: "D" }, { title: "Mesma pergunta", position: 0, myAnswer: "A" }] };
  const { passed, meta_data } = gradeAttempt(repeated, { passing_score: 100 }, meta);
  assert.equal(passed, true);
  assert.deepEqual(JSON.parse(meta_data).items.map((i) => i.position).sort(), [0, 1]);
});

test("gradeAttempt: sem perguntas com resposta certa nunca aprova", () => {
  const { passed } = gradeAttempt([q("Aberta", [["x", 0]])], { passing_score: 0 }, { items: [] });
  assert.equal(passed, false);
});

test("gradeAttempt aceita o formato antigo (lista) e devolve uma lista", () => {
  const { meta_data } = gradeAttempt(questions, {}, [{ title: "Capital de Portugal?", myAnswer: "Lisboa" }]);
  assert.ok(Array.isArray(JSON.parse(meta_data)));
});
