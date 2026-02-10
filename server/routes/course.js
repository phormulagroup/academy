var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", async (req, res) => {
  console.log("//// READ COURSE ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM course");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readById", async (req, res) => {
  console.log("//// READ COURSE BY ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM course WHERE id = ?; SELECT course_module. * FROM course_module WHERE id_course = ?; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id WHERE course_module.id_course = ?; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id WHERE course_module.id_course = ?",
      [req.query.id, req.query.id, req.query.id, req.query.id],
    );
    res.send({ course: rows[0], modules: rows[1], topics: rows[2], tests: rows[3] });
  } catch (e) {
    throw e;
  }
});

router.get("/readBySlug", async (req, res) => {
  console.log("//// READ COURSE BY SLUG ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM course WHERE slug = ?; SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE course.slug = ?; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.slug = ?; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.slug = ?; " +
        "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course_user_activity.id_user = ? AND course.slug = ?",
      [req.query.slug, req.query.slug, req.query.slug, req.query.slug, req.query.id_user, req.query.slug],
    );
    res.send({ course: rows[0], modules: rows[1], topics: rows[2], tests: rows[3], progress: rows[4] });
  } catch (e) {
    throw e;
  }
});

router.get("/readByTopicId", async (req, res) => {
  console.log("//// READ COURSE BY TOPIC ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT course_topic.*, course.name as `course_name`, course_module.title as `course_module_title` FROM course_topic " +
        "LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course_topic.id = ?; ",
      [req.query.id],
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readByTestId", async (req, res) => {
  console.log("//// READ COURSE BY QUIZZ ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT course_test.*, course.name as `course_name`, course_module.title as `course_module_title` FROM course_topic " +
        "LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course_test.id = ?; SELECT * FROM course_test_question WHERE id_course_test = ?",
      [req.query.idTest, req.query.idTest],
    );
    res.send({ test: rows[0], questions: rows[1] });
  } catch (e) {
    throw e;
  }
});

router.post("/create", async (req, res, next) => {
  console.log("//// CREATE COURSE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    const insertedRow = await query("INSERT INTO course SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", async (req, res, next) => {
  console.log("//// UPDATE COURSE ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE course SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/updateTopic", async (req, res, next) => {
  console.log("//// UPDATE COURSE TOPIC ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE course_topic SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/updateProgress", async (req, res, next) => {
  console.log("//// UPDATE COURSE PROGRESS ////");
  try {
    let data = req.body.data;
    const query = util.promisify(db.query).bind(db);

    const columns = Object.keys(data[0]);

    // Converter objetos → array de arrays
    const rows = data.map(
      (obj) => columns.map((col) => obj[col]), // garante ordem correta
    );

    // Query
    const insertedRow = await query(
      "INSERT INTO course_user_activity (" + columns.join(", ") + ") VALUES ?",
      [rows], // 👈 precisa ser array de arrays
    );

    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/module", async (req, res, next) => {
  console.log("//// UPDATE COURSE MODULE ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      let data = req.body.data;
      for (let i = 0; i < data.length; i++) {
        const aux = data[i];

        const insertedModule = await query(
          "INSERT INTO course_module SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), position = VALUES(position)",
          {
            id: aux.id.split("-")[0] === "newmod" ? null : parseInt(aux.id.split("-")[1]),
            id_course: aux.id_course,
            title: aux.title,
            description: aux.description,
            position: i,
          },
        );
        aux.id = aux.id.split("-")[0] === "newmod" ? insertedModule.insertId : parseInt(aux.id.split("-")[1]);

        if (aux.items && aux.items.length > 0) {
          let newItems = [];
          for (let z = 0; z < aux.items.length; z++) {
            console.log(aux.items[z].type);
            const insertedItem = await query(
              `INSERT INTO ${aux.items[z].type === "test" ? "course_test" : "course_topic"} SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), id_course_module = VALUES(id_course_module)`,
              {
                id: aux.items[z].id.split("-")[0] === "newit" ? null : parseInt(aux.items[z].id.split("-")[1]),
                id_course_module: aux.id,
                title: aux.items[z].title,
              },
            );

            newItems.push({ id: aux.items[z].id.split("-")[0] === "newit" ? insertedItem.insertId : parseInt(aux.items[z].id.split("-")[1]), type: aux.items[z].type });
          }

          await query("UPDATE course_module SET items = ? WHERE id = ?", [JSON.stringify(newItems), aux.id]);
        }
      }

      await commit();
      conn.release();
      res.send(data);
    } catch (err) {
      await rollback();
      conn.release();
      throw err;
    }
  });
});

router.post("/delete", async (req, res, next) => {
  console.log("//// DELETE COURSE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE course SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
