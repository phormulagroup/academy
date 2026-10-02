import axios from "axios";
import dayjs from "dayjs";

import config from "./config";
import endpoints from "./endpoints";
import upload from "./upload";

// Avatar do utilizador: imagem guardada em /media (type multimedia) com o nome "nome_apelido_avatar_IDIOMA.<ext>",
// definido no servidor (/media/singleUpload); o nome fica na coluna user.img

export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
const AVATAR_TYPES = AVATAR_ACCEPT.split(",");
const AVATAR_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
// 5 MB (abaixo do convertSize do Compressor, para o PNG não passar a JPG)
export const AVATAR_MAX_SIZE = 5 * 1000 * 1000;

// Chaves de tradução das mensagens de validação
const INVALID_TYPE_KEY = "Please select a JPG, PNG or WEBP image.";
const TOO_BIG_KEY = "The image must be smaller than 5 MB.";

/**
 * @function avatarFileError
 * @description Validates an avatar file (type jpg/png/webp and max size).
 * @param {File} file - The selected file.
 * @returns {string|null} Translation key of the error, or null if valid.
 */
export function avatarFileError(file) {
  if (!file || !AVATAR_TYPES.includes(file.type)) return INVALID_TYPE_KEY;
  if (file.size > AVATAR_MAX_SIZE) return TOO_BIG_KEY;
  return null;
}

/**
 * @function avatarSrc
 * @description URL of the user's avatar (with cache-busting query), or undefined if the user has none.
 * @param {object} user - User object (img, modified_at, avatar_version).
 * @returns {string|undefined}
 */
export function avatarSrc(user) {
  if (!user?.img) return undefined;
  const version = user.avatar_version ?? (user.modified_at ? dayjs(user.modified_at).valueOf() : "");
  return `${config.server_ip}/media/${encodeURIComponent(user.img)}${version ? `?v=${version}` : ""}`;
}

/**
 * @function uploadUserAvatar
 * @description Uploads the avatar to the media folder (the server names it "nome_apelido_avatar_IDIOMA.<ext>" and replaces the user's current avatar) and saves the file name in user.img.
 * @param {File} file - Validated image file.
 * @param {object} user - Current user (id, name).
 * @returns {Promise<{user: object}>} Updated user from /user/update, with avatar_version to refresh the image.
 */
export async function uploadUserAvatar(file, user) {
  const compressed = await upload.compress(file).catch(() => file);

  // O servidor define o nome (nome_apelido_avatar_IDIOMA) e substitui o avatar atual do utilizador
  const formData = new FormData();
  formData.append("file", compressed, `avatar.${AVATAR_EXT[file.type] || "png"}`);
  formData.append("data", JSON.stringify({ type: "avatar", id_user: user.id }));
  const uploaded = await axios.post(endpoints.media.singleUpload, formData);

  const res = await axios.post(endpoints.user.update, { data: { id: user.id, img: uploaded.data } });
  if (!res.data?.user) throw new Error("Invalid response");
  return { user: { ...res.data.user, avatar_version: Date.now() } };
}
