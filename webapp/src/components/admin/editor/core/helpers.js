import config from "../../../../utils/config";

const getMediaUrl = (name) => (name ? `${config.server_ip}/media/${name}` : null);

// Links vindos do editor são texto livre — nunca deixar passar
// "javascript:"/"data:"/"vbscript:" (XSS para qualquer aluno que clique).
// Aceita http(s), mailto, tel, âncoras (#id) e caminhos relativos (/cursos).
export function safeHref(href) {
  if (!href || typeof href !== "string") return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  // Remove caracteres de controlo/espaços que os browsers ignoram dentro do
  // esquema (ex.: "java\tscript:").
  // eslint-disable-next-line no-control-regex
  const normalized = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (/^(javascript|data|vbscript|file):/.test(normalized)) return undefined;
  return trimmed;
}

// Só URLs https absolutos (para iframes/embeds de terceiros).
export function safeHttpsUrl(url) {
  if (!url || typeof url !== "string") return undefined;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Props de um <a> a partir de um campo de link ({url, newTab, nofollow}) ou
// de uma string simples (formato antigo). Em edição, os links nunca navegam.
export function linkProps(link, isEditing) {
  const url = typeof link === "string" ? link : link?.url;
  const href = safeHref(url);
  if (!href) return null;
  if (isEditing) return { href: "#", tabIndex: -1, onClick: (e) => e.preventDefault() };
  const newTab = typeof link === "object" && link?.newTab;
  const rel = [newTab ? "noopener noreferrer" : null, typeof link === "object" && link?.nofollow ? "nofollow" : null].filter(Boolean).join(" ");
  return { href, target: newTab ? "_blank" : undefined, rel: rel || undefined };
}

// Ficheiros da biblioteca de multimédia são guardados só pelo nome
// ({url: "ficheiro.jpg"}); URLs absolutos (formato antigo de Hero/Logos)
// continuam a funcionar.
export function mediaSrc(value) {
  const name = typeof value === "string" ? value : value?.url;
  if (!name) return undefined;
  if (/^https?:\/\//i.test(name)) return name;
  if (name.startsWith("/")) return name;
  return getMediaUrl(name);
}

export function mediaAlt(value, fallback = "") {
  if (value && typeof value === "object" && value.alt) return value.alt;
  return fallback || "";
}

export function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(Math.max(v, min), max);
}

// Ids novos para tudo o que é colado/inserido a partir de um template (os
// ids do Puck têm de ser únicos na página inteira).
export function newId(type) {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${type}-${rand}`;
}

// Percorre um bloco (e todos os blocos dentro de slots, a qualquer
// profundidade) e troca todos os ids — usado em colar e templates.
export function cloneWithNewIds(item) {
  const visit = (node) => {
    if (!node || typeof node !== "object" || !node.type || !node.props) return node;
    const props = {};
    for (const [key, value] of Object.entries(node.props)) {
      if (Array.isArray(value) && value.length > 0 && value.every((v) => v && typeof v === "object" && v.type && v.props)) {
        props[key] = value.map(visit);
      } else {
        props[key] = value;
      }
    }
    props.id = newId(node.type);
    return { type: node.type, props };
  };
  return visit(JSON.parse(JSON.stringify(item)));
}

// Percorre todos os blocos de um conteúdo do Puck (raiz, zonas antigas e
// slots), sem depender do config.
export function walkContent(data, fn) {
  const visit = (node) => {
    if (!node || typeof node !== "object" || !node.type) return;
    fn(node);
    Object.values(node.props || {}).forEach((value) => {
      if (Array.isArray(value)) value.forEach((v) => v && v.type && v.props && visit(v));
    });
  };
  (data?.content || []).forEach(visit);
  Object.values(data?.zones || {}).forEach((zone) => (zone || []).forEach(visit));
}
