var db = require("./database");
var util = require("util");
var path = require("path");
var fs = require("fs");

// Relativo a este ficheiro (e não ao diretório de onde o processo foi arrancado)
const { MEDIA_DIR } = require("./paths");
const { validateUpload, safeFileName, UploadError } = require("./fileTypes");

// Escapa % e _ para usar o texto num LIKE
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

const mv = (file, target) =>
  new Promise((resolve, reject) =>
    file.mv(target, (err) => {
      if (err) return reject(err);
      resolve();
    }),
  );

module.exports = {
  UploadError,
  /**
   * Guarda um ficheiro carregado na pasta media e regista-o na tabela media. Valida antes o nome, a extensão (conforme o destino), o conteúdo e o tamanho
   * (utils/fileTypes.js) e lança UploadError (400/413) se for recusado.
   * @param {object} file - Ficheiro do express-fileupload.
   * @param {"avatar"|"email"|"multimedia"} [type="multimedia"] - Destino (define o que se aceita).
   * @param {string} [fileName] - Guarda com esse nome exato, substituindo o ficheiro existente (ex.: avatar nome_apelido.png).
   * @returns {Promise<string|null>} Nome com que ficou guardado.
   */
  uploadFile: async function (file, type, fileName) {
    if (!file) return null;
    const kind = type || "multimedia";
    const { name: safeName } = validateUpload(file, kind);
    const query = util.promisify(db.query).bind(db);

    if (fileName) {
      // Nome definido por nós (avatar): só o nome, nunca um caminho
      const exactName = path.basename(fileName);
      const existing = await query("SELECT id FROM media WHERE name = ?", [exactName]);
      if (existing.length === 0) await query("INSERT INTO media (name, type) VALUES (?, ?)", [exactName, kind]);
      else await query("UPDATE media SET updated_at = NOW() WHERE id = ?", [existing[0].id]);
      await mv(file, path.join(MEDIA_DIR, exactName));
      return exactName;
    }

    // Espaços passam a "_"; se já houver ficheiros com este nome, junta um número
    const parsed = path.parse(safeName.replace(/ /g, "_"));
    const similar = await query("SELECT name FROM media WHERE name LIKE ? ESCAPE '\\\\'", [`%${escapeLike(parsed.name)}%`]);
    let fileNameFinal = similar.length === 0 ? `${parsed.name}${parsed.ext}` : `${parsed.name}-${similar.length}${parsed.ext}`;
    // Nunca substitui um ficheiro que já existe com esse nome
    for (let n = similar.length + 1; fs.existsSync(path.join(MEDIA_DIR, fileNameFinal)); n++) fileNameFinal = `${parsed.name}-${n}${parsed.ext}`;

    await query("INSERT INTO media (name, type) VALUES (?, ?)", [fileNameFinal, kind]);
    await mv(file, path.join(MEDIA_DIR, fileNameFinal));
    return fileNameFinal;
  },
  safeFileName,
};
