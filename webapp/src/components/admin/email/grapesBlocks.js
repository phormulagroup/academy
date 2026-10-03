import { BODY_FONT, EMAIL_FONTS, HEADING_FONT } from "../../../utils/emailFonts";

// Blocos do editor de e-mails (MJML), à maneira do Brevo: layout, conteúdo e blocos prontos da marca.
const BRAND = "#163986";
const ACCENT = "#00B9D6";
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="100%" height="100%" fill="#E9EDF5"/><text x="50%" y="50%" fill="#8A8D98" font-family="Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">600 x 300</text></svg>');

// Pequenos ícones dos blocos (SVG a traço, 24x24)
const icon = (path) => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const ICONS = {
  col1: icon('<rect x="4" y="5" width="16" height="14" rx="2"/>'),
  col2: icon('<rect x="3" y="5" width="8" height="14" rx="2"/><rect x="13" y="5" width="8" height="14" rx="2"/>'),
  col3: icon('<rect x="2.5" y="5" width="5.5" height="14" rx="1.5"/><rect x="9.25" y="5" width="5.5" height="14" rx="1.5"/><rect x="16" y="5" width="5.5" height="14" rx="1.5"/>'),
  text: icon('<path d="M5 7h14M5 12h14M5 17h9"/>'),
  title: icon('<path d="M6 6v12M18 6v12M6 12h12"/>'),
  image: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>'),
  button: icon('<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M9 12h6"/>'),
  divider: icon('<path d="M4 12h16"/>'),
  spacer: icon('<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>'),
  social: icon('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>'),
  imageText: icon('<rect x="3" y="5" width="8" height="14" rx="2"/><path d="M14 8h7M14 12h7M14 16h5"/>'),
  hero: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 11h8M10 15h4"/>'),
  footer: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16h10M9 13h6"/>'),
  header: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h4"/>'),
  html: icon('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>'),
  split: icon('<rect x="3" y="5" width="6" height="14" rx="2"/><rect x="11" y="5" width="10" height="14" rx="2"/>'),
  group: icon('<rect x="3" y="7" width="8" height="10" rx="2"/><rect x="13" y="7" width="8" height="10" rx="2"/><path d="M12 3v2M12 19v2"/>'),
  list: icon('<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.5" cy="7" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17" r="1"/>'),
  table: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 5v14"/>'),
  menu: icon('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  gallery: icon('<rect x="3" y="6" width="8" height="12" rx="2"/><rect x="13" y="6" width="8" height="12" rx="2"/>'),
  quote: icon('<path d="M7 17c-2 0-3-1.5-3-3.5S5 9 8 8M17 17c-2 0-3-1.5-3-3.5S15 9 18 8"/>'),
  cta: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8"/><rect x="8" y="13" width="8" height="3" rx="1.5"/>'),
  signature: icon('<path d="M4 17c3-6 5-6 6-2s3 1 4-1 3 1 6-1M4 21h16"/>'),
  greeting: icon('<path d="M4 6h16v10H8l-4 4z"/>'),
};

const blocks = (t) => [
  // Layout
  { id: "col-1", category: "Layout", label: t("1 column"), media: ICONS.col1, content: `<mj-section><mj-column><mj-text>${t("Write your text here")}</mj-text></mj-column></mj-section>` },
  { id: "col-2", category: "Layout", label: t("2 columns"), media: ICONS.col2, content: `<mj-section><mj-column><mj-text>${t("Column")} 1</mj-text></mj-column><mj-column><mj-text>${t("Column")} 2</mj-text></mj-column></mj-section>` },
  { id: "col-3", category: "Layout", label: t("3 columns"), media: ICONS.col3, content: `<mj-section><mj-column><mj-text>${t("Column")} 1</mj-text></mj-column><mj-column><mj-text>${t("Column")} 2</mj-text></mj-column><mj-column><mj-text>${t("Column")} 3</mj-text></mj-column></mj-section>` },
  { id: "col-30-70", category: "Layout", label: t("Narrow + wide"), media: ICONS.split, content: `<mj-section><mj-column width="30%"><mj-text>${t("Column")} 1</mj-text></mj-column><mj-column width="70%"><mj-text>${t("Column")} 2</mj-text></mj-column></mj-section>` },
  // As colunas de um grupo ficam lado a lado também no telemóvel (as outras empilham-se)
  { id: "group", category: "Layout", label: t("Side by side on mobile"), media: ICONS.group, content: `<mj-section><mj-group><mj-column><mj-text align="center">${t("Column")} 1</mj-text></mj-column><mj-column><mj-text align="center">${t("Column")} 2</mj-text></mj-column></mj-group></mj-section>` },
  // Conteúdo
  { id: "title", category: "Content", label: t("Title"), media: ICONS.title, content: `<mj-text font-family="${HEADING_FONT}" font-size="26px" font-weight="700" color="${BRAND}" line-height="1.3">${t("Your title")}</mj-text>` },
  { id: "text", category: "Content", label: t("Text"), media: ICONS.text, content: `<mj-text>${t("Write your text here")}</mj-text>` },
  { id: "list", category: "Content", label: t("List"), media: ICONS.list, content: `<mj-text><ul style="margin:0;padding-left:20px;"><li>${t("First item")}</li><li>${t("Second item")}</li><li>${t("Third item")}</li></ul></mj-text>` },
  { id: "image", category: "Content", label: t("Image"), media: ICONS.image, content: `<mj-image src="${PLACEHOLDER}" alt="" padding="10px 25px"></mj-image>` },
  { id: "button", category: "Content", label: t("Button"), media: ICONS.button, content: `<mj-button background-color="${BRAND}" color="#ffffff" border-radius="6px" font-weight="600" href="https://">${t("Click here")}</mj-button>` },
  { id: "divider", category: "Content", label: t("Divider"), media: ICONS.divider, content: `<mj-divider border-width="1px" border-color="#E5E7EB"></mj-divider>` },
  { id: "spacer", category: "Content", label: t("Spacer"), media: ICONS.spacer, content: `<mj-spacer height="30px"></mj-spacer>` },
  {
    id: "table",
    category: "Content",
    label: t("Table"),
    media: ICONS.table,
    content: `<mj-section><mj-column><mj-table><tr style="border-bottom:1px solid #E5E7EB;text-align:left;"><th style="padding:8px 0;">${t("Item")}</th><th style="padding:8px 0;">${t("Value")}</th></tr><tr><td style="padding:8px 0;">${t("Item")} 1</td><td style="padding:8px 0;">0</td></tr><tr><td style="padding:8px 0;">${t("Item")} 2</td><td style="padding:8px 0;">0</td></tr></mj-table></mj-column></mj-section>`,
  },
  {
    id: "menu",
    category: "Content",
    label: t("Menu"),
    media: ICONS.menu,
    content: `<mj-section><mj-column><mj-navbar><mj-navbar-link href="https://" color="${BRAND}" font-weight="600">${t("Link")} 1</mj-navbar-link><mj-navbar-link href="https://" color="${BRAND}" font-weight="600">${t("Link")} 2</mj-navbar-link><mj-navbar-link href="https://" color="${BRAND}" font-weight="600">${t("Link")} 3</mj-navbar-link></mj-navbar></mj-column></mj-section>`,
  },
  {
    id: "html",
    category: "Content",
    label: t("HTML"),
    media: ICONS.html,
    // mj-text aceita HTML livre (tabelas, listas, estilos em linha) dentro de uma célula válida; a classe marca-o como bloco de HTML
    content: `<mj-section><mj-column><mj-text css-class="html-block"><div>${t("Your HTML here")}</div></mj-text></mj-column></mj-section>`,
  },
  {
    id: "social",
    category: "Content",
    label: t("Social"),
    media: ICONS.social,
    content: `<mj-social font-size="12px" icon-size="28px" mode="horizontal"><mj-social-element name="facebook" href="https://facebook.com"></mj-social-element><mj-social-element name="linkedin" href="https://linkedin.com"></mj-social-element><mj-social-element name="instagram" href="https://instagram.com"></mj-social-element></mj-social>`,
  },
  // Blocos prontos
  {
    id: "header",
    category: "Ready-made",
    label: t("Header"),
    media: ICONS.header,
    content: `<mj-section background-color="${BRAND}" padding="18px 24px"><mj-column><mj-image src="${PLACEHOLDER}" alt="" width="160px" align="left" padding="0"></mj-image></mj-column></mj-section>`,
  },
  {
    id: "hero",
    category: "Ready-made",
    label: t("Banner"),
    media: ICONS.hero,
    content: `<mj-section background-color="${BRAND}" padding="40px 24px"><mj-column><mj-text font-family="${HEADING_FONT}" align="center" color="#ffffff" font-size="28px" font-weight="700" line-height="1.3">${t("Your title")}</mj-text><mj-text align="center" color="#ffffff" font-size="15px">${t("Write your text here")}</mj-text><mj-button background-color="${ACCENT}" color="#ffffff" border-radius="6px" font-weight="600" href="https://">${t("Click here")}</mj-button></mj-column></mj-section>`,
  },
  {
    id: "hero-image",
    category: "Ready-made",
    label: t("Banner with image"),
    media: ICONS.hero,
    // Imagem de fundo (escolhe-se nos estilos da secção); a cor de fundo aparece onde a imagem não carrega
    content: `<mj-section background-color="${BRAND}" background-url="${PLACEHOLDER}" background-size="cover" background-repeat="no-repeat" padding="70px 24px"><mj-column><mj-text font-family="${HEADING_FONT}" align="center" color="#ffffff" font-size="30px" font-weight="700" line-height="1.3">${t("Your title")}</mj-text><mj-button background-color="${ACCENT}" color="#ffffff" border-radius="6px" font-weight="600" href="https://">${t("Click here")}</mj-button></mj-column></mj-section>`,
  },
  {
    id: "cta",
    category: "Ready-made",
    label: t("Call to action"),
    media: ICONS.cta,
    content: `<mj-section background-color="#F6F7FB" padding="28px 24px"><mj-column><mj-text font-family="${HEADING_FONT}" align="center" font-size="22px" font-weight="700" color="${BRAND}">${t("Your title")}</mj-text><mj-text align="center">${t("Write your text here")}</mj-text><mj-button background-color="${BRAND}" color="#ffffff" border-radius="6px" font-weight="600" href="https://">${t("Click here")}</mj-button></mj-column></mj-section>`,
  },
  {
    id: "gallery",
    category: "Ready-made",
    label: t("Two images"),
    media: ICONS.gallery,
    content: `<mj-section><mj-column><mj-image src="${PLACEHOLDER}" alt=""></mj-image></mj-column><mj-column><mj-image src="${PLACEHOLDER}" alt=""></mj-image></mj-column></mj-section>`,
  },
  {
    id: "quote",
    category: "Ready-made",
    label: t("Quote"),
    media: ICONS.quote,
    content: `<mj-section padding="10px 24px"><mj-column border-left="4px solid ${ACCENT}" padding-left="16px"><mj-text font-size="18px" font-style="italic" color="${BRAND}">${t("Write the quote here")}</mj-text><mj-text font-size="13px" color="#8A8D98">— ${t("Name")}</mj-text></mj-column></mj-section>`,
  },
  {
    id: "image-text",
    category: "Ready-made",
    label: t("Image and text"),
    media: ICONS.imageText,
    content: `<mj-section><mj-column width="40%"><mj-image src="${PLACEHOLDER}" alt=""></mj-image></mj-column><mj-column width="60%" vertical-align="middle"><mj-text font-family="${HEADING_FONT}" font-size="18px" font-weight="700" color="${BRAND}">${t("Your title")}</mj-text><mj-text>${t("Write your text here")}</mj-text></mj-column></mj-section>`,
  },
  {
    id: "greeting",
    category: "Ready-made",
    label: t("Greeting"),
    media: ICONS.greeting,
    content: `<mj-text font-size="16px">${t("Hello")} {{name}},</mj-text>`,
  },
  {
    id: "signature",
    category: "Ready-made",
    label: t("Signature"),
    media: ICONS.signature,
    content: `<mj-text>${t("Best regards")},<br/><b>${t("The Bial Regional Academy team")}</b></mj-text>`,
  },
  {
    id: "footer",
    category: "Ready-made",
    label: t("Footer"),
    media: ICONS.footer,
    content: `<mj-section background-color="#F4F5F7" padding="20px 24px"><mj-column><mj-text align="center" font-size="12px" color="#8A8D98" line-height="1.6">Bial Regional Academy<br/>${t("This e-mail was sent automatically, please do not reply")}</mj-text></mj-column></mj-section>`,
  },
];

// Substitui os blocos que o plugin traz por estes, com categorias e ícones próprios
export function emailBlocks(editor, t) {
  editor.Blocks.getAll().reset();
  const categories = { Layout: t("Layout"), Content: t("Content"), "Ready-made": t("Ready-made") };
  blocks(t).forEach(({ category, ...block }) => editor.Blocks.add(block.id, { ...block, category: { id: category, label: categories[category], open: category !== "Ready-made" }, select: true }));
}

// Ponto de partida de um template novo: cabeçalho, título, texto, botão e rodapé
export function starterMjml(t) {
  return `<mjml>
  <mj-head>
    ${EMAIL_FONTS.map((f) => `<mj-font name="${f.name}" href="${f.href}"></mj-font>`).join("\n    ")}
    <mj-attributes>
      <mj-all font-family="${BODY_FONT}"></mj-all>
      <mj-text font-size="15px" color="#333333" line-height="1.6"></mj-text>
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#F4F5F7" width="600px">
    <mj-section background-color="${BRAND}" padding="18px 24px"><mj-column><mj-image src="${PLACEHOLDER}" alt="" width="160px" align="left" padding="0"></mj-image></mj-column></mj-section>
    <mj-section background-color="#ffffff" padding="24px"><mj-column>
      <mj-text font-family="${HEADING_FONT}" font-size="24px" font-weight="700" color="${BRAND}">${t("Hello")} {{name}},</mj-text>
      <mj-text>${t("Write your text here")}</mj-text>
      <mj-button background-color="${BRAND}" color="#ffffff" border-radius="6px" font-weight="600" href="https://">${t("Click here")}</mj-button>
    </mj-column></mj-section>
    <mj-section background-color="#F4F5F7" padding="20px 24px"><mj-column><mj-text align="center" font-size="12px" color="#8A8D98" line-height="1.6">Bial Regional Academy<br/>${t("This e-mail was sent automatically, please do not reply")}</mj-text></mj-column></mj-section>
  </mj-body>
</mjml>`;
}

// Garante que o e-mail declara as fontes da marca (mj-font): sem isso um e-mail antigo, ou um que perdeu o cabeçalho, não as carrega
export function ensureBrandFonts(editor) {
  const head = editor.getWrapper().findType("mj-head")[0];
  if (!head) return;
  const declared = head.findType("mj-font").map((f) => f.getAttributes().name);
  EMAIL_FONTS.filter((f) => !declared.includes(f.name)).forEach((f) => head.append(`<mj-font name="${f.name}" href="${f.href}"></mj-font>`));
}
