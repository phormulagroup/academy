// Acesso aos ficheiros em /media: as imagens (logótipos, banners, miniaturas, avatares) são públicas porque aparecem em e-mails e em páginas sem sessão;
// todo o resto (PDFs, apresentações, vídeos, ...) exige uma sessão válida, para que quem descobre o endereço de um documento não o descarregue sem ter conta.
const path = require("path");
const { readSession, csrfOk } = require("./session");
const { verifyToken } = require("./token");

// SVG fica de fora de propósito: pode conter scripts
const PUBLIC_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico"]);

const isPublicFile = (urlPath) => {
  let name = String(urlPath || "");
  try {
    name = decodeURIComponent(name);
  } catch {
    return false;
  }
  return PUBLIC_EXTENSIONS.has(path.extname(name).toLowerCase());
};

// Desligável (MEDIA_PRIVATE_FILES=false) para ambientes onde os ficheiros são lidos sem sessão
const mediaAccess = async (req, res, next) => {
  if (process.env.MEDIA_PRIVATE_FILES === "false" || isPublicFile(req.path)) return next();
  try {
    const session = readSession(req);
    if (!session || !csrfOk(req, session.source)) return res.status(401).send("Login required");
    const result = await verifyToken(session.token);
    if (!result.token_valid) return res.status(401).send("Login required");
    res.setHeader("Cache-Control", "private, no-cache");
    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).send("Login required");
  }
};

module.exports = { mediaAccess, isPublicFile };
