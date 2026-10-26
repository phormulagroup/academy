// A sessão em si (o token) vive num cookie HttpOnly que o JavaScript nunca vê. Aqui guarda-se só um aviso sem segredos: quando a sessão
// termina (exp, em segundos) e a inatividade permitida (idle, em minutos), para a página saber se há sessão e quando sair.
const KEY = "session";
const LEGACY_TOKEN_KEY = "token"; // antes dos cookies o token ficava aqui; lê-se uma vez para trocar a sessão e apaga-se

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function saveSession(session) {
  if (!session?.expires_at) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ exp: session.expires_at, idle: session.idle_minutes || 30 }));
  } catch {
    // sem armazenamento: a página não sabe quando a sessão termina, a API continua a recusá-la quando expirar
  }
}

export function getStoredSession() {
  try {
    const value = JSON.parse(read(KEY));
    return value && Number.isFinite(value.exp) ? { exp: value.exp, idle: Number(value.idle) || 30 } : null;
  } catch {
    return null;
  }
}

export const hasStoredSession = () => getStoredSession() !== null;

export function clearStoredSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}

// A sessão (guardada) já terminou?
export function sessionEnded(session = getStoredSession(), now = Date.now()) {
  return !!session && session.exp * 1000 <= now;
}

export const getLegacyToken = () => read(LEGACY_TOKEN_KEY);

export function clearLegacyToken() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // nada a limpar
  }
}
