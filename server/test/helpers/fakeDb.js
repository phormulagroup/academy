// Substitui utils/database.js por uma base de dados falsa (sem ligação): cada teste define as linhas que cada consulta devolve
const path = require("path");

function installFakeDb(handler) {
  const dbPath = require.resolve(path.join(__dirname, "..", "..", "utils", "database.js"));
  const fake = {
    calls: [],
    query(sql, params, cb) {
      if (typeof params === "function") {
        cb = params;
        params = [];
      }
      fake.calls.push({ sql, params });
      Promise.resolve()
        .then(() => handler(sql, params))
        .then((rows) => cb(null, rows))
        .catch((err) => cb(err));
    },
    escapeId: (id) => `\`${id}\``,
  };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fake };
  return fake;
}

// Pedido/resposta mínimos do Express para testar middlewares
function fakeReq({ method = "GET", headers = {}, secure = false } = {}) {
  return { method, headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])), secure };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    cookies: [],
    status(code) {
      res.statusCode = code;
      return res;
    },
    send(body) {
      res.body = body;
      res.sent = true;
      return res;
    },
    cookie(name, value, options) {
      res.cookies.push({ name, value, options });
      return res;
    },
    clearCookie(name, options) {
      res.cookies.push({ name, value: "", options, cleared: true });
      return res;
    },
  };
  return res;
}

module.exports = { installFakeDb, fakeReq, fakeRes };
