var express = require("express");
const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");
var fileUpload = require("express-fileupload");
const middleware = require("../utils/middleware");

var router = express.Router();
var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");
const util = require("util");
const query = util.promisify(db.query).bind(db);
// Os mesmos tipos de ficheiro da Multimédia (imagem, PDF, vídeo...), para o filtro por tipo
const { KIND_EXTENSIONS } = require("./media");
const { writeZip, zipLimitsError } = require("../utils/zip");

// Os ficheiros vivem nesta pasta: já contém os IECs em uso (em produção, /regional/wp-content/uploads/iec no cPanel).
// O QRCode impresso aponta para IEC_PUBLIC_URL/<nome do ficheiro>, por isso o nome e o caminho nunca podem mudar.
const IEC_DIR = process.env.IEC_DIR || path.join(__dirname, "..", "media", "iec");
const DELETED_DIR = path.join(IEC_DIR, "_deleted");
// Máximo de IECs ativos (não apagados) na biblioteca; substituir um ficheiro com o mesmo nome não conta como novo
const IEC_LIMIT = 100;
const LIMIT_MESSAGE = "The limit of 100 IECs has been reached";
const countActive = async () => (await query("SELECT COUNT(*) AS total FROM iec WHERE is_deleted = 0"))[0].total;
fs.mkdirSync(DELETED_DIR, { recursive: true });

// A BD guarda a lista dos IECs; o nome (único, sensível a maiúsculas como os URLs) é o identificador que o QRCode usa
query(
  `CREATE TABLE IF NOT EXISTS iec (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_iec_name (name)
  )`,
).catch((e) => console.error("Failed to ensure iec table", e));

// Sem IEC_PUBLIC_URL (staging/local), os ficheiros são servidos pelo próprio servidor
const publicUrl = (req, name) => {
  const prefix = (process.env.API_PREFIX || "").replace(/\/$/, "");
  const base = process.env.IEC_PUBLIC_URL || `${req.protocol}://${req.get("host")}${prefix}/iecs`;
  return `${base.replace(/\/$/, "")}/${encodeURIComponent(name)}`;
};

// Tipos aceites e a assinatura (magic bytes) que o conteúdo tem de ter, para não bastar mudar a extensão
const TYPES = {
  pdf: (b) => b.slice(0, 5).toString() === "%PDF-",
  png: (b) => b.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  jpg: (b) => b.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  jpeg: (b) => b.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  mp4: (b) => b.slice(4, 8).toString() === "ftyp",
};
const extOf = (name) => path.extname(name).slice(1).toLowerCase();
const isValidName = (name) => name && name === path.basename(name) && !name.startsWith(".") && !!TYPES[extOf(name)];

/* Público: serve os ficheiros quando não há IEC_PUBLIC_URL, ou como destino do redirect do .htaccess */
const serveFiles = express.static(IEC_DIR, { dotfiles: "deny", index: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-cache") });
router.use("/files", serveFiles);

const diskNames = () => fs.readdirSync(IEC_DIR, { withFileTypes: true }).filter((f) => f.isFile() && isValidName(f.name)).map((f) => f.name);

// Regista na BD os PDFs que já estão na pasta (os IECs em uso) e os que lá forem postos por outra via
let lastSync = 0;
async function syncFolder({ force = false } = {}) {
  // Ler a pasta e registar tudo a cada pedido não escala com muitos IECs: no máximo uma vez a cada 20 s (o upload e o apagar já atualizam a BD)
  if (!force && Date.now() - lastSync < 20 * 1000) return;
  lastSync = Date.now();
  const names = diskNames();
  if (names.length) await query("INSERT INTO iec (name) VALUES ? ON DUPLICATE KEY UPDATE is_deleted = 0", [names.map((n) => [n])]);
}

// Ficheiro de um IEC com o tamanho, a data de modificação e o endereço público (só se consulta o disco dos que se mostram)
function describe(req, r) {
  const file = path.join(IEC_DIR, r.name);
  const stat = fs.existsSync(file) ? fs.statSync(file) : null;
  return { ...r, size: stat ? stat.size : null, updated_at: stat ? stat.mtime : r.updated_at, missing: !stat, url: publicUrl(req, r.name) };
}

// Lista paginada: ?page=1&limit=30&search=&kinds=image,pdf,video — pesquisa, tipo e ordenação (mais recentes primeiro) na base de dados
router.get("/list", middleware, requirePermission("iec", "read"), async (req, res) => {
  try {
    await syncFolder();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 30));
    const where = ["is_deleted = 0"];
    const params = [];
    const search = String(req.query.search || "").trim();
    if (search) {
      where.push("name LIKE ?");
      params.push(`%${search}%`);
    }
    // Tipos pela extensão, como na Multimédia (vídeo = MP4, imagem = PNG/JPG)
    const kinds = String(req.query.kinds || "").split(",").filter((k) => KIND_EXTENSIONS[k]);
    if (kinds.length) {
      where.push(`(${kinds.map(() => "LOWER(name) REGEXP ?").join(" OR ")})`);
      kinds.forEach((k) => params.push(`\\.(${KIND_EXTENSIONS[k].join("|")})$`));
    }
    const clause = where.join(" AND ");
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM iec WHERE ${clause}`, params);
    const rows = await query(`SELECT id, name, created_at, updated_at FROM iec WHERE ${clause} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    // active/max: nº de IECs ativos (sem filtros) e o máximo permitido, para o indicador "N/100"
    res.send({ rows: rows.map((r) => describe(req, r)), total, page, limit, active: await countActive(), max: IEC_LIMIT });
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});

router.get("/read", middleware, requirePermission("iec", "read"), async (req, res) => {
  try {
    await syncFolder({ force: true });
    const rows = await query("SELECT id, name, created_at, updated_at FROM iec WHERE is_deleted = 0");
    const items = rows.map((r) => describe(req, r));
    res.send(items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});

/* Diz quais dos nomes enviados já existem, para o backoffice pedir confirmação antes de substituir */
router.post("/check", middleware, requirePermission("iec", "create"), async (req, res) => {
  try {
    const names = (Array.isArray(req.body.names) ? req.body.names : []).filter(isValidName);
    const rows = names.length ? await query("SELECT name FROM iec WHERE is_deleted = 0 AND name IN (?)", [names]) : [];
    const existing = new Set(rows.map((r) => r.name));
    names.forEach((n) => fs.existsSync(path.join(IEC_DIR, n)) && existing.add(n));
    // Também os dados dos que já existem (tamanho, data, endereço), para o ecrã de substituição mostrar o ficheiro atual
    // active/max: para o backoffice avisar antes de enviar ficheiros novos que ultrapassem o limite
    res.send({ existing: [...existing], items: [...existing].map((name) => describe(req, { name })), active: await countActive(), max: IEC_LIMIT });
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});

// Os uploads em paralelo passam um de cada vez pela verificação do limite e pela escrita, para não ultrapassarem os 100 juntos
let uploadLock = Promise.resolve();
const withUploadLock = (fn) => {
  const run = uploadLock.then(fn, fn);
  uploadLock = run.catch(() => {});
  return run;
};

router.post("/upload", middleware, requirePermission("iec", "create"), fileUpload({ defParamCharset: "utf8" }), async (req, res) => {
  try {
    const file = req.files && req.files.file;
    if (!file) return res.status(400).send({ message: "No file" });

    const name = path.basename(file.name);
    if (!isValidName(name) || !TYPES[extOf(name)](file.data)) {
      return res.status(400).send({ message: "Only PDF, MP4, PNG and JPG files are allowed" });
    }

    const target = path.join(IEC_DIR, name);
    const result = await withUploadLock(async () => {
      const rows = await query("SELECT id FROM iec WHERE name = ? AND is_deleted = 0", [name]);
      const exists = fs.existsSync(target) || rows.length > 0;
      // Só substitui se o utilizador confirmou
      if (exists && req.body.replace !== "1") return { status: 409, body: { message: "File already exists", name } };
      // Um ficheiro novo não pode passar o limite (uma substituição mantém o número de IECs)
      if (!exists && (await countActive()) >= IEC_LIMIT) return { status: 400, body: { message: LIMIT_MESSAGE, limit: IEC_LIMIT } };

      // Escrita atómica: quem lê o QRCode nunca apanha um ficheiro a meio da substituição
      const tmp = path.join(IEC_DIR, `.${name}.tmp`);
      await file.mv(tmp);
      fs.renameSync(tmp, target);
      await query("INSERT INTO iec (name) VALUES (?) ON DUPLICATE KEY UPDATE is_deleted = 0, updated_at = NOW()", [name]);
      return { body: { id: name, name, url: publicUrl(req, name), replaced: exists } };
    });
    if (result.status) return res.status(result.status).send(result.body);
    res.send(result.body);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Upload failed" });
  }
});

/* Descarrega um IEC como anexo (para descarregar vários de uma vez no backoffice, mesmo com IEC_PUBLIC_URL noutro domínio) */
router.get("/file", middleware, requirePermission("iec", "read"), (req, res) => {
  const name = String(req.query.name || "");
  const file = path.join(IEC_DIR, name);
  if (!isValidName(name) || !fs.existsSync(file)) return res.status(404).send({ message: "Not found" });
  res.download(file, name, (err) => err && !res.headersSent && res.status(500).send("Error"));
});

// Vários IECs num só ZIP (descarga em massa): AAAA-MM-DD_HHmmss_Bial_Regional_Academy_IECs.zip (como os exports Excel). Nome do ZIP em ASCII (sem acentos
// nem espaços) para abrir bem em qualquer sistema e anexo de e-mail; os nomes dos IECs lá dentro mantêm-se (UTF-8)
router.post("/zip", middleware, requirePermission("iec", "read"), async (req, res) => {
  try {
    const names = [...new Set((req.body.data?.names || []).filter(isValidName))];
    const entries = names.map((name) => ({ name, path: path.join(IEC_DIR, name) })).filter((e) => fs.existsSync(e.path));
    if (!entries.length) return res.status(404).send({ message: "Not found" });
    const limitError = zipLimitsError(entries);
    if (limitError) return res.status(400).send({ message: limitError });
    const fileName = `${dayjs().format("YYYY-MM-DD_HHmmss")}_Bial_Regional_Academy_IECs.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    await writeZip(res, entries);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).send("Error");
    else res.destroy();
  }
});

/* Nunca apaga: move para _deleted, recuperável à mão (um QRCode impresso deixa de funcionar enquanto lá estiver)
   Aceita um nome (data.name) ou vários de uma vez (data.names), para a seleção em massa */
router.post("/delete", middleware, requirePermission("iec", "delete"), async (req, res) => {
  try {
    const data = req.body.data || {};
    const names = (Array.isArray(data.names) ? data.names : [data.name]).filter(isValidName);
    if (!names.length) return res.status(404).send({ message: "Not found" });
    const stamp = dayjs().format("YYYYMMDD-HHmmss");
    names.forEach((name) => {
      const file = path.join(IEC_DIR, name);
      if (fs.existsSync(file)) fs.renameSync(file, path.join(DELETED_DIR, `${stamp}-${name}`));
    });
    await query("UPDATE iec SET is_deleted = 1 WHERE name IN (?)", [names]);
    res.send({ deleted: Array.isArray(data.names) ? names : names[0] });
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});

// Também exposto em <prefixo>/iecs/<ficheiro> (ver index.js): é para onde o .htaccess redireciona o URL do QRCode
router.serveFiles = serveFiles;

module.exports = router;
