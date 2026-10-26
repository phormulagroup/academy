import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, responsive, sliderField, switchField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import { alignToJustify } from "../icon";
import "./styles.css";

dayjs.extend(customParseFormat);

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

// Formatos aceites no campo de data (hora local de quem vê a página).
const DATE_FORMATS = ["YYYY-MM-DD HH:mm", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD", "DD/MM/YYYY HH:mm", "DD/MM/YYYY", "DD-MM-YYYY HH:mm", "DD-MM-YYYY"];

export function parseTarget(value) {
  if (!value || typeof value !== "string") return null;
  const s = value.trim();
  const strict = dayjs(s, DATE_FORMATS, true);
  if (strict.isValid()) return strict;
  const loose = dayjs(s); // ISO com fuso (ex.: 2026-12-31T23:59:00Z)
  return loose.isValid() ? loose : null;
}

const UNITS = [
  { key: "days", size: 86400, one: "Dia", many: "Dias", short: "d" },
  { key: "hours", size: 3600, one: "Hora", many: "Horas", short: "h" },
  { key: "minutes", size: 60, one: "Minuto", many: "Minutos", short: "min" },
  { key: "seconds", size: 1, one: "Segundo", many: "Segundos", short: "s" },
];

// Distribui o tempo restante pelas unidades visíveis: se "Dias" estiver
// escondido, as horas acumulam os dias (ex.: 50 horas), como no Elementor.
function splitTime(totalSeconds, enabled) {
  let rest = Math.max(0, Math.floor(totalSeconds));
  return UNITS.filter((u) => enabled[u.key]).map((u) => {
    const n = Math.floor(rest / u.size);
    rest -= n * u.size;
    return { ...u, n };
  });
}

function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function CountdownView({
  id,
  target,
  showDays,
  showHours,
  showMinutes,
  showSeconds,
  showLabels,
  view,
  expiredMessage,
  hideWhenExpired,
  align,
  gap,
  boxBackground,
  numberColor,
  labelColor,
  boxRadius,
  numberSize,
  puck,
}) {
  const isEditing = puck?.isEditing;
  const date = useMemo(() => parseTarget(target), [target]);
  const enabled = { days: showDays !== false, hours: showHours !== false, minutes: showMinutes !== false, seconds: showSeconds !== false };
  if (!Object.values(enabled).some(Boolean)) enabled.seconds = true;

  const end = date ? date.valueOf() : null;
  const now = useNow(!!end);
  const remaining = end ? (end - now) / 1000 : 0;
  const expired = !!end && remaining <= 0;

  const S = `[data-style-id="${id}"]`;
  const isInline = view === "inline";
  const css = [
    responsiveRules(`${S} .el-countdown`, (d) => {
      const j = alignToJustify(own(align, d));
      return j ? { justifyContent: j, textAlign: own(align, d) } : {};
    }),
    rule(`${S} .el-countdown`, { gap: typeof gap === "number" ? `${gap}px` : undefined }),
    !isInline
      ? rule(`${S} .el-countdown__unit`, {
          backgroundColor: boxBackground,
          borderRadius: typeof boxRadius === "number" ? `${boxRadius}px` : undefined,
        })
      : "",
    numberColor ? rule(`${S} .el-countdown__num`, { color: `${numberColor} !important` }) : "",
    labelColor ? rule(`${S} .el-countdown__label`, { color: `${labelColor} !important` }) : "",
    responsiveRules(`${S} .el-countdown__num`, (d) => ({ fontSize: unitToCss(own(numberSize, d)) })),
  ]
    .filter(Boolean)
    .join("\n");

  if (!date) {
    return isEditing ? <div className="el-countdown-hint">Data inválida — use o formato 2026-12-31 23:59</div> : null;
  }

  if (expired) {
    if (hideWhenExpired && !isEditing) return null;
    return (
      <>
        {css && <style>{css}</style>}
        <div className="el-countdown el-countdown--expired">
          <div className="el-countdown__expired">{expiredMessage || (isEditing ? "O prazo terminou (sem mensagem definida)." : "")}</div>
        </div>
      </>
    );
  }

  const parts = splitTime(remaining, enabled);
  const pad = (n, i) => (i === 0 ? String(n) : String(n).padStart(2, "0"));
  // Texto completo para leitores de ecrã (a contagem visível muda a cada
  // segundo e não é anunciada — role="timer" tem aria-live "off").
  const spoken = parts.map((p) => `${p.n} ${(p.n === 1 ? p.one : p.many).toLowerCase()}`).join(", ");

  return (
    <>
      {css && <style>{css}</style>}
      <div className={`el-countdown el-countdown--${isInline ? "inline" : "boxes"}`} role="timer" aria-label={`Faltam ${spoken}`}>
        {parts.map((p, i) => (
          <div key={p.key} className="el-countdown__unit" aria-hidden="true">
            <span className="el-countdown__num">{pad(p.n, i)}</span>
            {showLabels !== false && <span className="el-countdown__label">{isInline ? p.short : p.n === 1 ? p.one : p.many}</span>}
          </div>
        ))}
      </div>
    </>
  );
}

const CountdownInner = {
  label: "Contagem decrescente",
  fields: {
    target: textField("Data e hora de fim", {
      placeholder: "2026-12-31 23:59",
      help: "Formato AAAA-MM-DD HH:mm (também aceita 31/12/2026 23:59). Hora local de quem vê a página.",
    }),
    showDays: switchField("Mostrar dias"),
    showHours: switchField("Mostrar horas"),
    showMinutes: switchField("Mostrar minutos"),
    showSeconds: switchField("Mostrar segundos"),
    showLabels: switchField("Mostrar legendas (Dias, Horas…)"),
    expiredMessage: textField("Mensagem quando terminar", { multiline: true, rows: 2 }),
    hideWhenExpired: switchField("Esconder o bloco quando terminar"),

    view: buttonsField("Vista", [
      { label: "Caixas", value: "boxes" },
      { label: "Em linha", value: "inline" },
    ]),
    align: responsive(alignField("Alinhamento")),
    gap: sliderField("Espaço entre unidades", { min: 0, max: 60, suffix: "px" }),

    boxBackground: colorField("Fundo das caixas", { showIf: (p) => get(p, "view") !== "inline" }),
    boxRadius: sliderField("Raio das caixas", { min: 0, max: 40, suffix: "px", showIf: (p) => get(p, "view") !== "inline" }),
    numberColor: colorField("Cor dos números"),
    numberSize: responsive(unitField("Tamanho dos números", { units: ["px", "rem", "vw"], max: 160 })),
    labelColor: colorField("Cor das legendas"),
  },
  defaultProps: {
    target: dayjs().add(30, "day").format("YYYY-MM-DD 23:59"),
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    showLabels: true,
    expiredMessage: "O prazo terminou.",
    view: "boxes",
    align: { desktop: "center" },
    gap: 12,
    // Sem cores por omissão: as caixas já são da cor da marca com texto
    // branco (styles.css) e a vista "em linha" herda a cor do texto — uma
    // cor branca aqui ficava invisível ao trocar para "em linha".
    boxRadius: 12,
  },
  render: (p) => <CountdownView {...p} />,
};

const Countdown = withTabs(withStyle(CountdownInner, { typography: true }), {
  containerKeys: ["view", "align", "gap"],
  styleKeys: ["boxBackground", "boxRadius", "numberColor", "numberSize", "labelColor"],
});

export default Countdown;
