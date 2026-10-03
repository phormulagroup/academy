import config from "./config";

// Fontes da identidade Bial nos e-mails: Poppins (texto, Google Fonts) e Ryker (títulos, servida pela API em /fonts).
// Só alguns clientes (Apple Mail, iOS Mail, Thunderbird...) carregam fontes externas; no Gmail e no Outlook aparece a
// alternativa da pilha (Arial), por isso cada pilha termina em fontes seguras.
export const EMAIL_FONTS = [
  { name: "Poppins", href: "https://fonts.googleapis.com/css?family=Poppins:300,400,500,600,700", stack: "Poppins, Arial, Helvetica, sans-serif" },
  { name: "Ryker", href: `${config.server_ip}/fonts/fonts.css`, stack: "Ryker, Poppins, Arial, Helvetica, sans-serif" },
];

export const BODY_FONT = EMAIL_FONTS[0].stack;
export const HEADING_FONT = EMAIL_FONTS[1].stack;

// Pilhas que o utilizador pode escolher no editor (as da marca primeiro)
export const FONT_CHOICES = [
  ...EMAIL_FONTS.map((f) => ({ id: f.stack, label: f.name })),
  { id: "Arial, Helvetica, sans-serif", label: "Arial" },
  { id: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { id: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { id: "'Trebuchet MS', Helvetica, sans-serif", label: "Trebuchet MS" },
  { id: "'Courier New', monospace", label: "Courier New" },
];
