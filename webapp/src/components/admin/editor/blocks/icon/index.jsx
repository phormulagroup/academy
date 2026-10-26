import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, linkField, responsive, sliderField, textField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { linkProps } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import "./styles.css";

// Valores de um campo que pode estar no topo das props (dados antigos /
// campos de conteúdo) ou em __design.container (campos movidos para os
// separadores Layout/Estilo). O `showIf` dos campos é chamado com um ou
// outro formato consoante quem o avalia, por isso lê sempre dos dois.
const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

export const ICON_VIEWS = [
  { label: "Simples", value: "default" },
  { label: "Com fundo", value: "stacked" },
  { label: "Com moldura", value: "framed" },
];

export const ICON_SHAPES = [
  { label: "Círculo", value: "circle" },
  { label: "Arredondado", value: "rounded" },
  { label: "Quadrado", value: "square" },
];

// Os blocos antigos guardavam o alinhamento como valor de flexbox.
export function legacyAlign(a) {
  if (a === "flex-start" || a === "start") return "left";
  if (a === "flex-end" || a === "end") return "right";
  return a;
}

export function alignToJustify(a) {
  const v = legacyAlign(a);
  if (v === "left") return "flex-start";
  if (v === "right") return "flex-end";
  if (v === "center") return "center";
  return undefined;
}

/**
 * Ícone com as variantes do Elementor (simples / com fundo / com moldura).
 * Como no Elementor: em "com fundo", a cor principal é o fundo e a
 * secundária o ícone; em "com moldura", a principal é a moldura+ícone e a
 * secundária o fundo.
 */
export function IconView({ name, view = "default", shape = "circle", className = "" }) {
  if (!name) return null;
  const v = ICON_VIEWS.some((o) => o.value === view) ? view : "default";
  const cls = ["el-iconview", `el-iconview--${v}`, v !== "default" ? `el-iconview--${shape || "circle"}` : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls} aria-hidden="true">
      <ElementIcon name={name} size="1em" />
    </span>
  );
}

// CSS por instância do ícone (tamanho responsivo, cores, rotação). `size`
// aceita número simples (formato antigo) ou {desktop, tablet, mobile}.
export function iconViewCss(sel, { view = "default", size, primary, secondary, padding, borderWidth, rotate }) {
  const v = view || "default";
  const colors =
    v === "stacked"
      ? { backgroundColor: primary || "var(--brand-primary)", color: secondary || "#ffffff" }
      : v === "framed"
        ? { color: primary, borderColor: primary, backgroundColor: secondary }
        : { color: primary };
  return [
    rule(sel, {
      ...colors,
      padding: v !== "default" && typeof padding === "number" ? `${padding}em` : undefined,
      borderWidth: v === "framed" && typeof borderWidth === "number" ? `${borderWidth}px` : undefined,
    }),
    typeof rotate === "number" && rotate !== 0 ? rule(`${sel} svg`, { transform: `rotate(${rotate}deg)` }) : "",
    responsiveRules(sel, (d) => {
      const s = own(size, d);
      return { fontSize: typeof s === "number" ? `${s}px` : undefined };
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

// Campos de aparência do ícone, partilhados com Ícone + texto.
export function iconStyleFields({ sizeKey = "size", colorKey = "color", sizeLabel = "Tamanho" } = {}) {
  const isBoxed = (p) => ["stacked", "framed"].includes(get(p, "view"));
  return {
    [sizeKey]: responsive(sliderField(sizeLabel, { min: 8, max: 300, suffix: "px" })),
    [colorKey]: colorField("Cor principal"),
    secondaryColor: colorField("Cor secundária", { showIf: isBoxed }),
    iconPadding: sliderField("Espaço à volta do ícone", { min: 0, max: 3, step: 0.05, suffix: "em", showIf: isBoxed }),
    frameWidth: sliderField("Espessura da moldura", { min: 1, max: 12, suffix: "px", showIf: (p) => get(p, "view") === "framed" }),
    rotate: sliderField("Rodar", { min: -180, max: 180, suffix: "°" }),
  };
}

const IconInner = {
  label: "Ícone",
  fields: {
    icon: iconField("Ícone", { allowClear: false }),
    link: linkField("Link"),
    ariaLabel: textField("Texto para leitores de ecrã", {
      placeholder: "ex.: Ir para a página de contactos",
      help: "Recomendado quando o ícone tem link (um ícone sozinho não tem texto).",
    }),
    view: buttonsField("Vista", ICON_VIEWS),
    shape: buttonsField("Forma", ICON_SHAPES, { showIf: (p) => ["stacked", "framed"].includes(get(p, "view")) }),
    align: responsive(alignField("Alinhamento")),
    ...iconStyleFields(),
  },
  defaultProps: {
    icon: "star",
    view: "default",
    shape: "circle",
    align: { desktop: "center" },
    size: { desktop: 48 },
    color: "var(--brand-primary)",
  },
  // `href` (string) era o link antigo; `align` vinha como flex-start/…;
  // `size` como número e `color` sem cor = herdava a cor do texto.
  render: ({ id, icon, link, href, ariaLabel, view, shape, align, size, color, secondaryColor, iconPadding, frameWidth, rotate, puck }) => {
    const S = `[data-style-id="${id}"]`;
    const css = [
      responsiveRules(`${S} .el-icon-block`, (d) => ({ justifyContent: alignToJustify(own(align, d)) })),
      iconViewCss(`${S} .el-iconview`, { view, size, primary: color, secondary: secondaryColor, padding: iconPadding, borderWidth: frameWidth, rotate }),
    ]
      .filter(Boolean)
      .join("\n");

    if (!icon) {
      return puck?.isEditing ? <div style={{ padding: 12, textAlign: "center", color: "#999", border: "1px dashed #ccc", borderRadius: 6 }}>Escolha um ícone</div> : null;
    }

    const lp = linkProps(link ?? href, puck?.isEditing);
    const iconEl = <IconView name={icon} view={view} shape={shape} />;
    return (
      <>
        {css && <style>{css}</style>}
        <div className="el-icon-block">
          {lp ? (
            <a className="el-icon-block__link" aria-label={ariaLabel || "Link"} {...lp}>
              {iconEl}
            </a>
          ) : ariaLabel ? (
            <span role="img" aria-label={ariaLabel} style={{ display: "inline-flex" }}>
              {iconEl}
            </span>
          ) : (
            iconEl
          )}
        </div>
      </>
    );
  },
};

const STYLE_KEYS = ["size", "color", "secondaryColor", "iconPadding", "frameWidth", "rotate"];

const Icon = withTabs(withStyle(IconInner), { containerKeys: ["view", "shape", "align"], styleKeys: STYLE_KEYS });

export default Icon;
