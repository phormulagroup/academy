var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var router = express.Router();
var slugify = require("slugify");
var fs = require("fs");
var path = require("path");
const { Readable } = require("stream");
const { MEDIA_DIR } = require("../utils/paths");

var db = require("../utils/database");
const { toId, setClause, columnList } = require("../utils/sql");
const { requirePermission } = require("../utils/permissions");

router.get("/read", async (req, res) => {
	const query = util.promisify(db.query).bind(db);
	try {
		const rows = await query("SELECT * FROM document WHERE is_deleted = 0 ORDER BY id_lang ASC, position ASC, id ASC");
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
		const rows = await query(`SELECT * FROM document WHERE id_lang = ?${includeDeleted ? "" : " AND is_deleted = 0"} ORDER BY position ASC, id ASC`, [req.query.id_lang]);
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
	// Serve o PDF pedido: primeiro o ficheiro local; se não existir, vai buscá-lo ao servidor remoto (MEDIA_FALLBACK_URL).
	// Em stream (não carrega o ficheiro todo para memória) e com cache do browser: os PDFs chegam a vários MB e a ligação ao servidor pode
	// ser lenta, por isso um documento que não mudou não se descarrega outra vez (ETag/Last-Modified, resposta 304 sem corpo).
	// A cache é privada (a rota exige sessão) e só vale para respostas BEM-SUCEDIDAS: um erro nunca pode ficar guardado no browser, senão um
	// documento que falhou uma vez continuava "sem abrir" durante uma hora mesmo existindo.
	const CACHE = "private, max-age=3600";
	const fail = (status, message) => {
		res.removeHeader("Cache-Control");
		res.setHeader("Cache-Control", "no-store");
		return res.status(status).send({ message });
	};

	const fileName = path.basename(req.query.file || "");
	if (!fileName) return fail(400, "File is required");

	// Sem Access-Control-Allow-Origin aqui: o CORS é do middleware da API (index.js), que devolve a origem do pedido com credenciais. Um "*"
	// numa resposta a um pedido com sessão (withCredentials) é recusado pelo browser, e com a webapp e a API em origens diferentes (por
	// exemplo, em desenvolvimento: localhost:5173 e localhost:4000) o documento nunca abria. Só se acrescenta o que o progresso do
	// descarregamento precisa de ler (mantendo o Date que o middleware já expõe).
	res.setHeader("Access-Control-Expose-Headers", "Date, Content-Length, Content-Range");

	try {
		const localFile = path.join(MEDIA_DIR, fileName);
		if (fs.existsSync(localFile)) {
			// sendFile trata do Range, do ETag e do 304; o Content-Type vem da extensão (.pdf)
			return res.sendFile(localFile, { cacheControl: false, headers: { "Cache-Control": CACHE } }, (err) => {
				if (err && !res.headersSent) fail(err.status || 500, "Could not read the file");
			});
		}

		const response = await fetch((process.env.MEDIA_FALLBACK_URL || "https://academy.phormuladev.com/api/media/") + encodeURIComponent(fileName), { signal: AbortSignal.timeout(30000) });
		// O servidor remoto respondeu com um erro (ou com uma página em vez de um PDF): nunca se envia isso como se fosse o documento
		const remoteType = response.headers.get("content-type") || "";
		if (!response.ok || !response.body || !/pdf|octet-stream/i.test(remoteType)) return fail(response.status === 404 || response.ok ? 404 : 502, "File not found");
		res.setHeader("Cache-Control", CACHE);
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Accept-Ranges", "none");
		const length = response.headers.get("content-length");
		if (length) res.setHeader("Content-Length", length);
		Readable.fromWeb(response.body)
			.on("error", () => res.destroy())
			.pipe(res);
	} catch (e) {
		console.error(`readFile ${fileName}: ${e.message}`);
		if (!res.headersSent) fail(502, "Could not read the file");
	}
});

router.post("/create", requirePermission("document", "create"), async (req, res, next) => {
	try {
		const query = util.promisify(db.query).bind(db);
		const data = req.body.data;
		data.country = data.country && data.country.length > 0 ? JSON.stringify(data.country) : null;
		data.slug = slugify(data.name, { lower: true, strict: true });
		// Um documento novo fica no início da lista do seu idioma (position = índice 0); os restantes descem uma posição
		await query("UPDATE document SET position = position + 1 WHERE id_lang = ?", [data.id_lang]);
		data.position = 0;
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
