import { useRef, useState } from "react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, mediaField, selectField, sliderField, switchField, textField } from "../../core/fields";
import { rule } from "../../core/css";
import { clamp, mediaAlt, mediaSrc } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import { ASPECT_RATIOS } from "../image";
import "./styles.css";

const CONTAINER_KEYS = ["orientation", "initialPosition", "aspectRatio"];
const STYLE_KEYS = ["handleColor", "labelColor", "labelBackground"];

const placeholderStyle = { padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" };

function BeforeAfterView({ id, before, after, showLabels, beforeLabel, afterLabel, orientation, initialPosition, aspectRatio, handleColor, labelColor, labelBackground, puck }) {
  const isEditing = puck?.isEditing;
  const vertical = orientation === "vertical";
  const start = clamp(initialPosition ?? 50, 0, 100);
  const [pos, setPos] = useState(start);
  const [lastStart, setLastStart] = useState(start);
  const rootRef = useRef(null);
  const dragging = useRef(false);

  // Mudar a posição inicial no painel mostra-a logo no canvas (estado
  // derivado durante o render, em vez de um useEffect que desenhava
  // primeiro a posição antiga).
  if (lastStart !== start) {
    setLastStart(start);
    setPos(start);
  }

  const beforeSrc = mediaSrc(before);
  const afterSrc = mediaSrc(after);
  if (!beforeSrc || !afterSrc) {
    return isEditing ? <div style={placeholderStyle}>Escolha a imagem «Antes» e a imagem «Depois»</div> : null;
  }

  const moveTo = (clientX, clientY) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = vertical ? (clientY - r.top) / r.height : (clientX - r.left) / r.width;
    setPos(clamp(Math.round(ratio * 1000) / 10, 0, 100));
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    // No editor, arrastar fora da pega serve para selecionar/mover o bloco
    // (Puck); só a pega move a comparação.
    if (isEditing && !e.target.closest?.(".el-ba__handle")) return;
    if (isEditing) e.stopPropagation();
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    moveTo(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    moveTo(e.clientX, e.clientY);
  };
  const stopDrag = (e) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    const keys = {
      ArrowLeft: -step,
      ArrowDown: vertical ? step : -step,
      ArrowRight: step,
      ArrowUp: vertical ? -step : step,
      PageDown: -10,
      PageUp: 10,
    };
    if (e.key === "Home") setPos(0);
    else if (e.key === "End") setPos(100);
    else if (keys[e.key] !== undefined) setPos((p) => clamp(p + keys[e.key], 0, 100));
    else return;
    e.preventDefault();
  };

  const sel = `[data-style-id="${id}"] .el-ba`;
  const css = [
    rule(sel, { "--el-ba-handle": handleColor }),
    rule(`${sel} .el-ba__label`, { color: labelColor, background: labelBackground }),
  ]
    .filter(Boolean)
    .join("\n");

  // "Antes" fica por cima, recortado até à posição da pega; "Depois" fica
  // por baixo, no fluxo (é ele que dá a altura quando a proporção é a
  // original).
  const clip = vertical ? `inset(0 0 ${100 - pos}% 0)` : `inset(0 ${100 - pos}% 0 0)`;
  const handlePos = vertical ? { top: `${pos}%` } : { left: `${pos}%` };
  const bLabel = (beforeLabel || "").trim() || "Antes";
  const aLabel = (afterLabel || "").trim() || "Depois";

  return (
    <div
      ref={rootRef}
      className={`el-ba el-ba--${vertical ? "vertical" : "horizontal"}${aspectRatio ? " el-ba--ratio" : ""}${isEditing ? " el-ba--editing" : ""}`}
      style={{ aspectRatio: aspectRatio || undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {css && <style>{css}</style>}
      <img className="el-ba__img el-ba__img--after" src={afterSrc} alt={mediaAlt(after, aLabel)} draggable={false} loading="lazy" />
      <img className="el-ba__img el-ba__img--before" src={beforeSrc} alt={mediaAlt(before, bLabel)} draggable={false} loading="lazy" style={{ clipPath: clip }} />
      {showLabels !== false && (
        <>
          <span className="el-ba__label el-ba__label--before" aria-hidden="true" style={{ opacity: pos < 12 ? 0 : 1 }}>
            {bLabel}
          </span>
          <span className="el-ba__label el-ba__label--after" aria-hidden="true" style={{ opacity: pos > 88 ? 0 : 1 }}>
            {aLabel}
          </span>
        </>
      )}
      <div
        className="el-ba__handle"
        style={handlePos}
        role="slider"
        tabIndex={0}
        aria-label={`Comparar «${bLabel}» e «${aLabel}»`}
        aria-orientation={vertical ? "vertical" : "horizontal"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% «${bLabel}»`}
        onKeyDown={onKeyDown}
      >
        <span className="el-ba__line" aria-hidden="true" />
        <span className="el-ba__knob" aria-hidden="true">
          <ElementIcon name={vertical ? "chevrons-up-down" : "chevrons-left-right"} size={18} />
        </span>
      </div>
    </div>
  );
}

const BeforeAfterInner = {
  label: "Antes / Depois",
  fields: {
    before: mediaField("Imagem «Antes»", { withAlt: true }),
    after: mediaField("Imagem «Depois»", { withAlt: true }),
    showLabels: switchField("Mostrar etiquetas"),
    beforeLabel: textField("Etiqueta «Antes»", { showIf: (p) => p.showLabels !== false }),
    afterLabel: textField("Etiqueta «Depois»", { showIf: (p) => p.showLabels !== false }),

    orientation: buttonsField("Orientação", [
      { label: "Horizontal", value: "horizontal", title: "Pega vertical, arrasta para os lados" },
      { label: "Vertical", value: "vertical", title: "Pega horizontal, arrasta para cima e para baixo" },
    ]),
    initialPosition: sliderField("Posição inicial", { min: 0, max: 100, suffix: "%" }),
    aspectRatio: selectField("Proporção", ASPECT_RATIOS),

    handleColor: colorField("Cor da pega", { section: "Pega" }),
    labelColor: colorField("Cor do texto das etiquetas", { section: "Etiquetas" }),
    labelBackground: colorField("Fundo das etiquetas", { section: "Etiquetas" }),
  },
  defaultProps: {
    before: null,
    after: null,
    showLabels: true,
    beforeLabel: "Antes",
    afterLabel: "Depois",
    orientation: "horizontal",
    initialPosition: 50,
    aspectRatio: "",
  },
  render: (p) => <BeforeAfterView {...p} />,
};

const BeforeAfter = withTabs(withStyle(BeforeAfterInner, { exclude: ["color"] }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default BeforeAfter;
