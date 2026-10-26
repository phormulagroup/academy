import { useEffect, useRef, useState } from "react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, responsive, selectField, sliderField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import ElementIcon from "../../core/icon";
import { legacyAlign } from "../icon";
import "./styles.css";

// True quando o utilizador pediu menos animações no sistema operativo.
export function prefersReducedMotion(win) {
  try {
    return !!(win || window).matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Fica true (uma única vez) quando o elemento entra no ecrã. Usa o
 * IntersectionObserver da janela do próprio elemento (no editor o bloco
 * vive dentro de um iframe). Sem suporte, devolve true logo.
 */
export function useInViewOnce(ref, enabled = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!enabled || inView) return;
    const el = ref.current;
    const win = el?.ownerDocument?.defaultView;
    if (!el || !win?.IntersectionObserver) {
      setInView(true);
      return;
    }
    const io = new win.IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled, inView]);
  return inView;
}

const THOUSANDS = [
  { label: "Espaço (1 000)", value: "space" },
  { label: "Ponto (1.000)", value: "dot" },
  { label: "Vírgula (1,000)", value: "comma" },
  { label: "Nenhum (1000)", value: "none" },
];
const THOUSANDS_CHAR = { space: " ", dot: ".", comma: ",", none: "" };

// Formatação própria (em vez de Intl) para respeitar exatamente a escolha
// do separador — o pt-PT do Intl só agrupa a partir de 10 000.
export function formatNumber(n, { decimals = 0, thousands = "space", decimalSep = "," } = {}) {
  const d = Math.max(0, Math.min(4, Number(decimals) || 0));
  const fixed = Math.abs(Number(n) || 0).toFixed(d);
  const [int, frac] = fixed.split(".");
  const sep = THOUSANDS_CHAR[thousands] ?? " ";
  const grouped = sep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : int;
  return `${Number(n) < 0 ? "-" : ""}${grouped}${frac ? `${decimalSep}${frac}` : ""}`;
}

function toNumber(v, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function CounterView({ id, start, end, decimals, thousands, prefix, suffix, duration, title, icon, iconPosition, align, numberColor, numberSize, titleColor, iconColor, iconSize, puck }) {
  const isEditing = puck?.isEditing;
  const ref = useRef(null);
  const from = toNumber(start, 0);
  const to = toNumber(end, 100);
  const decimalSep = thousands === "comma" ? "." : ",";
  const fmt = (n) => formatNumber(n, { decimals, thousands, decimalSep });

  const inView = useInViewOnce(ref, !isEditing);
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (isEditing || !inView) return;
    const win = ref.current?.ownerDocument?.defaultView || window;
    const ms = Math.max(0, toNumber(duration, 2000));
    if (prefersReducedMotion(win) || ms === 0) {
      setValue(to);
      return;
    }
    let raf;
    const t0 = win.performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic: abranda no fim
      setValue(from + (to - from) * eased);
      if (p < 1) raf = win.requestAnimationFrame(step);
    };
    raf = win.requestAnimationFrame(step);
    return () => win.cancelAnimationFrame(raf);
  }, [isEditing, inView, from, to, duration]);

  // No editor mostra logo o número final (o admin quer ver o resultado,
  // não esperar pela animação).
  const shown = isEditing ? to : value;
  const S = `[data-style-id="${id}"]`;
  const css = [
    responsiveRules(`${S} .el-counter`, (d) => {
      const a = legacyAlign(own(align, d));
      if (!a) return {};
      const flex = a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";
      // Ícone à esquerda = linha: o alinhamento passa a ser no eixo principal.
      return iconPosition === "left" && icon ? { justifyContent: flex } : { textAlign: a, alignItems: flex };
    }),
    numberColor ? rule(`${S} .el-counter__number`, { color: `${numberColor} !important` }) : "",
    responsiveRules(`${S} .el-counter__number`, (d) => ({ fontSize: unitToCss(own(numberSize, d)) })),
    titleColor ? rule(`${S} .el-counter__title`, { color: `${titleColor} !important`, opacity: "1" }) : "",
    iconColor ? rule(`${S} .el-counter__icon`, { color: iconColor }) : "",
    typeof iconSize === "number" ? rule(`${S} .el-counter__icon`, { fontSize: `${iconSize}px` }) : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div ref={ref} className={`el-counter el-counter--icon-${iconPosition === "left" ? "left" : "top"}`}>
      {css && <style>{css}</style>}
      {icon && (
        <span className="el-counter__icon" aria-hidden="true">
          <ElementIcon name={icon} size="1em" />
        </span>
      )}
      <div className="el-counter__body">
        <div className="el-counter__number">
          {/* O número a animar é escondido dos leitores de ecrã (seria lido
              a meio da contagem); o valor final fica em texto oculto. */}
          <span aria-hidden="true">
            {prefix}
            <span className="el-counter__digits">{fmt(shown)}</span>
            {suffix}
          </span>
          <span className="el-counter__sr">{`${prefix || ""}${fmt(to)}${suffix || ""}`}</span>
        </div>
        {title && <div className="el-counter__title">{title}</div>}
      </div>
    </div>
  );
}

const CounterInner = {
  label: "Contador",
  fields: {
    start: { type: "number", label: "Número inicial" },
    end: { type: "number", label: "Número final" },
    prefix: textField("Prefixo", { placeholder: "ex.: +" }),
    suffix: textField("Sufixo", { placeholder: "ex.: % ou  alunos" }),
    decimals: sliderField("Casas decimais", { min: 0, max: 3 }),
    thousands: selectField("Separador de milhares", THOUSANDS),
    duration: sliderField("Duração da animação", { min: 0, max: 8000, step: 100, suffix: "ms" }),
    title: { type: "text", label: "Título", contentEditable: true },
    icon: iconField("Ícone (opcional)"),

    iconPosition: buttonsField("Posição do ícone", [
      { label: "Topo", value: "top" },
      { label: "Esquerda", value: "left" },
    ]),
    align: responsive(alignField("Alinhamento")),

    numberColor: colorField("Cor do número"),
    numberSize: responsive(unitField("Tamanho do número", { units: ["px", "rem", "vw"], max: 200 })),
    titleColor: colorField("Cor do título"),
    iconColor: colorField("Cor do ícone"),
    iconSize: sliderField("Tamanho do ícone", { min: 12, max: 120, suffix: "px" }),
  },
  defaultProps: {
    start: 0,
    end: 1500,
    prefix: "",
    suffix: "+",
    decimals: 0,
    thousands: "space",
    duration: 2000,
    title: "Alunos inscritos",
    iconPosition: "top",
    align: { desktop: "center" },
    numberColor: "var(--brand-primary)",
  },
  render: (p) => <CounterView {...p} />,
};

const Counter = withTabs(withStyle(CounterInner, { typography: true }), {
  containerKeys: ["iconPosition", "align"],
  styleKeys: ["numberColor", "numberSize", "titleColor", "iconColor", "iconSize"],
});

export default Counter;
