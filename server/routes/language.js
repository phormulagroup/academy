var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const middleware = require("../utils/middleware");
const { requirePermission } = require("../utils/permissions");

// Completo (com as traduções) para o backoffice; ?light=1 devolve só a lista (sem traduções, com a versão de cada uma: um resumo (CRC32) do próprio
// texto das traduções, por isso muda sempre que se edita uma tradução, mesmo que a coluna modified_at não se atualize), que é o que a
// webapp pede em cada carga de página: as traduções vêm a seguir, uma língua de cada vez e com cache (/translation)
router.get("/read", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		if (req.query.light === "1") {
			const rows = await query(
				"SELECT id, flag, name, code, country, is_default, created_at, modified_at, CRC32(IFNULL(translation, '')) AS version, IF(translation IS NULL, 0, 1) AS has_translation, IF(JSON_VALID(translation), JSON_LENGTH(translation), 0) AS translation_count FROM language",
			);
			// Sempre confirmada (ETag, resposta 304 minúscula): uma tradução editada chega logo à página seguinte, sem esperar por prazos de cache
			res.set("Cache-Control", "no-cache");
			return res.send(rows);
		}
		const rows = await query("SELECT * FROM language");
		res.send(rows);
	} catch (e) {
		throw e;
	}
});

// Traduções de uma língua (lista de { key, value }). Com ?v=<versão> o URL muda sempre que as traduções mudam, por isso pode ficar em
// cache um ano; sem versão, o browser confirma sempre (ETag) antes de usar.
router.get("/translation", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	const [row] = await query("SELECT translation FROM language WHERE code = ?", [String(req.query.code || "")]);
	if (!row) return res.status(404).send({ message: "Language not found" });
	res.set("Cache-Control", req.query.v ? "public, max-age=31536000, immutable" : "no-cache");
	res.type("application/json").send(row.translation || "[]");
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
			"UPDATE language SET " + setClause(columns) + " WHERE id = ?",
			[...values, toId(whereId)],
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
		const id = toId(req.body.data.id);
		await query("UPDATE language SET is_default = 0 WHERE id != ?", [id]);
		const updatedRow = await query("UPDATE language SET is_default = 1 WHERE id = ?", [id]);
		res.send(updatedRow);
	} catch (err) {
		throw err;
	}
});

module.exports = router;
