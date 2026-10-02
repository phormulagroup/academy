import DOMPurify from "dompurify";

// Usar em qualquer conteúdo HTML (editor de texto, mensagens) que vá para dangerouslySetInnerHTML: sem isto, uma mensagem com
// HTML malicioso (ex.: <img onerror="...">) executava no browser de quem a lesse, incluindo a equipa que revê os tickets.
export function sanitizeHtml(html) {
  if (!html) return html;
  return DOMPurify.sanitize(html);
}
