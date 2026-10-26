import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, linkField, responsive, selectField, sliderField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { linkProps } from "../../core/helpers";
import { IconView, ICON_SHAPES, ICON_VIEWS, iconStyleFields, iconViewCss, legacyAlign } from "../icon";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const TITLE_TAGS = [
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "H4", value: "h4" },
  { label: "H5", value: "h5" },
  { label: "H6", value: "h6" },
  { label: "Div", value: "div" },
  { label: "Span", value: "span" },
];

// Formato antigo: `direction` row = ícone à esquerda, column = no topo.
function resolvePosition(position, direction) {
  if (position) return position;
  return direction === "column" ? "top" : "left";
}

const IconTextInner = {
  label: "Ícone + texto",
  fields: {
    icon: iconField("Ícone"),
    title: { type: "text", label: "Título", contentEditable: true },
    description: { type: "textarea", label: "Descrição (opcional)", contentEditable: true },
    titleTag: selectField("Etiqueta HTML do título", TITLE_TAGS),
    link: linkField("Link"),
    position: buttonsField("Posição do ícone", [
      { label: "Topo", value: "top" },
      { label: "Esquerda", value: "left" },
      { label: "Direita", value: "right" },
    ]),
    verticalAlign: buttonsField(
      "Alinhamento vertical",
      [
        { label: "Topo", value: "flex-start" },
        { label: "Centro", value: "center" },
        { label: "Fundo", value: "flex-end" },
      ],
      { showIf: (p) => resolvePosition(get(p, "position"), get(p, "direction")) !== "top" },
    ),
    align: responsive(alignField("Alinhamento")),
    gap: sliderField("Espaço entre ícone e texto", { min: 0, max: 80, suffix: "px" }),
    view: buttonsField("Vista do ícone", ICON_VIEWS),
    shape: buttonsField("Forma", ICON_SHAPES, { showIf: (p) => ["stacked", "framed"].includes(get(p, "view")) }),
    ...iconStyleFields({ sizeKey: "iconSize", colorKey: "iconColor", sizeLabel: "Tamanho do ícone" }),
    titleColor: colorField("Cor do título"),
    descriptionColor: colorField("Cor da descrição"),
  },
  defaultProps: {
    icon: "circle-check",
    title: "Título da caixa",
    description: "Uma frase curta a explicar este ponto.",
    titleTag: "h3",
    position: "top",
    align: { desktop: "center" },
    gap: 14,
    view: "stacked",
    shape: "circle",
    iconSize: { desktop: 28 },
    iconColor: "var(--brand-primary)",
    iconPadding: 0.6,
  },
  // Campos antigos: `text` (agora título), `iconSize`/`gap` como número,
  // `direction` (row|column), `align` (flex-start|center|flex-end) e
  // `href` (string). Continuam todos a ser lidos.
  render: (props) => {
    const { id, icon, title, text, description, titleTag, link, href, position, direction, verticalAlign, align, gap, view, shape, puck } = props;
    const pos = resolvePosition(position, direction);
    const S = `[data-style-id="${id}"]`;
    const box = `${S} .el-icontext`;
    const heading = title ?? text;
    const hasDescription = !!description;

    const css = [
      rule(box, {
        gap: typeof gap === "number" ? `${gap}px` : undefined,
        alignItems: pos === "top" ? undefined : verticalAlign || (hasDescription ? "flex-start" : "center"),
      }),
      // Alinhamento: em "topo" é o texto e o ícone; ao lado, posiciona o
      // conjunto (o texto fica sempre alinhado à esquerda junto do ícone).
      responsiveRules(box, (d) => {
        const a = legacyAlign(own(align, d));
        if (!a) return {};
        if (pos === "top") return { textAlign: a, alignItems: a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center" };
        return { justifyContent: a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center" };
      }),
      iconViewCss(`${box} .el-iconview`, {
        view,
        size: props.iconSize,
        primary: props.iconColor,
        secondary: props.secondaryColor,
        padding: props.iconPadding,
        borderWidth: props.frameWidth,
        rotate: props.rotate,
      }),
      props.titleColor ? rule(`${box} .el-icontext__title`, { color: `${props.titleColor} !important` }) : "",
      props.descriptionColor ? rule(`${box} .el-icontext__desc`, { color: `${props.descriptionColor} !important`, opacity: "1" }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const lp = linkProps(link ?? href, puck?.isEditing);
    const Tag = TITLE_TAGS.some((t) => t.value === titleTag) ? titleTag : "span";
    const titleEl = heading ? (
      <Tag className={`el-icontext__title${hasDescription ? " el-icontext__title--strong" : ""}`}>
        {lp ? (
          <a className="el-icontext__link" {...lp}>
            {heading}
          </a>
        ) : (
          heading
        )}
      </Tag>
    ) : null;

    return (
      <>
        {css && <style>{css}</style>}
        <div className={`el-icontext el-icontext--${pos}`}>
          {icon && <IconView name={icon} view={view || "default"} shape={shape} />}
          {(titleEl || hasDescription) && (
            <div className="el-icontext__body">
              {titleEl}
              {hasDescription && <div className="el-icontext__desc">{description}</div>}
            </div>
          )}
        </div>
      </>
    );
  },
};

const CONTAINER_KEYS = ["position", "verticalAlign", "align", "gap", "view", "shape", "titleTag"];
const STYLE_KEYS = ["iconSize", "iconColor", "secondaryColor", "iconPadding", "frameWidth", "rotate", "titleColor", "descriptionColor"];

const IconText = withTabs(withStyle(IconTextInner, { typography: true }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default IconText;
