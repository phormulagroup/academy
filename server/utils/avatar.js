var db = require("./database");
var util = require("util");

// Nome + apelido do utilizador, em minúsculas e sem acentos: "Maria Joana Silva" -> "maria_silva"
function nameSlug(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const nameParts = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return (
    nameParts
      .join("_")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "") || "user"
  );
}

module.exports = {
  // Nome do ficheiro do avatar: nome_apelido_avatar_IDIOMA.ext (ex.: pedro_teixeira_avatar_PT.png).
  // Se houver vários utilizadores com o mesmo nome e apelido, numera pela ordem de registo:
  // pedro_teixeira_01_avatar_PT.png, pedro_teixeira_02_avatar_PT.png, ...
  avatarFileName: async function (id_user, ext) {
    const query = util.promisify(db.query).bind(db);
    const users = await query("SELECT user.id, user.name, language.code FROM user LEFT JOIN language ON language.id = user.id_lang ORDER BY user.id");
    const user = users.filter((u) => u.id === id_user)[0];
    const slug = nameSlug(user.name);
    const sameName = users.filter((u) => nameSlug(u.name) === slug);
    const number = sameName.length > 1 ? `_${String(sameName.findIndex((u) => u.id === id_user) + 1).padStart(2, "0")}` : "";
    return `${slug}${number}_avatar_${(user.code || "en").toUpperCase()}.${ext}`;
  },
};
