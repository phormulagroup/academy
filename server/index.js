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

/* Routes import */
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const logsRouter = require("./routes/logs");
const userRouter = require("./routes/user");
const courseRouter = require("./routes/course");
const importRouter = require("./routes/import");
const languageRouter = require("./routes/language");
const roleRouter = require("./routes/role");
const mediaRouter = require("./routes/media");
const settingsRouter = require("./routes/settings");
const emailRouter = require("./routes/email");
const certificateRouter = require("./routes/certificate");
const notificationRouter = require("./routes/notification");
const inboxRouter = require("./routes/inbox");
const documentRouter = require("./routes/document");
const downloadRouter = require("./routes/download");

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
app.use("/auth", authRouter);
app.use("/dashboard", middleware, dashboardRouter);
app.use("/logs", middleware, logsRouter);
app.use("/user", middleware, userRouter);
app.use("/course", middleware, courseRouter);
app.use("/language", languageRouter);
app.use("/role", middleware, roleRouter);
app.use("/media", mediaRouter);
app.use("/import", middleware, importRouter);
app.use("/settings", middleware, settingsRouter);
app.use("/email", middleware, emailRouter);
app.use("/certificate", middleware, certificateRouter);
app.use("/notification", middleware, notificationRouter);
app.use("/inbox", middleware, inboxRouter);
app.use("/document", middleware, documentRouter);
app.use("/download", middleware, downloadRouter);

module.exports = app;
