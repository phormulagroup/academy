var express = require("express");
const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");
var fileUpload = require("express-fileupload");
const middleware = require("../utils/middleware");

var router = express.Router();
var db = require("../utils/database");
const util = require("util");
const query = util.promisify(db.query).bind(db);

// Os ficheiros vivem nesta pasta: já contém os IECs em uso (em produção, /regional/wp-content/uploads/iec no cPanel).
// O QRCode impresso aponta para IEC_PUBLIC_URL/<nome do ficheiro>, por isso o nome e o caminho nunca podem mudar.
const IEC_DIR = process.env.IEC_DIR || path.join(__dirname, "..", "media", "iec");
const DELETED_DIR = path.join(IEC_DIR, "_deleted");
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
).catch((e) => console.log("Failed to ensure iec table", e));

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

router.use((req, res, next) => {
  console.log("----------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("----------------------------");
  next();
});

/* Público: serve os ficheiros quando não há IEC_PUBLIC_URL, ou como destino do redirect do .htaccess */
const serveFiles = express.static(IEC_DIR, { dotfiles: "deny", index: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-cache") });
router.use("/files", serveFiles);

const diskNames = () => fs.readdirSync(IEC_DIR, { withFileTypes: true }).filter((f) => f.isFile() && isValidName(f.name)).map((f) => f.name);

// Regista na BD os PDFs que já estão na pasta (os IECs em uso) e os que lá forem postos por outra via
async function syncFolder() {
  const names = diskNames();
  if (names.length) await query("INSERT INTO iec (name) VALUES ? ON DUPLICATE KEY UPDATE is_deleted = 0", [names.map((n) => [n])]);
}

router.get("/read", middleware, async (req, res) => {
  try {
    await syncFolder();
    const rows = await query("SELECT id, name, created_at, updated_at FROM iec WHERE is_deleted = 0");
    const items = rows.map((r) => {
      const file = path.join(IEC_DIR, r.name);
      const stat = fs.existsSync(file) ? fs.statSync(file) : null;
      return { ...r, size: stat ? stat.size : null, updated_at: stat ? stat.mtime : r.updated_at, missing: !stat, url: publicUrl(req, r.name) };
    });
    res.send(items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (e) {
    console.log(e);
    res.status(500).send("Error");
  }
});

/* Diz quais dos nomes enviados já existem, para o backoffice pedir confirmação antes de substituir */
router.post("/check", middleware, async (req, res) => {
  try {
    const names = (Array.isArray(req.body.names) ? req.body.names : []).filter(isValidName);
    const rows = names.length ? await query("SELECT name FROM iec WHERE is_deleted = 0 AND name IN (?)", [names]) : [];
    const existing = new Set(rows.map((r) => r.name));
    names.forEach((n) => fs.existsSync(path.join(IEC_DIR, n)) && existing.add(n));
    res.send({ existing: [...existing] });
  } catch (e) {
    console.log(e);
    res.status(500).send("Error");
  }
});

router.post("/upload", middleware, fileUpload({ defParamCharset: "utf8" }), async (req, res) => {
  try {
    const file = req.files && req.files.file;
    if (!file) return res.status(400).send({ message: "No file" });

    const name = path.basename(file.name);
    if (!isValidName(name) || !TYPES[extOf(name)](file.data)) {
      return res.status(400).send({ message: "Only PDF, MP4, PNG and JPG files are allowed" });
    }

    const target = path.join(IEC_DIR, name);
    const rows = await query("SELECT id FROM iec WHERE name = ? AND is_deleted = 0", [name]);
    const exists = fs.existsSync(target) || rows.length > 0;
    // Só substitui se o utilizador confirmou
    if (exists && req.body.replace !== "1") return res.status(409).send({ message: "File already exists", name });

    // Escrita atómica: quem lê o QRCode nunca apanha um ficheiro a meio da substituição
    const tmp = path.join(IEC_DIR, `.${name}.tmp`);
    await file.mv(tmp);
    fs.renameSync(tmp, target);
    await query("INSERT INTO iec (name) VALUES (?) ON DUPLICATE KEY UPDATE is_deleted = 0, updated_at = NOW()", [name]);

    res.send({ id: name, name, url: publicUrl(req, name), replaced: exists });
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "Upload failed" });
  }
});

/* Nunca apaga: move para _deleted, recuperável à mão (um QRCode impresso deixa de funcionar enquanto lá estiver) */
router.post("/delete", middleware, async (req, res) => {
  try {
    const name = req.body.data && req.body.data.name;
    if (!isValidName(name)) return res.status(404).send({ message: "Not found" });
    const file = path.join(IEC_DIR, name);
    if (fs.existsSync(file)) fs.renameSync(file, path.join(DELETED_DIR, `${dayjs().format("YYYYMMDD-HHmmss")}-${name}`));
    await query("UPDATE iec SET is_deleted = 1 WHERE name = ?", [name]);
    res.send({ deleted: name });
  } catch (e) {
    console.log(e);
    res.status(500).send("Error");
  }
});

// Também exposto em <prefixo>/iecs/<ficheiro> (ver index.js): é para onde o .htaccess redireciona o URL do QRCode
router.serveFiles = serveFiles;

module.exports = router;
