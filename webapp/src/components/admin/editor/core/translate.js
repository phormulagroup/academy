// O Puck 0.21 não tem i18n: os textos que ele próprio desenha (barra do texto
// rico, botões de duplicar/eliminar dos itens de lista, "Item #n"...) vêm em
// inglês. Traduzem-se aqui, no DOM, por correspondência exata — nos atributos
// title/aria-label e no texto de elementos folha — no painel e no canvas
// (iframe). Textos que não estão no dicionário ficam como estão.

const DICT = {
  "Align left": "Alinhar à esquerda",
  "Align center": "Centrar",
  "Align right": "Alinhar à direita",
  Justify: "Justificar",
  Left: "Esquerda",
  Center: "Centro",
  Right: "Direita",
  Bold: "Negrito",
  Italic: "Itálico",
  Underline: "Sublinhado",
  Strikethrough: "Rasurado",
  "Inline code": "Código",
  "Bullet list": "Lista com marcas",
  "Numbered list": "Lista numerada",
  "Ordered list": "Lista numerada",
  "Code block": "Bloco de código",
  Blockquote: "Citação",
  "Horizontal rule": "Linha horizontal",
  "Heading 1": "Título 1",
  "Heading 2": "Título 2",
  "Heading 3": "Título 3",
  "Heading 4": "Título 4",
  "Heading 5": "Título 5",
  "Heading 6": "Título 6",
  Duplicate: "Duplicar",
  Delete: "Eliminar",
  "Read-only": "Só de leitura",
  Collapse: "Recolher",
  Expand: "Expandir",
  loading: "A carregar",
  "Select parent": "Selecionar o bloco pai",
};

const tr = (s) => {
  const t = s.trim();
  if (DICT[t]) return s.replace(t, DICT[t]);
  const m = /^Item #(\d+)$/.exec(t);
  return m ? s.replace(t, `Item ${Number(m[1]) + 1}`) : s;
};

function translateNode(node) {
  if (node.nodeType === 3) {
    const parent = node.parentElement;
    // só texto de rótulos/botões do Puck, nunca o conteúdo escrito pelo utilizador
    if (parent && !parent.isContentEditable && !parent.closest("[contenteditable], .ProseMirror, [data-puck-component], .ed-layers") && parent.closest('[class*="_RichTextMenu"], [class*="_ArrayFieldItem"], [class*="_Select"], [class*="_ActionBar"]')) {
      const next = tr(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    return;
  }
  if (node.nodeType !== 1) return;
  for (const attr of ["title", "aria-label"]) {
    const v = node.getAttribute(attr);
    if (v && !node.closest(".ProseMirror, [data-puck-component] [contenteditable]")) {
      const next = tr(v);
      if (next !== v) node.setAttribute(attr, next);
    }
  }
  node.childNodes.forEach(translateNode);
}

export function installTranslator(doc) {
  if (!doc?.body || doc.__edTranslator) return () => {};
  doc.__edTranslator = true;
  translateNode(doc.body);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") m.addedNodes.forEach(translateNode);
      else if (m.type === "attributes") translateNode(m.target);
      else if (m.type === "characterData") translateNode(m.target);
    }
  });
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title", "aria-label"], characterData: true });
  return () => {
    observer.disconnect();
    doc.__edTranslator = false;
  };
}
