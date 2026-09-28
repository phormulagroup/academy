var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");
var fs = require("fs");
var path = require("path");

var db = require("../utils/database");

router.use((req, res, next) => {
	console.log("---------------------------");
	console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
	console.log("---------------------------");
	next();
});

router.get("/read", async (req, res) => {
	console.log("//// READ DOCUMENT ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query("SELECT * FROM document WHERE is_deleted = 0");
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readByLang", async (req, res) => {
	console.log("//// READ DOCUMENT ////");
	const query = util.promisify(db.query).bind(db);
	try {
		// A app só vê documentos ativos; o backoffice pede também os inativos (include_deleted=1) para os mostrar como "Inativo"
		const includeDeleted = req.query.include_deleted === "1";
		const rows = await query(
			`SELECT * FROM document WHERE id_lang = ?${includeDeleted ? "" : " AND is_deleted = 0"}`,
			[req.query.id_lang],
		);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readBySlug", async (req, res) => {
	console.log("//// READ DOCUMENT ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT * FROM document WHERE slug = ? AND id_lang = ? AND is_deleted = 0",
			[req.query.slug, req.query.id_lang],
		);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readFile", async (req, res) => {
	// Serve o ficheiro PDF solicitado. Primeiro tenta servir a partir do servidor local; se não existir, busca do servidor remoto.
	const fileName = path.basename(req.query.file || "");
	const localFile = path.join(__dirname, "..", "media", fileName);
	let buffer;
	if (fileName && fs.existsSync(localFile)) {
		buffer = fs.readFileSync(localFile);
	} else {
		const response = await fetch(
			"https://academyapi.phormuladev.com/media/" + encodeURIComponent(fileName),
		);
		buffer = await response.arrayBuffer();
	}

	res.setHeader("Content-Type", "application/pdf");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader(
		"Access-Control-Expose-Headers",
		"Content-Length, Content-Range",
	);
	res.setHeader("Accept-Ranges", "bytes");

	res.send(Buffer.from(buffer));
});

router.post("/create", async (req, res, next) => {
	console.log("//// CREATE DOCUMENT ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const data = req.body.data;
		data.country =
			data.country && data.country.length > 0
				? JSON.stringify(data.country)
				: null;
		data.slug = slugify(data.name, { lower: true, strict: true });
		const insertedRow = await query("INSERT INTO document SET ?", data);
		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/update", async (req, res, next) => {
	console.log("//// UPDATE DOCUMENT ////");
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;
		data.country =
			data.country && data.country.length > 0
				? JSON.stringify(data.country)
				: null;

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE document SET " +
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

router.post("/delete", async (req, res, next) => {
	console.log("//// DELETE DOCUMENT ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const deletedRow = await query(
			"UPDATE document SET is_deleted = 1 WHERE id = " + req.body.data.id,
		);
		res.send(deletedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
