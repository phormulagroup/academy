const util = require("util");
const db = require("./database");
const { encrypt, isEncrypted } = require("./secretBox");

// No arranque cifra os segredos do SMTP que ainda estejam em texto simples em settings.meta_data (password, brevo_api_key). Corre sempre e só
// altera o que ainda não está cifrado. Sem SETTINGS_ENCRYPTION_KEY não faz nada (a app continua a ler os valores antigos).
async function encryptStoredSecrets() {
  if (!process.env.SETTINGS_ENCRYPTION_KEY) return 0;
  const query = util.promisify(db.query).bind(db);
  const rows = await query("SELECT id, meta_data FROM settings WHERE name_key = 'smtp'");
  let changed = 0;
  for (const row of rows) {
    const meta = JSON.parse(row.meta_data || "{}");
    let dirty = false;
    for (const field of ["password", "brevo_api_key"]) {
      if (meta[field] && !isEncrypted(meta[field])) {
        meta[field] = encrypt(meta[field]);
        dirty = true;
        changed++;
      }
    }
    if (dirty) await query("UPDATE settings SET meta_data = ? WHERE id = ?", [JSON.stringify(meta), row.id]);
  }
  return changed;
}

module.exports = { encryptStoredSecrets };
