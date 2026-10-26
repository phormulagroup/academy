import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, responsive, sliderField, switchField, textField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { clamp } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import { alignToJustify } from "../icon";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

/**
 * Fila de estrelas (também usada nos Testemunhos). Cada estrela é o ícone
 * "vazio" com uma cópia "cheia" por cima, cortada à percentagem certa —
 * assim meia estrela (ou 0,3) funciona com qualquer ícone, não só com um
 * ícone próprio de meia estrela.
 */
export function Stars({ value = 0, scale = 5, icon = "star", outlineEmpty = false, className = "", label }) {
  const max = Number(scale) === 10 ? 10 : 5;
  const v = clamp(value, 0, max);
  return (
    <span className={`el-stars${outlineEmpty ? " el-stars--outline" : ""} ${className}`.trim()} role="img" aria-label={label || `Classificação: ${fmt(v)} de ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const fill = clamp(v - i, 0, 1) * 100;
        return (
          <span key={i} className="el-stars__star" aria-hidden="true">
            <span className="el-stars__empty">
              <ElementIcon name={icon || "star"} size="1em" />
            </span>
            {fill > 0 && (
              <span className="el-stars__fill" style={{ width: `${fill}%` }}>
                <ElementIcon name={icon || "star"} size="1em" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

const StarRatingInner = {
  label: "Classificação",
  fields: {
    rating: sliderField("Classificação", { min: 0, max: 10, step: 0.5 }),
    scale: buttonsField("Escala", [
      { label: "0 – 5", value: 5 },
      { label: "0 – 10", value: 10 },
    ]),
    icon: iconField("Ícone", { allowClear: false }),
    label: textField("Texto", { placeholder: "ex.: Avaliação dos alunos" }),
    labelPosition: buttonsField(
      "Posição do texto",
      [
        { label: "Antes", value: "before" },
        { label: "Depois", value: "after" },
        { label: "Por cima", value: "above" },
      ],
      { showIf: (p) => !!get(p, "label") },
    ),
    showValue: switchField("Mostrar o valor (ex.: 4,5/5)"),

    align: responsive(alignField("Alinhamento")),

    size: responsive(sliderField("Tamanho", { min: 10, max: 80, suffix: "px" })),
    spacing: sliderField("Espaço entre ícones", { min: 0, max: 30, suffix: "px" }),
    filledColor: colorField("Cor (cheia)"),
    emptyColor: colorField("Cor (vazia)"),
    outlineEmpty: switchField("Vazias só com contorno"),
    labelColor: colorField("Cor do texto"),
  },
  defaultProps: {
    rating: 4.5,
    scale: 5,
    icon: "star",
    labelPosition: "after",
    showValue: false,
    align: { desktop: "left" },
    size: { desktop: 22 },
    spacing: 2,
    filledColor: "#f5a623",
    emptyColor: "#d9dce1",
  },
  render: ({ id, rating, scale, icon, label, labelPosition, showValue, align, size, spacing, filledColor, emptyColor, outlineEmpty, labelColor }) => {
    const max = Number(scale) === 10 ? 10 : 5;
    const v = clamp(rating ?? 0, 0, max);
    const S = `[data-style-id="${id}"]`;
    const pos = label ? labelPosition || "after" : null;
    const css = [
      responsiveRules(`${S} .el-rating`, (d) => {
        const j = alignToJustify(own(align, d));
        return j ? { justifyContent: j, alignItems: pos === "above" ? j : undefined, textAlign: own(align, d) } : {};
      }),
      responsiveRules(`${S} .el-stars`, (d) => {
        const s = own(size, d);
        return { fontSize: typeof s === "number" ? `${s}px` : undefined };
      }),
      rule(`${S} .el-stars`, {
        gap: typeof spacing === "number" ? `${spacing}px` : undefined,
        "--el-star-filled": filledColor,
        "--el-star-empty": emptyColor,
      }),
      labelColor ? rule(`${S} .el-rating__label`, { color: `${labelColor} !important` }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const labelEl = label ? <span className="el-rating__label">{label}</span> : null;
    return (
      <div className={`el-rating${pos === "above" ? " el-rating--stacked" : ""}`}>
        {css && <style>{css}</style>}
        {(pos === "before" || pos === "above") && labelEl}
        <span className="el-rating__stars">
          <Stars value={v} scale={max} icon={icon} outlineEmpty={outlineEmpty} />
          {showValue && (
            <span className="el-rating__value" aria-hidden="true">
              {fmt(v)}/{max}
            </span>
          )}
        </span>
        {pos === "after" && labelEl}
      </div>
    );
  },
};

const StarRating = withTabs(withStyle(StarRatingInner, { typography: true }), {
  containerKeys: ["align"],
  styleKeys: ["size", "spacing", "filledColor", "emptyColor", "outlineEmpty", "labelColor"],
});

export default StarRating;
