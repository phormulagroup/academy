const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const dayjs = require("dayjs");
const express = require("express");
const util = require("util");

/* Utils import */
const middleware = require("./utils/middleware");
const db = require("./utils/database");

/* Routes import */
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const logsRouter = require("./routes/logs");
const userRouter = require("./routes/user");
const clientRouter = require("./routes/course");
const departmentRouter = require("./routes/department");
const projectRouter = require("./routes/project");
const accountRouter = require("./routes/account");
const importRouter = require("./routes/import");
const roleRouter = require("./routes/role");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(compression());

// Limitação de taxa para evitar abusos
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutos
  max: 600,
});

app.use(limiter);

app.use(express.json());
app.use(cors());

let server = app.listen(port, () => {
  console.log(`---------- STARTING SERVER ----------`);
  console.log(`${dayjs().format("YYYY-MM-DD HH:mm:ss")}`);
  console.log(`Server running at ${port}`);
  console.log(`--------------------`);
});

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

app.get("/", (req, res) => {
  res.end("PHORMULA SHARE API!");
});

app.use("/auth", authRouter);
app.use("/dashboard", middleware, dashboardRouter);
app.use("/logs", middleware, logsRouter);
app.use("/user", middleware, userRouter);
app.use("/course", middleware, clientRouter);
app.use("/department", middleware, departmentRouter);
app.use("/project", middleware, projectRouter);
app.use("/account", middleware, accountRouter);
app.use("/import", middleware, importRouter);
app.use("/role", middleware, roleRouter);

module.exports = app;
