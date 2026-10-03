// O HTML dos e-mails guarda-se como string JSON (templates) ou como JSON de string (comunicações): devolve o HTML simples
export function parseEmailHtml(raw) {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : "";
  } catch {
    return String(raw);
  }
}

export function parseJson(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Preenche as variáveis ({{name}}...) com dados de exemplo, só para a pré-visualização
export function fillSample(html, sample = {}) {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => sample[key] ?? match);
}
