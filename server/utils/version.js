const fs = require("fs");
const path = require("path");

// Versão desta instalação: o script de deploy (scripts/build-release.sh) escreve version.json na raiz da API e na raiz da webapp com o mesmo
// valor, por isso dá para confirmar se a webapp e a API enviadas são do mesmo pacote (GET /health). Em desenvolvimento não existe.
let cached;
function readVersion() {
  if (cached !== undefined) return cached;
  try {
    cached = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "version.json"), "utf8"));
  } catch {
    cached = null;
  }
  return cached;
}

module.exports = { readVersion };
