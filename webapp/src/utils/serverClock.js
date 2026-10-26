import axios from "axios";

// Relógio do servidor: os testes abrem e fecham a uma hora exata, por isso o countdown e o estado do teste usam a hora do servidor e não a do
// computador da pessoa (que pode estar adiantado ou atrasado). O desvio sai do cabeçalho Date de cada resposta da API.
let offset = 0; // servidor − computador (ms)

export const serverNow = () => Date.now() + offset;

export function syncServerClock(dateHeader, requestedAt, receivedAt = Date.now()) {
  const server = Date.parse(dateHeader);
  if (Number.isNaN(server)) return;
  // O cabeçalho tem precisão de 1 s e a resposta demorou: o instante do servidor é o do meio do pedido (± 1 s)
  offset = server + 500 - (requestedAt + receivedAt) / 2;
}

// Respostas vindas de uma cache (cabeçalho Age) levam a data de quando foram guardadas, por isso não servem para acertar o relógio
export function setupServerClock() {
  axios.interceptors.request.use((config) => {
    config.metadata = { requestedAt: Date.now() };
    return config;
  });
  axios.interceptors.response.use((res) => {
    const date = res.headers?.date;
    if (date && !res.headers?.age && res.config?.metadata && res.status !== 304) syncServerClock(date, res.config.metadata.requestedAt);
    return res;
  });
}

export const getServerOffset = () => offset;
