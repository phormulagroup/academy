// Motor de CSS partilhado por todos os blocos do editor.
//
// Tudo o que vem de "Estilo"/"Avançado" é gerado como CSS (nunca como
// style={} inline) — só assim :hover, media queries por dispositivo e o CSS
// personalizado do bloco conseguem sobrepor-se aos valores base.

export const BREAKPOINTS = {
  tablet: 1024,
  mobile: 767,
};

export const DEVICES = ["desktop", "tablet", "mobile"];

const isSet = (v) => v !== undefined && v !== null && v !== "";

// Um valor responsivo é guardado como {desktop, tablet, mobile}. Valores
// antigos (ou campos que deixaram de ser responsivos/passaram a sê-lo)
// podem vir como valor simples — tratado como "só desktop".
export function toBucket(value) {
  if (value === undefined || value === null) return {};
  if (typeof value === "object" && !Array.isArray(value) && DEVICES.some((d) => d in value)) return value;
  return { desktop: value };
}

// Valor efetivo num dispositivo, com herança desktop → tablet → mobile (como
// no Elementor: o que não for definido num dispositivo menor herda do maior).
export function resolveForDevice(value, device) {
  const b = toBucket(value);
  if (device === "mobile") return isSet(b.mobile) ? b.mobile : isSet(b.tablet) ? b.tablet : b.desktop;
  if (device === "tablet") return isSet(b.tablet) ? b.tablet : b.desktop;
  return b.desktop;
}

export function sidesToCss(sides, unit = "px") {
  if (!sides || typeof sides !== "object") return undefined;
  if (!["top", "right", "bottom", "left"].some((k) => isSet(sides[k]))) return undefined;
  const u = sides.unit || unit;
  const { top = 0, right = 0, bottom = 0, left = 0 } = sides;
  return `${top}${u} ${right}${u} ${bottom}${u} ${left}${u}`;
}

// Raio por canto: aceita o formato antigo {top,right,bottom,left} (que na
// prática sempre foi lido como canto sup-esq, sup-dir, inf-dir, inf-esq).
export function cornersToCss(c) {
  if (!c || typeof c !== "object") return undefined;
  const tl = c.topLeft ?? c.top;
  const tr = c.topRight ?? c.right;
  const br = c.bottomRight ?? c.bottom;
  const bl = c.bottomLeft ?? c.left;
  if (![tl, tr, br, bl].some(isSet)) return undefined;
  const u = c.unit || "px";
  return `${tl || 0}${u} ${tr || 0}${u} ${br || 0}${u} ${bl || 0}${u}`;
}

// {value, unit} → "12px"; número simples → px.
export function unitToCss(v, defaultUnit = "px") {
  if (!isSet(v)) return undefined;
  if (typeof v === "number") return `${v}${defaultUnit}`;
  if (typeof v === "string") return v;
  if (typeof v === "object" && isSet(v.value)) {
    if (v.unit === "auto") return "auto";
    return `${v.value}${v.unit || defaultUnit}`;
  }
  if (typeof v === "object" && v.unit === "auto") return "auto";
  return undefined;
}

export function shadowToCss(s) {
  if (!s) return undefined;
  if (typeof s === "string") return s || undefined;
  if (!s.enabled) return undefined;
  const { x = 0, y = 4, blur = 12, spread = 0, color = "rgba(0,0,0,0.15)", inset } = s;
  return `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

export function gradientToCss(g) {
  if (!g || !g.enabled) return undefined;
  const from = g.from || "#ffffff";
  const to = g.to || "#000000";
  const fromStop = isSet(g.fromStop) ? g.fromStop : 0;
  const toStop = isSet(g.toStop) ? g.toStop : 100;
  if (g.type === "radial") return `radial-gradient(circle at center, ${from} ${fromStop}%, ${to} ${toStop}%)`;
  return `linear-gradient(${isSet(g.angle) ? g.angle : 180}deg, ${from} ${fromStop}%, ${to} ${toStop}%)`;
}

const kebab = (prop) => prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function declarations(obj) {
  return Object.entries(obj)
    .filter(([, v]) => isSet(v))
    .map(([k, v]) => `${kebab(k)}:${v}`)
    .join(";");
}

export function rule(selector, obj) {
  const d = typeof obj === "string" ? obj : declarations(obj);
  return d ? `${selector}{${d}}` : "";
}

function media(device, css) {
  if (!css) return "";
  if (device === "tablet") return `@media (max-width:${BREAKPOINTS.tablet}px){${css}}`;
  if (device === "mobile") return `@media (max-width:${BREAKPOINTS.mobile}px){${css}}`;
  return css;
}

/**
 * Gera CSS por dispositivo. `build(device)` devolve um objeto de
 * declarações (ou string) para esse dispositivo — chamado 3 vezes; só
 * entram as regras com conteúdo.
 */
export function responsiveRules(selector, build) {
  return DEVICES.map((device) => media(device, rule(selector, build(device) || {})))
    .filter(Boolean)
    .join("\n");
}

// Atalho para uma única propriedade responsiva (formato antigo, ainda usado
// por alguns blocos).
export function responsiveCssBlock(selector, property, bucket, formatValue = (v) => v) {
  if (!bucket) return "";
  const b = toBucket(bucket);
  return DEVICES.map((device) => {
    if (!isSet(b[device])) return "";
    const value = formatValue(b[device]);
    if (!isSet(value)) return "";
    return media(device, `${selector}{${property}:${value};}`);
  })
    .filter(Boolean)
    .join("\n");
}

// Para CSS personalizado do bloco: "selector" é substituído pelo seletor
// real do bloco (mesma convenção do Elementor Pro). Remove "</style" para
// nunca conseguir fechar a tag <style> e injetar HTML.
export function scopeCustomCss(css, selector) {
  if (!css || typeof css !== "string") return "";
  return css.replace(/<\/?style/gi, "").replace(/\bselector\b/g, selector);
}

// Valor só do próprio dispositivo (sem herança) — para usar dentro de
// responsiveRules, onde as media queries max-width já fazem a herança.
export function own(value, device) {
  return toBucket(value)[device];
}
