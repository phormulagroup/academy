const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const dayjs = require("dayjs");
const express = require("express");
const util = require("util");
const http = require("http"); // <--- ADICIONADO
const { Server } = require("socket.io"); // <--- ADICIONADO

/* Utils import */
const middleware = require("./utils/middleware");
const db = require("./utils/database");

/* Socket imports */
const setupSocket = require("./socket");
const { setSocketInstance } = require("./socketInstance");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

/* Criar servidor HTTP */
const server = http.createServer(app); // <--- MUDANÇA IMPORTANTE

/* Iniciar Socket.IO */
const socket = setupSocket(server); // <--- INICIALIZA AQUI
setSocketInstance(socket); // <--- TORNA GLOBAL

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

/* MUDAR DE app.listen para server.listen */
server.listen(port, () => {
	console.log(`---------- STARTING SERVER ----------`);
	console.log(`${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);
	console.log(`Server running at ${port}`);
	console.log(`--------------------`);
});

/* Conexão BD */
db.getConnection((error, conn) => {
	console.log(`---------- CONNECTING TO DB ----------`);
	if (error) {
		throw error;
	} else {
		console.log("MySQL database is connected successfully");
		console.log(`--------------------`);
		conn.release();
	}
});

app.use("/media", express.static("media"));

app.get("/", (req, res) => {
	res.end("PHORMULA SHARE API!");
});

/* Rotas */
app.use("/auth", require("./routes/auth"));
app.use("/dashboard", middleware, require("./routes/dashboard"));
app.use("/logs", middleware, require("./routes/logs"));
app.use("/user", middleware, require("./routes/user"));
app.use("/course", middleware, require("./routes/course"));
app.use("/language", require("./routes/language"));
app.use("/role", middleware, require("./routes/role"));
app.use("/media", require("./routes/media"));
app.use("/import", middleware, require("./routes/import"));
app.use("/settings", require("./routes/settings"));
app.use("/email", middleware, require("./routes/email"));
app.use("/certificate", middleware, require("./routes/certificate"));
app.use("/notification", middleware, require("./routes/notification"));
app.use("/inbox", middleware, require("./routes/inbox"));
app.use("/document", middleware, require("./routes/document"));
app.use("/download", middleware, require("./routes/download"));
app.use("/faqs", require("./routes/faqs"));
app.use("/form", require("./routes/form"));
app.use("/personalization", require("./routes/personalization"));
app.use("/product", require("./routes/product"));

module.exports = app;
