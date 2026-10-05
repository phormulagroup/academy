const { AsyncLocalStorage } = require("async_hooks");

// Tempo de cada pedido: quanto demorou no total e quanto desse tempo foi à espera da base de dados (e em quantas consultas).
// - Cabeçalho Server-Timing em todas as respostas (aparece no separador Rede das ferramentas do browser).
// - Pedidos lentos (SLOW_REQUEST_MS, por omissão 1500 ms) ficam registados em Monitorização > Erros do servidor, como aviso "Pedido lento",
//   com o endereço, o tempo total e o tempo na base de dados. Um aviso por rota a cada 5 minutos, para não encher o registo.
const als = new AsyncLocalStorage();
const SLOW_MS = Number(process.env.SLOW_REQUEST_MS) || 1500;
const lastLogged = new Map();

// Contabiliza o tempo das consultas feitas durante um pedido (o pool é embrulhado uma só vez, em database.js)
function instrumentPool(pool) {
  const original = pool.query.bind(pool);
  pool.query = function timedQuery(...args) {
    const store = als.getStore();
    if (!store) return original(...args);
    const start = Date.now();
    const last = args.length - 1;
    if (typeof args[last] === "function") {
      const callback = args[last];
      args[last] = (...result) => {
        store.dbMs += Date.now() - start;
        store.queries += 1;
        return callback(...result);
      };
    }
    return original(...args);
  };
}

function timing(logSlow) {
  return (req, res, next) => {
    const store = { dbMs: 0, queries: 0 };
    const start = process.hrtime.bigint();
    const elapsed = () => Number(process.hrtime.bigint() - start) / 1e6;

    // O Server-Timing tem de seguir antes dos cabeçalhos da resposta
    const writeHead = res.writeHead;
    res.writeHead = function patchedWriteHead(...args) {
      if (!res.headersSent) res.setHeader("Server-Timing", `total;dur=${elapsed().toFixed(0)}, db;dur=${store.dbMs};desc="${store.queries} queries"`);
      return writeHead.apply(this, args);
    };

    res.on("finish", () => {
      const total = elapsed();
      if (total < SLOW_MS || req.path.endsWith("/health")) return;
      const route = `${req.method} ${req.route?.path ? req.baseUrl + req.route.path : req.path}`;
      if (Date.now() - (lastLogged.get(route) || 0) < 5 * 60 * 1000) return;
      lastLogged.set(route, Date.now());
      logSlow({
        level: "warning",
        source: "slow_request",
        message: `${route} took ${total.toFixed(0)} ms (${store.dbMs} ms in ${store.queries} database queries)`,
        req,
        status: res.statusCode,
      });
    });

    als.run(store, next);
  };
}

module.exports = { timing, instrumentPool };
