var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { read } = require("fs");

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
    const rows = await query(
      "SELECT * FROM course; " +
        "SELECT course_module. * FROM course_module WHERE is_deleted = 0; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "WHERE course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "WHERE course_test.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course_user_activity.id_user = ?; ",
      req.query.id_user,
    );

    let courses = rows[0];
    let modules = rows[1];
    let topics = rows[2];
    let tests = rows[3];
    let progress = rows[4];

    res.send({ courses, modules, topics, tests, progress });
  } catch (e) {
    throw e;
  }
});

router.get("/readProgress", async (req, res) => {
  console.log("//// READ PROGRESS BY USER ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course_user_activity.id_user = ? AND course.id_lang = ?; ",
      [req.query.id_user, req.query.id_lang],
    );

    let courses = rows[0];
    let modules = rows[1];
    let topics = rows[2];
    let tests = rows[3];
    let progress = rows[4];

    res.send({ courses, modules, topics, tests, progress });
  } catch (e) {
    throw e;
  }
});

router.get("/readByLang", async (req, res) => {
  console.log("//// READ COURSE BY LANG ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM course WHERE id_lang = ?; " +
        "SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE id_lang = ? AND course_module.is_deleted = 0; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_test.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course_user_activity.id_user = ? AND course.id_lang = ?; ",
      [req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_user, req.query.id_lang],
    );

    let courses = rows[0];
    let modules = rows[1];
    let topics = rows[2];
    let tests = rows[3];
    let progress = rows[4];

    res.send({ courses, modules, topics, tests, progress });
  } catch (e) {
    throw e;
  }
});

router.get("/readById", async (req, res) => {
  console.log("//// READ COURSE BY ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM course WHERE id = ? AND is_deleted = 0; SELECT course_module. * FROM course_module WHERE id_course = ? AND is_deleted = 0; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id WHERE course_module.id_course = ? " +
        "AND course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id WHERE course_module.id_course = ?" +
        "AND course_test.is_deleted = 0 AND course_module.is_deleted = 0; ",
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
      "SELECT * FROM course WHERE slug = ? AND id_lang = ? AND is_deleted = 0; SELECT course_module.* FROM course_module " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.slug = ? AND course_module.is_deleted = 0; " +
        "SELECT course_topic.* FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.slug = ? AND course_topic.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_test.* FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.slug = ? AND course_test.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_user_activity.* FROM course_user_activity LEFT JOIN course ON course.id = course_user_activity.id_course " +
        "WHERE course_user_activity.id_user = ? AND course.slug = ?",
      [req.query.slug, req.query.id_lang, req.query.slug, req.query.slug, req.query.slug, req.query.id_user, req.query.slug],
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
  console.log("//// READ COURSE BY TEST ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT course_test.*, course.name as `course_name`, course_module.title as `course_module_title` FROM course_test " +
        "LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course_test.id = ?",
      [req.query.idTest],
    );
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/report", async (req, res) => {
  console.log("/// REPORTS COURSE ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query(
      "SELECT * FROM user WHERE id_lang = ? AND is_deleted = 0; " +
        "SELECT * FROM course WHERE id_lang = ? AND is_deleted = 0; " +
        "SELECT course_module.* FROM course_module LEFT JOIN course ON course.id = course_module.id_course WHERE id_lang = ? AND course.is_deleted = 0 AND course_module.is_deleted = 0; " +
        "SELECT course_topic.*, course_module.id_course FROM course_topic LEFT JOIN course_module ON course_topic.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_module.is_deleted = 0 AND course_topic.is_deleted = 0 AND course.is_deleted = 0; " +
        "SELECT course_test.*, course_module.id_course FROM course_test LEFT JOIN course_module ON course_test.id_course_module = course_module.id " +
        "LEFT JOIN course ON course.id = course_module.id_course WHERE course.id_lang = ? AND course_module.is_deleted = 0 AND course_test.is_deleted = 0 AND course.is_deleted = 0; " +
        "SELECT cua.*, course_test.title as `test_title`, user.name as `user_name` FROM course_user_activity cua LEFT JOIN course ON course.id = cua.id_course " +
        "LEFT JOIN course_module ON cua.id_course_module = course_module.id LEFT JOIN course_topic ON cua.id_course_topic = course_topic.id " +
        "LEFT JOIN course_test ON cua.id_course_test = course_test.id LEFT JOIN user ON user.id = cua.id_user " +
        "WHERE course.id_lang = ? AND course.is_deleted = 0 AND (course_module.is_deleted = 0 OR cua.id_course_module IS NULL) " +
        "AND (course_topic.is_deleted = 0 OR cua.id_course_topic IS NULL) " +
        "AND (course_test.is_deleted = 0 OR cua.id_course_test IS NULL) " +
        "ORDER BY cua.created_at DESC; ",
      [req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang, req.query.id_lang],
    );

    let users = rows[0];
    let courses = rows[1];
    let modules = rows[2];
    let topics = rows[3];
    let tests = rows[4];
    let activity = rows[5];

    res.send({ users, courses, modules, topics, tests, activity });
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Some error on server.", error: e });
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

router.post("/updateTest", async (req, res, next) => {
  console.log("//// UPDATE COURSE TOPIC ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE course_test SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

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
      console.log(req.body.deleted);
      let deletedItems = req.body.deleted.items;
      let deletedModules = req.body.deleted.modules;

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
            const insertedItem = await query(
              `INSERT INTO ${aux.items[z].type === "test" ? "course_test" : "course_topic"} SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), id_course_module = VALUES(id_course_module), is_deleted = 0`,
              {
                id: aux.items[z].id.split("-")[0] === "newtopic" || aux.items[z].id.split("-")[0] === "newtest" ? null : parseInt(aux.items[z].id.split("-")[1]),
                id_course_module: aux.id,
                title: aux.items[z].title,
                is_deleted: 0,
              },
            );

            newItems.push({
              id: aux.items[z].id.split("-")[0] === "newtopic" || aux.items[z].id.split("-")[0] === "newtest" ? insertedItem.insertId : parseInt(aux.items[z].id.split("-")[1]),
              type: aux.items[z].type,
            });
          }

          await query("UPDATE course_module SET items = ? WHERE id = ?", [JSON.stringify(newItems), aux.id]);
        }
      }

      if (deletedItems.length > 0) {
        let deletedItemsId = deletedItems.filter((_t) => _t.includes("topic")).map((_i) => parseInt(_i.split("-")[1]));
        if (deletedItemsId.length > 0) {
          await query("UPDATE course_topic SET is_deleted = 1 WHERE id IN (?)", deletedItemsId);
        }

        let deletedTestsId = deletedItems.filter((_t) => _t.includes("test")).map((_i) => parseInt(_i.split("-")[1]));
        if (deletedTestsId.length > 0) {
          await query("UPDATE course_test SET is_deleted = 1 WHERE id IN (?)", deletedTestsId);
        }
      }

      if (deletedModules.length > 0) {
        let deletedModulesId = deletedModules.map((_i) => parseInt(_i.split("-")[1]));
        console.log(deletedModulesId);
        if (deletedModulesId.length > 0) {
          await query("UPDATE course_module SET is_deleted = 1 WHERE id IN (?)", deletedModulesId);
        }
      }

      await commit();
      conn.release();
      res.send(data);
    } catch (err) {
      console.log(err);
      await rollback();
      conn.release();
      throw err;
    }
  });
});

router.post("/duplicate", async (req, res, next) => {
  console.log("//// DUPLICATE COURSE ////");
  db.getConnection(async (error, conn) => {
    if (error) throw error;
    const query = util.promisify(conn.query).bind(conn);
    const transaction = util.promisify(conn.beginTransaction).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    try {
      await transaction();
      let data = req.body.data;
      console.log(data);
      let course = await query("SELECT * FROM course WHERE id = ?", data.id);
      course = course[0];
      delete course.id;
      course.name = data.new_name || course.name + " (copy)";
      course.internal_name = data.new_internal_name || course.internal_name + " (copy)";
      course.id_lang = data.id_lang || course.id_lang;
      course.id_certificate = null;
      course.status = "draft";
      const insertedCourse = await query("INSERT INTO course SET ?", course);

      let modules = await query("SELECT * FROM course_module WHERE id_course = ? AND is_deleted = 0", data.id);
      for (let i = 0; i < modules.length; i++) {
        let module = modules[i];
        delete module.id;
        module.id_course = insertedCourse.insertId;
        let moduleItems = module.items ? JSON.parse(module.items) : null;
        delete module.items;
        const insertedModule = await query("INSERT INTO course_module SET ?", module);
        if (moduleItems.length > 0) {
          let newItems = [];

          for (let z = 0; z < moduleItems.length; z++) {
            const item = moduleItems[z];
            const rowItem = item.type === "test" ? await query("SELECT * FROM course_test WHERE id = ?", item.id) : await query("SELECT * FROM course_topic WHERE id = ?", item.id);
            const rowItemData = rowItem[0];
            delete rowItemData.id;
            rowItemData.id_course_module = insertedModule.insertId;
            const insertedItem = await query(`INSERT INTO ${item.type === "test" ? "course_test" : "course_topic"} SET ?`, rowItemData);

            newItems.push({
              id: insertedItem.insertId,
              type: item.type,
            });
          }

          await query("UPDATE course_module SET items = ? WHERE id = ?", [JSON.stringify(newItems), insertedModule.insertId]);
        }
      }

      await commit();
      conn.release();
      res.send(data);
    } catch (err) {
      console.log(err);
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
