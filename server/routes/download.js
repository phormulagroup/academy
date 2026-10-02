var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");

router.use((req, res, next) => {
	console.log("---------------------------");
	console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
	console.log("---------------------------");
	next();
});

router.get("/read", async (req, res) => {
	console.log("//// READ DOWNLOAD ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query("SELECT * FROM download WHERE is_deleted = 0");
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readByLang", async (req, res) => {
	console.log("//// READ DOWNLOAD ////");
	const query = util.promisify(db.query).bind(db);
	try {
		// Para incluir downloads inativos, o backoffice envia include_deleted=1
		const includeDeleted = req.query.include_deleted === "1";
		const downloadFilter = includeDeleted ? "" : " AND is_deleted = 0";
		const rows = await query(
			`SELECT * FROM download WHERE id_lang = ?${downloadFilter}; ` +
				`SELECT * FROM download_item WHERE is_deleted = 0 AND id_download IN (SELECT id FROM download WHERE id_lang = ?${downloadFilter})`,
			[req.query.id_lang, req.query.id_lang],
		);
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

router.get("/readBySlug", async (req, res) => {
	console.log("//// READ DOWNLOAD ////");
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query(
			"SELECT * FROM download WHERE slug = ? AND id_lang = ? AND is_deleted = 0; " +
				"SELECT * FROM download_item WHERE is_deleted = 0 AND id_download IN (SELECT id FROM download WHERE slug = ? AND id_lang = ? AND is_deleted = 0)",
			[req.query.slug, req.query.id_lang, req.query.slug, req.query.id_lang],
		);
		res.send({ download: rows[0][0], items: rows[1] });
	} catch (e) {
		throw e;
	}
});

router.post("/create", requirePermission("download", "create"), async (req, res, next) => {
	console.log("//// CREATE DOWNLOAD ////");
	try {
		const query = util.promisify(db.query).bind(db);
		let data = req.body.data;
		let items = data.items;
		data.country =
			data.country && data.country.length > 0
				? JSON.stringify(data.country)
				: null;
		delete data.items;

		data.slug = slugify(data.name, { lower: true, strict: true });
		const insertedRow = await query("INSERT INTO download SET ?", data);
		let dataInsert = [];

		for (let i = 0; i < items.length; i++) {
			dataInsert.push([
				insertedRow.insertId,
				items[i].name,
				items[i].file,
				data.id_lang,
			]);
		}
		const insertedItemsRow = await query(
			"INSERT INTO download_item (id_download, name, file, id_lang) VALUES ?",
			[dataInsert],
		);
		res.send(insertedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/update", requirePermission("download", "update"), async (req, res, next) => {
	console.log("//// UPDATE DOWNLOAD ////");
	try {
		let data = req.body.data;
		let whereId = data.id;
		let items = data.items || [];
		data.country =
			data.country && data.country.length > 0
				? JSON.stringify(data.country)
				: null;
		delete data.items;
		delete data.id;

		const columns = Object.keys(data);
		const values = Object.values(data);

		const query = util.promisify(db.query).bind(db);
		const updatedRow = await query(
			"UPDATE download SET " +
				columns.join(" = ?, ") +
				" = ? WHERE id = " +
				whereId,
			values,
		);

		// Ficheiros: os que saíram da lista ficam inativos, os existentes são atualizados e os novos são inseridos
		const keptIds = items.filter((i) => i.id).map((i) => i.id);
		await query(
			"UPDATE download_item SET is_deleted = 1 WHERE id_download = ?" + (keptIds.length > 0 ? " AND id NOT IN (?)" : ""),
			[whereId, keptIds],
		);
		for (let i = 0; i < items.length; i++) {
			if (items[i].id) {
				await query("UPDATE download_item SET name = ?, file = ? WHERE id = ?", [items[i].name, items[i].file, items[i].id]);
			}
		}
		const newItems = items.filter((i) => !i.id).map((i) => [whereId, i.name, i.file, data.id_lang]);
		if (newItems.length > 0) {
			await query("INSERT INTO download_item (id_download, name, file, id_lang) VALUES ?", [newItems]);
		}

		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

router.post("/preview", async (req, res, next) => {
	console.log("//// PREVIEW DOWNLOAD ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const previewRow = await query(
			"UPDATE download_item SET view = view + 1 WHERE id = " + req.body.data.id,
		);
		res.send(previewRow);
	} catch (err) {
		throw err;
	}
});

router.post("/download", async (req, res, next) => {
	console.log("//// DOWNLOAD DOWNLOAD ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const downloadRow = await query(
			"UPDATE download_item SET download = download + 1 WHERE id = " +
				req.body.data.id,
		);
		res.send(downloadRow);
	} catch (err) {
		throw err;
	}
});

router.post("/delete", requirePermission("download", "delete"), async (req, res, next) => {
	console.log("//// DELETE DOWNLOAD ////");
	try {
		const query = util.promisify(db.query).bind(db);
		const deletedRow = await query(
			"UPDATE download SET is_deleted = 1 WHERE id = " + req.body.data.id,
		);
		res.send(deletedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
