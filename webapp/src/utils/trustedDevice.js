// 2FA: comprovativo de dispositivo de confiança (a API entrega-o depois de confirmar o código e dura 30 dias, sem renovar).
// Com ele, o login no mesmo browser não volta a pedir código até expirar; a password é sempre pedida e validada na API.
// Guardado por conta, com a chave em hash do e-mail (não fica à vista que contas usaram este browser); os expirados são apagados.
// Fica fora do token da sessão: terminar sessão não o apaga.
const KEY = "trusted_devices";



async function emailKey(email) {
  const value = String(email || "").trim().toLowerCase();
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Sem crypto.subtle (página sem HTTPS): sem comprovativo, pede sempre o código
    return null;
  }
}

// Data de expiração do comprovativo (campo exp do JWT), sem o validar: a validação é feita na API
function expiresAt(deviceToken) {
  try {
    const payload = JSON.parse(atob(deviceToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload.exp) * 1000 || 0;
  } catch {
    return 0;
  }
}

function read() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY)) || {};
    // Só os que ainda valem (os expirados e os do formato antigo, com o e-mail à vista, são descartados)
    return Object.fromEntries(Object.entries(all).filter(([k, v]) => /^[0-9a-f]{64}$/.test(k) && expiresAt(v) > Date.now()));
  } catch {
    return {};
  }
}

function write(map) {
  try {
    if (Object.keys(map).length) localStorage.setItem(KEY, JSON.stringify(map));
    else localStorage.removeItem(KEY);
  } catch {
    // Sem armazenamento (ex.: navegação privada): volta a pedir código no próximo login
  }
}

export async function getDeviceToken(email) {
  const key = await emailKey(email);
  const map = read();
  write(map);
  return key ? map[key] : undefined;
}

export async function saveDeviceToken(email, deviceToken) {
  const key = await emailKey(email);
  if (!key || !deviceToken) return;
  write({ ...read(), [key]: deviceToken });
}
