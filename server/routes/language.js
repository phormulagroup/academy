var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const middleware = require("../utils/middleware");
const { requirePermission } = require("../utils/permissions");

router.get("/read", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query("SELECT * FROM language");
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.post("/create", middleware, requirePermission("language", "create"), async (req, res, next) => {
	try {
		const query = util.promisify(db.query).bind(db);
		const data = req.body.data;
		data.country =
			data.country && data.country.length > 0
				? JSON.stringify(data.country)
				: null;
		const insertedRow = await query("INSERT INTO language SET ?", data);
		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/update", middleware, requirePermission("language", "update"), async (req, res, next) => {
	try {
		let data = req.body.data;
		let whereId = data.id;
		data.country =
			data.country && data.country.length > 0
				? JSON.stringify(data.country)
				: null;
		delete data.id;

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE language SET " +
				columns.join(" = ?, ") +
				" = ? WHERE id = " +
				whereId,
			values,
		);

		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

// Os idiomas não se apagam pelo backoffice: as contas, os cursos e as traduções dependem deles
router.post("/delete", middleware, requirePermission("language", "delete"), (req, res) => {
	res.status(405).send({ message: "Languages cannot be deleted" });
});

router.post("/default", middleware, requirePermission("language", "update"), async (req, res, next) => {
	try {
		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE language SET is_default = 1 WHERE id = ?; UPDATE language SET is_default = 0 WHERE id != ?",
			[req.body.data.id, req.body.data.id],
		);
		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
