const fs = require("fs");
const path = require("path");

// Pasta dos ficheiros carregados (multimédia). Por omissão `server/media`; em produção/cPanel convém pô-la FORA da pasta da app
// (MEDIA_DIR=/home/<utilizador>/academy-media): assim os deploys, que substituem a pasta da app, não apagam nem obrigam a recopiar os ficheiros.
const MEDIA_DIR = process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : path.join(__dirname, "..", "media");

// A pasta tem de existir para os carregamentos (e o servidor de ficheiros) funcionarem, mesmo num servidor novo
try {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
} catch (err) {
  console.error(`[media] não foi possível criar ${MEDIA_DIR}: ${err.message}`);
}

module.exports = { MEDIA_DIR };
