import DOMPurify from "dompurify";

// Links que abrem noutro separador não podem dar acesso à página de origem (window.opener)
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target")) node.setAttribute("rel", "noopener noreferrer");
});

// Usar em qualquer conteúdo HTML (editor de texto, mensagens, notificações, FAQs...) que vá para dangerouslySetInnerHTML: sem isto, um texto com
// HTML malicioso (ex.: <img onerror="...">) executava no browser de quem o lesse, incluindo a equipa que revê os tickets.
// Mantém o formato do editor (negrito, listas, tabelas, imagens, links com target); remove scripts, eventos (onerror...), iframes e formulários.
export function sanitizeHtml(html) {
  if (!html) return html;
  return DOMPurify.sanitize(String(html), { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form", "iframe", "object", "embed"] });
}
