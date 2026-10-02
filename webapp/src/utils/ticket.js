// Constantes dos tickets. Os valores são os da BD (em português); o texto mostrado é a chave de tradução (t(label)).
export const PRIORITY_LABELS = { baixa: "Low", normal: "Normal", alta: "High", urgente: "Urgent" };
export const PRIORITY_COLORS = { baixa: "default", normal: "blue", alta: "orange", urgente: "red" };
// A mesma paleta em hex, para o fundo e a borda tingidos dos cartões de resumo
export const PRIORITY_TAG_COLORS = { baixa: "#8c8c8c", normal: "#1677ff", alta: "#fa8c16", urgente: "#f5222d" };

export const STATUS_LABELS = { aberto: "Open", fechado: "Closed" };
export const STATUS_COLORS = { aberto: "green", fechado: "default" };

// Tamanho máximo de cada anexo (igual ao do servidor, para dar feedback antes de enviar)
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf";

// Anexos de uma mensagem: array JSON de nomes de ficheiro (ou nada)
export function parseAttachments(raw) {
  if (!raw) return [];
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

// O editor de texto devolve "" ou "<p><br></p>" quando está vazio
export const isEmptyHtml = (html) => !html || html.replace(/<[^>]*>/g, "").trim() === "";
