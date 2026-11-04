// Defesa contra "objetos no lugar de valores": a biblioteca `mysql` transforma um objeto no parâmetro de uma consulta em `coluna = valor`,
// por isso `?email[email]=1` ou `{"id": {"id": 1}}` fazem `WHERE email = \`email\` = '1'`, que é verdadeiro para TODAS as linhas (ler ou apagar
// tudo). O Express lê `a[b]=c` da query string como um objeto. Os campos de identificação nunca são objetos: recusa-se o pedido à entrada.

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Campos que são sempre valores simples (ids, e-mail, códigos, nomes...). JSON legítimo (settings, content, question...) fica de fora.
const SIMPLE_KEY = /^(id|email|slug|code|password|token|file|name|title|subject|message|status|action|table_name)$|^id_|_id$|^(new|current|confirm)_password$/;

function hasObjectValue(value) {
  return Array.isArray(value) ? value.some(isPlainObject) : isPlainObject(value);
}

// Query string: nenhuma rota precisa de objetos aninhados
function badQuery(query) {
  return Object.values(query || {}).some(hasObjectValue);
}

// Corpo { data: {...} } ou { data: [{...}, ...] }: os campos de identificação, ao nível do registo, não podem ser objetos
function badBody(body) {
  const data = body?.data;
  const records = Array.isArray(data) ? data : [data];
  return records.some((record) => isPlainObject(record) && Object.entries(record).some(([key, value]) => SIMPLE_KEY.test(key) && hasObjectValue(value)));
}

function inputGuard(req, res, next) {
  if (badQuery(req.query) || badBody(req.body)) return res.status(400).send({ message: "Invalid request" });
  next();
}

module.exports = { inputGuard, badQuery, badBody, isPlainObject };
