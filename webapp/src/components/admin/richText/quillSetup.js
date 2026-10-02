import { Quill } from "react-quill-new";

import config from "../../../utils/config";
import i18n from "../../../utils/i18n";

const BlockEmbed = Quill.import("blots/block/embed");

export const RAW_HTML_CLASS = "ql-raw-html";

/**
 * Bloco de HTML "intocável" (usado para tabelas): o Quill não tem tabelas com cabeçalhos, estilos nem
 * células com vários parágrafos, por isso as tabelas são guardadas tal como estão e editadas em HTML.
 * No HTML gravado só fica o conteúdo (sem o div do bloco).
 */
class RawHtmlBlot extends BlockEmbed {
  static blotName = "rawHtml";
  static tagName = "DIV";
  static className = RAW_HTML_CLASS;

  static create(value) {
    const node = super.create(value);
    node.setAttribute("contenteditable", "false");
    node.setAttribute("title", i18n.t("Double-click to edit the table"));
    node.innerHTML = value;
    return node;
  }

  static value(node) {
    return node.innerHTML;
  }

  html() {
    return this.domNode.innerHTML;
  }
}

Quill.register(RawHtmlBlot, true);

// Formatos permitidos sem richMedia (sem imagens nem tabelas, como no editor anterior)
export const BASIC_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
  "list",
  "indent",
  "blockquote",
  "code-block",
  "color",
  "background",
];

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SERVER_MEDIA = `src="${config.server_ip}/media/`;
const SERVER_MEDIA_REGEX = new RegExp(escapeRegExp(SERVER_MEDIA), "g");

// Cada tabela (ou o div que só a envolve, ex.: overflow-x) passa a ser um bloco rawHtml
function wrapTables(html) {
  if (!/<table/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.closest(`.${RAW_HTML_CLASS}`)) return;
    let unit = table;
    const parent = table.parentElement;
    if (
      parent &&
      parent !== doc.body &&
      parent.tagName === "DIV" &&
      parent.children.length === 1 &&
      parent.textContent.trim() === table.textContent.trim()
    )
      unit = parent;
    const wrapper = doc.createElement("div");
    wrapper.className = RAW_HTML_CLASS;
    unit.replaceWith(wrapper);
    wrapper.appendChild(unit);
  });
  return doc.body.innerHTML;
}

// HTML guardado -> HTML para o editor (imagens "/media/..." resolvidas para o servidor; tabelas protegidas)
export function toEditorHtml(html, richMedia) {
  if (!html) return "";
  if (!richMedia) return html;
  return wrapTables(html.replaceAll('src="/media/', SERVER_MEDIA));
}

// HTML do editor -> HTML a guardar.
// O getSemanticHTML do Quill 2.0.3 troca todos os espaços por &nbsp; (o texto deixa de quebrar linha):
// um &nbsp; isolado volta a ser espaço; sequências mantêm os espaços extra.
export function fromEditorHtml(html, richMedia) {
  if (!html) return "";
  let out = html.replace(/(?:&nbsp;)+/g, (match) => {
    const count = match.length / 6;
    return count === 1 ? " " : ` ${"&nbsp;".repeat(count - 1)}`;
  });
  if (richMedia) out = out.replace(SERVER_MEDIA_REGEX, 'src="/media/');
  return out;
}

// Tabela inicial (mesmo estilo das tabelas importadas): editada depois em HTML com duplo clique
export const defaultTableHtml = (headerText, cellText) => {
  const cell = "border:1px solid #00B9D6;padding:8px 10px;vertical-align:top;text-align:left;";
  const head = `${cell}background-color:#163986;color:#ffffff;font-weight:600;`;
  const row = `<tr><td style="${cell}">${cellText}</td><td style="${cell}">${cellText}</td></tr>`;
  return (
    `<div style="overflow-x:auto;margin:12px 0;"><table style="border-collapse:collapse;width:100%;color:#163986;">` +
    `<thead><tr><th style="${head}">${headerText}</th><th style="${head}">${headerText}</th></tr></thead>` +
    `<tbody>${row}${row}</tbody></table></div>`
  );
};
