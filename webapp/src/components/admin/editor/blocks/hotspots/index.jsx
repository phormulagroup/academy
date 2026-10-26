import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, iconField, mediaField, sliderField, switchField } from "../../core/fields";
import { rule } from "../../core/css";
import { clamp, mediaAlt, mediaSrc } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import "./styles.css";

const domId = (id) => String(id || "el").replace(/[^a-zA-Z0-9_-]/g, "");
const GUTTER = 8;
const GAP = 10;

function canHover(el) {
  try {
    const win = el?.ownerDocument?.defaultView || window;
    return win.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

function HotspotsView({ id, image, points, trigger, markerStyle, pinSize, pinColor, pinIconColor, pulse, tooltipWidth, tooltipBackground, tooltipColor, puck }) {
  const isEditing = puck?.isEditing;
  const list = Array.isArray(points) ? points : [];
  const rootRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const base = `el-hs-${domId(id)}`;
  const src = mediaSrc(image);
  const hoverMode = trigger === "hover";
  const pin = clamp(pinSize ?? 28, 16, 64);

  // O tooltip é posicionado em JS (e não só em CSS) para nunca sair da
  // largura da imagem em telemóvel — precisa do tamanho real do contentor.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const win = el.ownerDocument?.defaultView || window;
    if (typeof win.ResizeObserver === "undefined") return undefined;
    const ro = new win.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  // Fechar ao clicar fora ou com Escape (no documento do próprio bloco —
  // no editor é o iframe do canvas).
  useEffect(() => {
    if (open === null) return undefined;
    const doc = rootRef.current?.ownerDocument || document;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(null);
        rootRef.current?.querySelector(`#${base}-pin-${open}`)?.focus();
      }
    };
    doc.addEventListener("pointerdown", onDown);
    doc.addEventListener("keydown", onKey);
    return () => {
      doc.removeEventListener("pointerdown", onDown);
      doc.removeEventListener("keydown", onKey);
    };
  }, [open, base]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  if (!src && !isEditing) return null;

  const openNow = (i) => {
    clearTimeout(closeTimer.current);
    setOpen(i);
  };
  // Pequeno atraso ao sair, para dar tempo de levar o rato do ponto até ao
  // tooltip sem ele fechar pelo caminho.
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };
  const hoverEnabled = (el) => hoverMode && canHover(el);

  const sel = `[data-style-id="${id}"] .el-hs`;
  const css = rule(sel, {
    "--el-hs-pin": `${pin}px`,
    "--el-hs-pin-color": pinColor,
    "--el-hs-pin-icon": pinIconColor,
    "--el-hs-tip-bg": tooltipBackground,
    "--el-hs-tip-color": tooltipColor,
  });

  const tooltipStyle = (pt) => {
    const w = size.w || 320;
    const width = Math.max(Math.min(tooltipWidth || 260, w - GUTTER * 2), 120);
    const px = (clamp(pt?.x ?? 50, 0, 100) / 100) * w;
    const py = (clamp(pt?.y ?? 50, 0, 100) / 100) * (size.h || 0);
    const left = Math.min(Math.max(px - width / 2, GUTTER), Math.max(w - width - GUTTER, GUTTER));
    // Abre para o lado (cima/baixo) com mais espaço dentro da imagem.
    const above = py > (size.h || 0) / 2;
    return above ? { width, left, bottom: (size.h || 0) - py + pin / 2 + GAP } : { width, left, top: py + pin / 2 + GAP };
  };

  return (
    <div ref={rootRef} className={`el-hs${pulse ? " el-hs--pulse" : ""}`}>
      {css && <style>{css}</style>}
      {src ? (
        <img className="el-hs__image" src={src} alt={mediaAlt(image)} loading="lazy" onLoad={() => rootRef.current && setSize({ w: rootRef.current.clientWidth, h: rootRef.current.clientHeight })} />
      ) : (
        <div className="el-hs__placeholder">Escolha uma imagem</div>
      )}
      {list.map((pt, i) => {
        const x = clamp(pt?.x ?? 50, 0, 100);
        const y = clamp(pt?.y ?? 50, 0, 100);
        const isOpen = open === i;
        const label = pt?.title || `Ponto ${i + 1}`;
        return (
          <button
            key={i}
            type="button"
            id={`${base}-pin-${i}`}
            className={`el-hs__pin${isOpen ? " el-hs__pin--open" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-expanded={isOpen}
            aria-controls={`${base}-tip-${i}`}
            aria-label={label}
            onClick={(e) => (hoverEnabled(e.currentTarget) ? openNow(i) : setOpen(isOpen ? null : i))}
            onMouseEnter={(e) => hoverEnabled(e.currentTarget) && openNow(i)}
            onMouseLeave={(e) => hoverEnabled(e.currentTarget) && closeSoon()}
          >
            {pt?.icon ? <ElementIcon name={pt.icon} size={Math.round(pin * 0.55)} /> : markerStyle === "number" ? <span className="el-hs__num">{i + 1}</span> : <span className="el-hs__plus" aria-hidden="true" />}
          </button>
        );
      })}
      {list.map((pt, i) =>
        open === i ? (
          <div
            key={`tip-${i}`}
            id={`${base}-tip-${i}`}
            role="dialog"
            aria-labelledby={pt?.title ? `${base}-tip-title-${i}` : undefined}
            aria-label={pt?.title ? undefined : `Ponto ${i + 1}`}
            className="el-hs__tip"
            style={tooltipStyle(pt)}
            onMouseEnter={(e) => hoverEnabled(e.currentTarget) && openNow(i)}
            onMouseLeave={(e) => hoverEnabled(e.currentTarget) && closeSoon()}
          >
            <button type="button" className="el-hs__close" aria-label="Fechar" onClick={() => setOpen(null)}>
              <X size={14} aria-hidden="true" />
            </button>
            {pt?.title && (
              <p className="el-hs__tip-title" id={`${base}-tip-title-${i}`}>
                {pt.title}
              </p>
            )}
            {pt?.content && <p className="el-hs__tip-text">{pt.content}</p>}
          </div>
        ) : null,
      )}
    </div>
  );
}

const HotspotsInner = {
  label: "Pontos interativos",
  fields: {
    image: mediaField("Imagem", { withAlt: true }),
    points: {
      type: "array",
      label: "Pontos",
      getItemSummary: (item, i) => item?.title || `Ponto ${i + 1}`,
      defaultItemProps: { x: 50, y: 50, title: "Novo ponto", content: "Descrição deste ponto." },
      arrayFields: {
        x: sliderField("Posição horizontal", { min: 0, max: 100, suffix: "%" }),
        y: sliderField("Posição vertical", { min: 0, max: 100, suffix: "%" }),
        title: { type: "text", label: "Título" },
        content: { type: "textarea", label: "Texto" },
        icon: iconField("Ícone (opcional)"),
      },
    },
    trigger: buttonsField("Abrir ao", [
      { label: "Clique / toque", value: "click" },
      { label: "Passar o rato", value: "hover", title: "Em ecrãs táteis abre sempre ao tocar" },
    ]),
    markerStyle: buttonsField("Marcador", [
      { label: "+", value: "plus" },
      { label: "Número", value: "number" },
    ]),
    pinSize: sliderField("Tamanho do ponto", { min: 16, max: 64, suffix: "px", section: "Pontos" }),
    pinColor: colorField("Cor do ponto", { section: "Pontos" }),
    pinIconColor: colorField("Cor do ícone / número", { section: "Pontos" }),
    pulse: switchField("Animação de pulsar", { section: "Pontos" }),
    tooltipWidth: sliderField("Largura máxima do tooltip", { min: 160, max: 480, suffix: "px", section: "Tooltip" }),
    tooltipBackground: colorField("Fundo do tooltip", { section: "Tooltip" }),
    tooltipColor: colorField("Texto do tooltip", { section: "Tooltip" }),
  },
  defaultProps: {
    image: null,
    points: [
      { x: 30, y: 35, title: "Primeiro ponto", content: "Explique aqui o que este ponto da imagem representa." },
      { x: 65, y: 60, title: "Segundo ponto", content: "Pode acrescentar quantos pontos precisar e arrastar a posição com os controlos." },
    ],
    trigger: "click",
    markerStyle: "plus",
    pinSize: 28,
    pinColor: "var(--brand-primary)",
    pinIconColor: "#ffffff",
    pulse: true,
    tooltipWidth: 260,
    tooltipBackground: "#ffffff",
    tooltipColor: "#1f2937",
  },
  render: (props) => <HotspotsView {...props} />,
};

const Hotspots = withTabs(withStyle(HotspotsInner, { exclude: ["color"] }), {
  containerKeys: ["trigger", "markerStyle"],
  styleKeys: ["pinSize", "pinColor", "pinIconColor", "pulse", "tooltipWidth", "tooltipBackground", "tooltipColor"],
});

export default Hotspots;
