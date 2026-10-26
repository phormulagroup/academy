const path = require("path");

// Validação dos ficheiros carregados: nome seguro, extensão permitida para o destino, conteúdo que corresponde à extensão (os primeiros bytes,
// não o tipo que o cliente declara) e tamanho máximo. Nunca SVG nem HTML: serviriam scripts a partir do nosso domínio.

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expose = true; // a mensagem pode seguir para o cliente (não tem detalhes internos)
  }
}

const startsWith = (b, bytes) => b.length >= bytes.length && bytes.every((v, i) => b[i] === v);
const ascii = (b, from, text) => b.length >= from + text.length && b.slice(from, from + text.length).toString("latin1") === text;

// Assinaturas (primeiros bytes) de cada extensão
const SIGNATURES = {
  png: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  jpeg: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  gif: (b) => ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a"),
  webp: (b) => ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP"),
  pdf: (b) => ascii(b, 0, "%PDF-"),
  mp4: (b) => ascii(b, 4, "ftyp"),
  // Office moderno (zip) e antigo (OLE)
  pptx: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  docx: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  xlsx: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  ppt: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  doc: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  xls: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
};

const IMAGES = ["png", "jpg", "jpeg", "gif", "webp"];
const MB = 1024 * 1024;

// O que cada destino aceita e o tamanho máximo
const KINDS = {
  avatar: { extensions: ["png", "jpg", "jpeg", "webp"], maxBytes: 5 * MB },
  email: { extensions: IMAGES, maxBytes: 10 * MB },
  multimedia: { extensions: [...IMAGES, "pdf", "mp4", "pptx", "ppt", "docx", "doc", "xlsx", "xls"], maxBytes: 100 * MB },
  ticket: { extensions: ["png", "jpg", "jpeg", "gif", "webp", "pdf"], maxBytes: 2 * MB },
};

const extOf = (name) => path.extname(String(name || "")).slice(1).toLowerCase();

// Nome seguro: só o nome do ficheiro (sem pastas nem ../), sem caracteres de controlo nem símbolos estranhos, sem ponto no início, extensão em minúsculas
function safeFileName(name) {
  const base = path.basename(String(name || "").replace(/\\/g, "/")).normalize("NFC");
  const ext = extOf(base);
  const stem = base.slice(0, base.length - (ext ? ext.length + 1 : 0));
  const clean = stem.replace(/[^\p{L}\p{N}._ -]+/gu, "_").replace(/^[. _-]+/, "").replace(/[. ]+$/, "").slice(0, 120);
  return `${clean || "file"}${ext ? `.${ext.replace(/[^a-z0-9]/g, "")}` : ""}`;
}

/**
 * Valida um ficheiro carregado (express-fileupload) para um destino. Devolve o nome seguro e a extensão; lança UploadError (400/413).
 * @param {object} file - { name, size, data, truncated }
 * @param {"avatar"|"email"|"multimedia"|"ticket"} kind
 */
function validateUpload(file, kind = "multimedia") {
  const rules = KINDS[kind] || KINDS.multimedia;
  if (!file || !file.name) throw new UploadError("No file received");
  const name = safeFileName(file.name);
  const ext = extOf(name);
  if (!rules.extensions.includes(ext)) throw new UploadError(`File type not allowed. Accepted: ${rules.extensions.join(", ")}.`);
  if (file.truncated || (file.size ?? file.data?.length ?? 0) > rules.maxBytes) throw new UploadError(`File too large. The maximum size is ${Math.round(rules.maxBytes / MB)} MB.`, 413);
  const data = file.data;
  if (!Buffer.isBuffer(data) || data.length === 0 || !SIGNATURES[ext](data)) throw new UploadError("The file content does not match its type.");
  return { name, ext };
}

module.exports = { UploadError, SIGNATURES, KINDS, safeFileName, validateUpload, extOf };
