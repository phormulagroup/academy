// Fontes disponíveis em "Tipografia". "Poppins" já vem carregada pela app
// (index.css); as restantes são pedidas ao Google Fonts só quando algum
// bloco da página as usa (ver useFontLoader em element.jsx).
export const FONT_FAMILIES = [
  { label: "Herdar (fonte da página)", value: "" },
  { label: "Poppins", value: "Poppins" },
  { label: "Inter", value: "Inter" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Lato", value: "Lato" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Nunito", value: "Nunito" },
  { label: "Raleway", value: "Raleway" },
  { label: "Source Sans 3", value: "Source Sans 3" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Merriweather (serifa)", value: "Merriweather" },
  { label: "Playfair Display (serifa)", value: "Playfair Display" },
  { label: "Lora (serifa)", value: "Lora" },
  { label: "Roboto Mono (mono)", value: "Roboto Mono" },
];

const ALREADY_LOADED = new Set(["Poppins"]);
const SERIF = new Set(["Merriweather", "Playfair Display", "Lora"]);

export function fontStack(family) {
  if (!family) return undefined;
  const fallback = family === "Roboto Mono" ? "monospace" : SERIF.has(family) ? "serif" : "sans-serif";
  return `"${family}", ${fallback}`;
}

// O editor desenha a página dentro de um iframe — a <link> tem de ir para o
// documento onde o bloco está, não para o da app.
export function ensureFontLoaded(family, doc = typeof document !== "undefined" ? document : null) {
  if (!family || !doc || ALREADY_LOADED.has(family)) return;
  if (!FONT_FAMILIES.some((f) => f.value === family)) return;
  const id = `el-font-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (doc.getElementById(id)) return;
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap`;
  doc.head.appendChild(link);
}
