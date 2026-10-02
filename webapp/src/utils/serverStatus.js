import axios from "axios";
import config from "./config";

// Estado do servidor, partilhado entre o interceptor do axios e o ecrã de fallback.
// `hadSuccess` diz se a app já chegou a falar com a API: se nunca falou (arranque sem servidor) é preciso recarregar quando voltar.
let state = { down: false, hadSuccess: false };
const listeners = new Set();
let checking = false;

const emit = () => listeners.forEach((l) => l(state));

export const getServerState = () => state;

export function subscribeServerState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Pedido simples fora do axios (para não passar pelos interceptores). null = sem resposta (rede, timeout).
async function get(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(`${config.server_ip}${path}`, { cache: "no-store", signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// /health responde 200 quando o servidor e a base de dados estão de pé. Uma API mais antiga sem /health devolve 404:
// nesse caso (e só nesse) vale a raiz "/". Com a app Node parada o Apache responde 404 a ambos, logo continua "em baixo".
async function ping() {
  const health = await get("/health");
  if (!health) return false;
  if (health.ok) return true;
  if (health.status === 404) {
    const root = await get("/");
    return !!root && root.ok;
  }
  return false;
}

// Confirma se o servidor responde e atualiza o estado. Devolve true se está de pé.
export async function checkServer() {
  if (checking) return !state.down;
  checking = true;
  const ok = await ping();
  checking = false;
  if (state.down === ok) {
    state = { ...state, down: !ok };
    emit();
  }
  return ok;
}

const isApiRequest = (cfg) => {
  const url = cfg?.url || "";
  return !/^https?:\/\//.test(url) || url.startsWith(config.server_ip);
};

// Falha de rede, 5xx ou 404: não assumimos que o servidor caiu (pode ser só aquele pedido), confirmamos com um ping.
// O 404 conta porque, com a app Node parada no cPanel, o Apache deixa de ter nada em /api e responde 404 em vez de 5xx.
axios.interceptors.response.use(
  (res) => {
    if (isApiRequest(res.config) && !state.hadSuccess) state = { ...state, hadSuccess: true };
    return res;
  },
  (err) => {
    if (!axios.isCancel(err) && isApiRequest(err.config) && (!err.response || err.response.status >= 500 || err.response.status === 404)) checkServer();
    return Promise.reject(err);
  },
);

window.addEventListener("offline", () => checkServer());
window.addEventListener("online", () => checkServer());

// Verifica logo ao abrir a app, sem esperar que um pedido falhe: se a API estiver em baixo o utilizador vê o aviso em vez de uma página em branco
checkServer();
