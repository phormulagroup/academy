var db = require("./database");
var util = require("util");
var path = require("path");

// Relativo a este ficheiro (e não ao diretório de onde o processo foi arrancado)
const MEDIA_DIR = path.join(__dirname, "..", "media");

module.exports = {
  // fileName (opcional): guarda com esse nome exato, substituindo o ficheiro existente (ex.: avatar nome_apelido.png)
  uploadFile: function (file, type, fileName) {
    return new Promise(async (resolve, reject) => {
      let sampleFile = null;
      if (file && fileName) {
        try {
          const query = util.promisify(db.query).bind(db);
          const existing = await query("SELECT id FROM media WHERE name = ?", [fileName]);
          if (existing.length === 0) await query("INSERT INTO media (name, type) VALUES (?, ?)", [fileName, type ? type : "multimedia"]);
          else await query("UPDATE media SET updated_at = NOW() WHERE id = ?", [existing[0].id]);
          file.mv(path.join(MEDIA_DIR, fileName), (err) => {
            if (err) return reject(err);
            resolve(fileName);
          });
        } catch (e) {
          reject(e);
        }
      } else if (file) {
        try {
          let file_name = null;
          sampleFile = file;

          let query_get = `SELECT * FROM media WHERE name LIKE '%${sampleFile.name.split(".")[0].replace(" ", "_")}%'`;
          const query = util.promisify(db.query).bind(db);
          const queryResult = await query(query_get);

          if (queryResult.length === 0) {
            file_name = sampleFile.name.replace(" ", "_");
          } else {
            file_name = `${sampleFile.name.split(".")[0].replace(" ", "_")}-${queryResult.length}.${sampleFile.name.split(".")[1]}`;
          }

          await query("INSERT INTO media (name, type) VALUES (?, ?)", [file_name, type ? type : "multimedia"]);

          uploadPath = path.join(MEDIA_DIR, file_name);
          sampleFile.mv(uploadPath, async (err) => {
            if (err) return reject(err);
            resolve(file_name);
          });
        } catch (e) {
          reject(e);
        }
      } else {
        resolve(null);
      }
    });
  },
};
