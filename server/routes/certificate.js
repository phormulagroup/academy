var express = require("express");
var dayjs = require("dayjs");
var util = require("util");
var fs = require("fs");
var path = require("path");
var router = express.Router();

var db = require("../utils/database");
const { requirePermission } = require("../utils/permissions");
const { generateCertificatePdf } = require("../utils/certificatePdf");

const MEDIA_DIR = path.join(__dirname, "..", "media");

router.use((req, res, next) => {
  console.log("---------------------------");
  console.log(req.url, "@", dayjs().format("YYYY-MM-DD HH:mm:ss"));
  console.log("---------------------------");
  next();
});

router.get("/read", async (req, res) => {
  console.log("//// READ CERTIFICATE ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM course_certificate");
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

router.get("/readById", async (req, res) => {
  console.log("//// READ CERTIFICATE BY ID ////");
  const query = util.promisify(db.query).bind(db);
  try {
    const rows = await query("SELECT * FROM course_certificate WHERE id = ?", [req.query.id]);
    res.send(rows);
  } catch (e) {
    throw e;
  }
});

// Lê a imagem de fundo da pasta de multimédia (só o nome do ficheiro, nunca um caminho). null se não existir.
function readBackground(name) {
  if (!name) return null;
  const file = path.join(MEDIA_DIR, path.basename(String(name)));
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

// Gera o PDF do certificado. Devolve null (e já respondeu) se o fundo não existir ou não for uma imagem que o PDF aceite.
function buildCertificate(res, template, variables) {
  if (!template.background) {
    res.status(400).send({ message: "This certificate has no background image yet" });
    return null;
  }
  const backgroundBuffer = readBackground(template.background);
  if (!backgroundBuffer) {
    res.status(404).send({ message: "The background image was not found" });
    return null;
  }
  try {
    return generateCertificatePdf({
      backgroundBuffer,
      text: template.text,
      // Certificados antigos (ou BD ainda sem as colunas) ficam à esquerda e com posição automática
      align: template.text_align,
      x: template.text_x,
      y: template.text_y,
      ...variables,
    });
  } catch (err) {
    console.log(err);
    // O PDF só aceita PNG e JPG como fundo
    res.status(422).send({ message: "The background must be a PNG or JPG image" });
    return null;
  }
}

function sendPdf(res, doc, fileName, disposition) {
  // O nome do ficheiro leva nomes de curso/aluno: acentos num header em bruto são inválidos (setHeader lança erro).
  // filename= leva uma versão só ASCII e filename*= (RFC 5987) o nome real em UTF-8.
  const safe = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  doc.pipe(res);
  doc.end();
}

// Pré-visualização no backoffice: o PDF REAL, gerado pelo mesmo código do download, a partir do que está no formulário
// (ainda sem guardar). `sample` traz o nome/curso de exemplo para testar textos compridos.
router.post("/preview", requirePermission("certificate", "read"), (req, res) => {
  try {
    const { background, text, text_align, text_x, text_y, sample } = req.body.data || {};
    const doc = buildCertificate(res, { background, text, text_align, text_x, text_y }, {
      name: sample?.name || "Maria Silva",
      course: sample?.course || "Example course",
      date: sample?.date || dayjs().format("YYYY-MM-DD HH:mm"),
    });
    if (doc) sendPdf(res, doc, "certificate-preview.pdf", "inline");
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Could not generate the preview" });
  }
});

// Certificado para descarregar: o modelo vem da BD (id) e o nome, curso e data do pedido (como já acontecia quando o
// PDF era gerado no browser).
router.post("/generate", async (req, res) => {
  try {
    const { id, name, course, date, fileName } = req.body.data || {};
    const query = util.promisify(db.query).bind(db);
    const rows = await query("SELECT * FROM course_certificate WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).send({ message: "Certificate template not found" });
    const doc = buildCertificate(res, rows[0], { name, course, date });
    if (doc) sendPdf(res, doc, fileName || "certificate.pdf", "attachment");
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Could not generate the certificate" });
  }
});

router.post("/create", requirePermission("certificate", "create"), async (req, res, next) => {
  console.log("//// CREATE CERTIFICATE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const data = req.body.data;
    console.log(data);
    const insertedRow = await query("INSERT INTO course_certificate SET ?", data);
    res.send(insertedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/update", requirePermission("certificate", "update"), async (req, res, next) => {
  console.log("//// UPDATE CERTIFICATE ////");
  try {
    let data = req.body.data;
    let whereId = data.id;
    delete data.id;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const query = util.promisify(db.query).bind(db);
    const updatedRow = await query("UPDATE course_certificate SET " + columns.join(" = ?, ") + " = ? WHERE id = " + whereId, values);

    res.send(updatedRow);
  } catch (err) {
    throw err;
  }
});

router.post("/delete", requirePermission("certificate", "delete"), async (req, res, next) => {
  console.log("//// DELETE CERTIFICATE ////");
  try {
    const query = util.promisify(db.query).bind(db);
    const deletedRow = await query("UPDATE course_certificate SET is_deleted = 1 WHERE id = " + req.body.data.id);
    res.send(deletedRow);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
