var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");
var fs = require("fs");
var path = require("path");

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");

router.get("/read", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query("SELECT * FROM document WHERE is_deleted = 0");
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readByLang", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		// A app só vê documentos ativos; o backoffice pede também os inativos (include_deleted=1) para os mostrar como "Inativo"
		const includeDeleted = req.query.include_deleted === "1";
		const rows = await query(`SELECT * FROM document WHERE id_lang = ?${includeDeleted ? "" : " AND is_deleted = 0"}`, [req.query.id_lang]);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readBySlug", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query("SELECT * FROM document WHERE slug = ? AND id_lang = ? AND is_deleted = 0", [req.query.slug, req.query.id_lang]);
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
		const response = await fetch((process.env.MEDIA_FALLBACK_URL || "https://academy.phormuladev.com/api/media/") + encodeURIComponent(fileName));
		buffer = await response.arrayBuffer();
	}

	res.setHeader("Content-Type", "application/pdf");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
	res.setHeader("Accept-Ranges", "bytes");

	res.send(Buffer.from(buffer));
});

router.post("/create", requirePermission("document", "create"), async (req, res, next) => {
	try {
		const query = util.promisify(db.query).bind(db);
		const data = req.body.data;
		data.country = data.country && data.country.length > 0 ? JSON.stringify(data.country) : null;
		data.slug = slugify(data.name, { lower: true, strict: true });
		const insertedRow = await query("INSERT INTO document SET ?", data);
		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/update", requirePermission("document", "update"), async (req, res, next) => {
	try {
		let data = req.body.data;
		let whereId = data.id;
		delete data.id;
		data.country = data.country && data.country.length > 0 ? JSON.stringify(data.country) : null;

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query("UPDATE document SET " + setClause(columns) + " WHERE id = ?", [...values, toId(whereId)]);

		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/delete", requirePermission("document", "delete"), async (req, res, next) => {
	try {
		const query = util.promisify(db.query).bind(db);
		const deletedRow = await query("UPDATE document SET is_deleted = 1 WHERE id = ?", [toId(req.body.data.id)]);
		res.send(deletedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
