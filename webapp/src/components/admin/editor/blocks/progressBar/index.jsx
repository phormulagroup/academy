import { useRef } from "react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, sliderField, switchField } from "../../core/fields";
import { rule } from "../../core/css";
import { clamp } from "../../core/helpers";
import { prefersReducedMotion, useInViewOnce } from "../counter";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

function ProgressBarView({ id, label, percentage, showPercentage, percentagePosition, animate, barHeight, barColor, useGradient, trackColor, radius, labelColor, percentColor, puck }) {
  const isEditing = puck?.isEditing;
  const ref = useRef(null);
  const pct = clamp(percentage ?? 0, 0, 100);
  const shouldAnimate = !!animate && !isEditing;
  const inView = useInViewOnce(ref, shouldAnimate);
  // Só anima na página publicada (janela principal), por isso basta a window.
  const reduce = shouldAnimate && prefersReducedMotion();
  // No editor (ou sem animação) a barra aparece logo cheia até ao valor.
  const width = !shouldAnimate || inView || reduce ? pct : 0;
  const inside = showPercentage && percentagePosition === "inside";
  const outside = showPercentage && percentagePosition !== "inside";
  const labelId = `${id}-label`;

  const S = `[data-style-id="${id}"]`;
  const fill = useGradient !== false && !barColor ? "linear-gradient(90deg, var(--brand-primary), var(--brand-primary-dark, var(--brand-primary)))" : barColor || "var(--brand-primary)";
  const css = [
    rule(`${S} .el-progress__track`, {
      height: typeof barHeight === "number" ? `${barHeight}px` : undefined,
      backgroundColor: trackColor,
      borderRadius: typeof radius === "number" ? `${radius}px` : undefined,
    }),
    rule(`${S} .el-progress__fill`, { background: fill }),
    labelColor ? rule(`${S} .el-progress__label`, { color: `${labelColor} !important` }) : "",
    percentColor ? rule(`${S} .el-progress__pct`, { color: `${percentColor} !important` }) : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div ref={ref} className="el-progress">
      {css && <style>{css}</style>}
      {(label || outside) && (
        <div className="el-progress__head">
          {label ? (
            <span id={labelId} className="el-progress__label">
              {label}
            </span>
          ) : (
            <span />
          )}
          {outside && (
            <span className="el-progress__pct" aria-hidden="true">
              {pct}%
            </span>
          )}
        </div>
      )}
      <div
        className="el-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}%`}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Progresso"}
      >
        <div className={`el-progress__fill${shouldAnimate && !reduce ? " el-progress__fill--animated" : ""}`} style={{ width: `${width}%` }}>
          {inside && (
            <span className="el-progress__pct el-progress__pct--inside" aria-hidden="true">
              {pct}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const ProgressBarInner = {
  label: "Barra de progresso",
  fields: {
    label: { type: "text", label: "Rótulo", contentEditable: true },
    percentage: sliderField("Percentagem", { min: 0, max: 100, suffix: "%" }),
    showPercentage: switchField("Mostrar percentagem"),
    percentagePosition: buttonsField(
      "Posição da percentagem",
      [
        { label: "Fora (ao lado do rótulo)", value: "outside" },
        { label: "Dentro da barra", value: "inside" },
      ],
      { showIf: (p) => !!get(p, "showPercentage") },
    ),
    animate: switchField("Animar ao aparecer no ecrã"),

    barHeight: sliderField("Altura da barra", { min: 2, max: 60, suffix: "px" }),
    useGradient: switchField("Gradiente da marca", { showIf: (p) => !get(p, "barColor") }),
    barColor: colorField("Cor da barra (substitui o gradiente)"),
    trackColor: colorField("Cor do fundo da barra"),
    radius: sliderField("Raio dos cantos", { min: 0, max: 30, suffix: "px" }),
    labelColor: colorField("Cor do rótulo"),
    percentColor: colorField("Cor da percentagem"),
  },
  defaultProps: {
    label: "Progresso do curso",
    percentage: 70,
    showPercentage: true,
    percentagePosition: "outside",
    animate: true,
    barHeight: 12,
    useGradient: true,
    radius: 30,
  },
  render: (p) => <ProgressBarView {...p} />,
};

const ProgressBar = withTabs(withStyle(ProgressBarInner, { typography: true }), {
  styleKeys: ["barHeight", "useGradient", "barColor", "trackColor", "radius", "labelColor", "percentColor"],
});

export default ProgressBar;
