import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, responsive, selectField, sliderField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import ElementIcon from "../../core/icon";
import { legacyAlign } from "../icon";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const LINE_STYLES = [
  { label: "Sólida", value: "solid" },
  { label: "Tracejada", value: "dashed" },
  { label: "Pontilhada", value: "dotted" },
  { label: "Dupla", value: "double" },
];

const DividerInner = {
  label: "Divisor",
  fields: {
    element: buttonsField("Elemento ao centro", [
      { label: "Nenhum", value: "none" },
      { label: "Texto", value: "text" },
      { label: "Ícone", value: "icon" },
    ]),
    text: { type: "text", label: "Texto", contentEditable: true, showIf: (p) => get(p, "element") === "text" },
    icon: iconField("Ícone", { showIf: (p) => get(p, "element") === "icon" }),

    width: responsive(unitField("Largura", { units: ["%", "px"] })),
    align: responsive(alignField("Alinhamento")),
    gapAbove: sliderField("Espaço acima", { min: 0, max: 200, suffix: "px" }),
    gapBelow: sliderField("Espaço abaixo", { min: 0, max: 200, suffix: "px" }),

    lineStyle: selectField("Tipo de linha", LINE_STYLES),
    thickness: sliderField("Espessura", { min: 1, max: 20, suffix: "px" }),
    color: colorField("Cor da linha"),
    elementColor: colorField("Cor do elemento", { showIf: (p) => ["text", "icon"].includes(get(p, "element")) }),
    elementSize: sliderField("Tamanho do elemento", { min: 10, max: 80, suffix: "px", showIf: (p) => ["text", "icon"].includes(get(p, "element")) }),
    elementSpacing: sliderField("Espaço à volta do elemento", { min: 0, max: 80, suffix: "px", showIf: (p) => ["text", "icon"].includes(get(p, "element")) }),
  },
  defaultProps: {
    element: "none",
    text: "ou",
    icon: "star",
    width: { desktop: { value: 100, unit: "%" } },
    align: { desktop: "center" },
    gapAbove: 16,
    gapBelow: 16,
    lineStyle: "solid",
    thickness: 1,
    color: "#e5e5e5",
  },
  // `width` antigo era texto ("100%") e `align` vinha como flex-start/…;
  // unitToCss/legacyAlign aceitam os dois formatos.
  render: ({ id, element, text, icon, width, align, gapAbove, gapBelow, lineStyle, thickness, color, elementColor, elementSize, elementSpacing }) => {
    const S = `[data-style-id="${id}"]`;
    const line = `${thickness || 1}px ${LINE_STYLES.some((s) => s.value === lineStyle) ? lineStyle : "solid"} ${color || "#e5e5e5"}`;
    const hasElement = (element === "text" && !!text) || (element === "icon" && !!icon);

    const css = [
      rule(`${S} .el-divider-wrap`, {
        paddingTop: typeof gapAbove === "number" ? `${gapAbove}px` : undefined,
        paddingBottom: typeof gapBelow === "number" ? `${gapBelow}px` : undefined,
      }),
      responsiveRules(`${S} .el-divider`, (d) => {
        const a = legacyAlign(own(align, d));
        return {
          width: unitToCss(own(width, d)),
          marginLeft: a === "left" ? "0" : a ? "auto" : undefined,
          marginRight: a === "right" ? "0" : a ? "auto" : undefined,
        };
      }),
      rule(`${S} .el-divider__line`, { borderTop: line }),
      hasElement
        ? rule(`${S} .el-divider__el`, {
            color: elementColor ? `${elementColor} !important` : undefined,
            fontSize: typeof elementSize === "number" ? `${elementSize}px` : undefined,
            padding: `0 ${typeof elementSpacing === "number" ? elementSpacing : 12}px`,
          })
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return (
      <div className="el-divider-wrap">
        <style>{css}</style>
        {hasElement ? (
          // Com texto, o texto é conteúdo legível (sem role="separator",
          // que tornaria os filhos "apresentacionais").
          <div className="el-divider" role={element === "icon" ? "separator" : undefined} style={{ display: "flex", alignItems: "center", maxWidth: "100%" }}>
            <span className="el-divider__line" style={{ flex: "1 1 0", minWidth: 12 }} />
            <span className="el-divider__el" style={{ display: "inline-flex", alignItems: "center", lineHeight: 1.2, fontWeight: 600, whiteSpace: "nowrap" }}>
              {element === "icon" ? <ElementIcon name={icon} size="1.2em" /> : text}
            </span>
            <span className="el-divider__line" style={{ flex: "1 1 0", minWidth: 12 }} />
          </div>
        ) : (
          <div className="el-divider" role="separator" style={{ maxWidth: "100%" }}>
            <span className="el-divider__line" style={{ display: "block" }} />
          </div>
        )}
      </div>
    );
  },
};

const Divider = withTabs(withStyle(DividerInner, { exclude: ["color"] }), {
  // `element` no separador Layout: assim o showIf das cores do elemento
  // (separador Estilo) consegue lê-lo — cada separador só vê os seus valores.
  containerKeys: ["element", "width", "align", "gapAbove", "gapBelow"],
  styleKeys: ["lineStyle", "thickness", "color", "elementColor", "elementSize", "elementSpacing"],
});

export default Divider;
