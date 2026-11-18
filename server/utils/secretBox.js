const crypto = require("crypto");

// Cifra (AES-256-GCM) dos segredos guardados em `settings` (password SMTP, chave da Brevo). A chave vem do ambiente (SETTINGS_ENCRYPTION_KEY),
// nunca do código nem da base de dados: uma fuga da BD ou de um backup não revela as credenciais.
// Valor cifrado: "enc:v1:" + base64(iv 12 B | tag 16 B | texto cifrado). Sem esse prefixo o valor é texto simples antigo e lê-se como está
// (scripts/encrypt-settings.js cifra o que já estava guardado).
const PREFIX = "enc:v1:";

function key() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("SETTINGS_ENCRYPTION_KEY is missing or too short: set it in the .env file of this environment");
  return crypto.createHash("sha256").update(secret).digest();
}

const isEncrypted = (value) => typeof value === "string" && value.startsWith(PREFIX);

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

function decrypt(value) {
  if (!isEncrypted(value)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt, isEncrypted };
