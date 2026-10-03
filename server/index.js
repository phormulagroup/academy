// Configuração por ambiente: .env.development (por omissão), .env.staging ou .env.production, escolhido por NODE_ENV.
// Tem de ser carregada antes de qualquer módulo que leia process.env (ex.: a ligação à BD).
require("dotenv").config({ path: require("path").join(__dirname, `.env.${process.env.NODE_ENV || "development"}`), quiet: true });

const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const dayjs = require("dayjs");
const express = require("express");
const util = require("util");
const http = require("http"); // <--- ADICIONADO

/* Utils import */
const middleware = require("./utils/middleware");
const db = require("./utils/database");

// Erros de handlers async, respostas 5xx e erros do processo ficam registados em server_log (ver utils/asyncErrors.js)
const { patchAsyncHandlers, requestMonitor, errorHandler, installProcessHandlers } = require("./utils/asyncErrors");
const { startMonitoring, logError } = require("./utils/monitor");
const { startCommunications } = require("./utils/communications");
patchAsyncHandlers();
installProcessHandlers();

const app = express();
const port = process.env.PORT || 4000;
// Quando a API partilha o domínio com o webapp (ex.: https://academy.bial.com/api) define-se API_PREFIX=/api
const prefix = (process.env.API_PREFIX || "").replace(/\/$/, "");

/* Criar servidor HTTP */
const server = http.createServer(app); // <--- MUDANÇA IMPORTANTE

app.use(
	helmet({
		crossOriginResourcePolicy: false,
	}),
);

app.use(compression());

// Limitação de taxa
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 600,
});

app.use(limiter);

app.use(express.json());
app.use(cors());
app.use(requestMonitor);

/* MUDAR DE app.listen para server.listen */
server.listen(port);

/* Conexão BD */
db.getConnection((error, conn) => {
	// Sem BD no arranque o servidor não cai: o /health devolve 503 e o heartbeat recupera quando a BD voltar
	if (error) logError({ source: "database", message: `Database connection failed: ${error.message}`, stack: error.stack });
	else conn.release();
	startCommunications(); // envio das comunicações agendadas, em lotes
	startMonitoring(); // sinal de vida, tempo em baixo e limpeza de logs antigos (recupera sozinho quando a BD voltar)
});

// Rastreio de cliques das comunicações (público, sem login): redireccionamento assinado
app.use(`${prefix}/t`, require("./routes/tracking"));
app.use(`${prefix}/media`, express.static(require("path").join(__dirname, "media")));
// Fontes da marca para os e-mails (ficheiros em server/public/fonts): os e-mails vão buscá-las a este endereço
app.use(`${prefix}/fonts`, express.static(require("path").join(__dirname, "public", "fonts"), { maxAge: "30d" }));

// Estado da API para o webapp (e monitorização): 200 se o servidor e a base de dados respondem, 503 caso contrário
app.get(`${prefix}/health`, (req, res) => {
	res.set("Cache-Control", "no-store");
	db.query("SELECT 1", (error) => {
		if (error) return res.status(503).json({ status: "error" });
		res.json({ status: "ok" });
	});
});

// Raiz da API: página simples para quem abre o endereço no browser, JSON para ferramentas (e o ping do webapp só precisa de um 200)
const rootPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Bial Regional Academy API</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: Poppins, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #163986; background: linear-gradient(135deg, #f4f8ff 0%, #e6f9fc 100%); }
      main { width: 100%; max-width: 480px; padding: 40px 32px; text-align: center; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(22, 57, 134, 0.12); }
      .bar { width: 56px; height: 5px; margin: 0 auto 24px; border-radius: 3px; background: #00b9d6; }
      h1 { margin: 0; font-size: 1.5rem; }
      p { margin: 12px 0 0; line-height: 1.5; opacity: 0.8; }
      .status { display: inline-flex; align-items: center; gap: 8px; margin-top: 24px; padding: 6px 14px; border-radius: 999px; font-size: 0.9rem; font-weight: 600; color: #0a7a46; background: #e7f7ee; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #1fb26a; }
    </style>
  </head>
  <body>
    <main>
      <div class="bar"></div>
      <h1>Bial Regional Academy</h1>
      <p>API do Bial Regional Academy.<br />This is the Bial Regional Academy API.</p>
      <span class="status"><span class="dot"></span>Online</span>
    </main>
  </body>
</html>`;

app.get(`${prefix}/`, (req, res) => {
	res.format({
		html: () => res.send(rootPage),
		json: () => res.json({ name: "Bial Regional Academy API", status: "ok" }),
		default: () => res.send("Bial Regional Academy API"),
	});
});

/* Rotas */
app.use(`${prefix}/auth`, require("./routes/auth"));
app.use(`${prefix}/dashboard`, middleware, require("./routes/dashboard"));
app.use(`${prefix}/logs`, middleware, require("./routes/logs"));
app.use(`${prefix}/user`, middleware, require("./routes/user"));
app.use(`${prefix}/course`, middleware, require("./routes/course"));
app.use(`${prefix}/usergroup`, middleware, require("./routes/userGroup"));
app.use(`${prefix}/language`, require("./routes/language"));
app.use(`${prefix}/role`, middleware, require("./routes/role"));
app.use(`${prefix}/communication`, middleware, require("./routes/communication"));
app.use(`${prefix}/permission`, middleware, require("./routes/permission"));
app.use(`${prefix}/media`, require("./routes/media"));
app.use(`${prefix}/import`, middleware, require("./routes/import"));
app.use(`${prefix}/settings`, require("./routes/settings"));
app.use(`${prefix}/email`, middleware, require("./routes/email"));
app.use(`${prefix}/certificate`, middleware, require("./routes/certificate"));
app.use(`${prefix}/notification`, middleware, require("./routes/notification"));
app.use(`${prefix}/ticket`, middleware, require("./routes/ticket"));
app.use(`${prefix}/monitor`, middleware, require("./routes/monitor"));
app.use(`${prefix}/document`, middleware, require("./routes/document"));
app.use(`${prefix}/download`, middleware, require("./routes/download"));
const iecRouter = require("./routes/iec");
app.use(`${prefix}/iec`, iecRouter);
app.use(`${prefix}/iecs`, iecRouter.serveFiles); // ficheiros públicos: /api/iecs/<ficheiro>
app.use(`${prefix}/faqs`, require("./routes/faqs"));
app.use(`${prefix}/form`, require("./routes/form"));
app.use(`${prefix}/personalization`, require("./routes/personalization"));
app.use(`${prefix}/product`, require("./routes/product"));

// Tratamento final de erros (tem de ser o último)
app.use(errorHandler);

module.exports = app;
