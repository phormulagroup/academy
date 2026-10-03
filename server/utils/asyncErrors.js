const Layer = require("express/lib/router/layer");
const { logError } = require("./monitor");

// O Express 4 não apanha erros de handlers `async` (um `throw` dentro de uma rota async deixava o pedido pendurado e só gerava um
// "unhandled rejection"). Aqui o erro passa a seguir para o tratamento de erros (resposta 500 e registo em server_log).
function patchAsyncHandlers() {
  if (Layer.prototype.__asyncPatched) return;
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function handleRequest(req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return next(); // handlers de erro: não se alteram
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === "function") result.catch(next);
    } catch (err) {
      next(err);
    }
  };
  Layer.prototype.handle_request.original = original;
  Layer.prototype.__asyncPatched = true;
}

// Regista as respostas 5xx que as rotas devolvem elas próprias (os `catch` que fazem res.status(500)), com a mensagem enviada
function requestMonitor(req, res, next) {
  const send = res.send;
  res.send = function patchedSend(body) {
    if (res.statusCode >= 500 && !req._errorLogged) {
      req._errorLogged = true;
      let detail = body;
      try {
        detail = typeof body === "string" ? body : JSON.stringify(body);
      } catch {
        // corpo não serializável
      }
      let message = `HTTP ${res.statusCode}`;
      try {
        const parsed = typeof body === "object" ? body : JSON.parse(body);
        if (parsed?.message) message = `${parsed.message}`;
      } catch {
        // corpo não é JSON
      }
      logError({ source: "request", message, stack: String(detail ?? "").slice(0, 8000), req, status: res.statusCode });
    }
    return send.call(this, body);
  };
  next();
}

// Último tratamento de erros: nunca expõe detalhes ao cliente, só os regista
function errorHandler(err, req, res, next) {
  if (!req._errorLogged) {
    req._errorLogged = true;
    logError({ source: "request", message: err?.message || String(err), stack: err?.stack, req, status: err?.status || 500 });
  }
  if (res.headersSent) return next(err);
  res.status(err?.status && err.status < 500 ? err.status : 500).send({ message: "Internal server error" });
}

function installProcessHandlers() {
  process.on("unhandledRejection", (reason) => {
    logError({ source: "unhandled_rejection", message: reason?.message || String(reason), stack: reason?.stack });
  });
  process.on("uncaughtException", (err) => {
    // Nunca deita o servidor abaixo: o erro fica registado (Monitorização > Erros do servidor) e o processo continua a servir pedidos
    logError({ source: "uncaught_exception", message: err?.message || String(err), stack: err?.stack });
  });
}

module.exports = { patchAsyncHandlers, requestMonitor, errorHandler, installProcessHandlers };
