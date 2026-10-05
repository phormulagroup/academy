const db = require("./database");

// Ajudas para montar SQL com segurança: valores sempre por parâmetro (?), nomes de colunas validados e com aspas.

class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// Identificador de registo: tem de ser um inteiro positivo (nunca texto que vá parar à query)
function toId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequest("Invalid id");
  return id;
}

// "`a` = ?, `b` = ?" a partir dos nomes das colunas (que vêm do cliente: só letras, números e _)
function setClause(columns) {
  if (!columns.length) throw new BadRequest("Nothing to update");
  return columns
    .map((c) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(c)) throw new BadRequest("Invalid field");
      return `${db.escapeId(c)} = ?`;
    })
    .join(", ");
}

// "`a`, `b`" para listas de colunas num INSERT
function columnList(columns) {
  return columns
    .map((c) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(c)) throw new BadRequest("Invalid field");
      return db.escapeId(c);
    })
    .join(", ");
}

// Corre várias instruções SQL escritas numa só string, separadas por ";", como consultas independentes (em paralelo, ou por ordem com
// { sequential: true } numa transação) e devolve a lista de resultados, pela mesma ordem. Os parâmetros (?) distribuem-se por instrução.
// Existe para não depender de multipleStatements, que amplifica qualquer falha de injeção de SQL.
async function multi(runQuery, sql, params = [], { sequential = false } = {}) {
  const parts = sql.split(";").map((p) => p.trim()).filter(Boolean);
  let offset = 0;
  const jobs = parts.map((part) => {
    const count = (part.match(/\?/g) || []).length;
    const slice = params.slice(offset, offset + count);
    offset += count;
    return () => runQuery(part, slice);
  });
  if (sequential) {
    const out = [];
    for (const job of jobs) out.push(await job());
    return out;
  }
  return Promise.all(jobs.map((job) => job()));
}

module.exports = { toId, setClause, columnList, multi, BadRequest };
