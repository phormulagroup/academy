import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, iconField, sliderField, switchField } from "../../core/fields";
import { rule } from "../../core/css";
import ElementIcon from "../../core/icon";
import "./styles.css";

function TimelineView({ id, items, layout, markerType, showCard, lineColor, markerColor, markerTextColor, cardBackground, labelColor, titleColor, itemGap, puck }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return puck?.isEditing ? <div style={{ padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" }}>Adicione passos</div> : null;
  }
  const mode = ["vertical", "alternate", "horizontal"].includes(layout) ? layout : "vertical";
  const marker = ["number", "icon", "dot"].includes(markerType) ? markerType : "icon";

  const sel = `[data-style-id="${id}"] .el-tl`;
  const css = rule(sel, {
    "--el-tl-line": lineColor,
    "--el-tl-marker": markerColor,
    "--el-tl-marker-text": markerTextColor,
    "--el-tl-card": cardBackground,
    "--el-tl-label": labelColor,
    "--el-tl-title": titleColor,
    "--el-tl-gap": itemGap !== undefined && itemGap !== null ? `${itemGap}px` : undefined,
  });

  return (
    <>
      {css && <style>{css}</style>}
      <ol className={`el-tl el-tl--${mode} el-tl--marker-${marker}${showCard === false ? " el-tl--plain" : ""}`}>
        {list.map((item, i) => (
          <li key={i} className={`el-tl__item ${i % 2 === 0 ? "el-tl__item--odd" : "el-tl__item--even"}`}>
            <span className="el-tl__marker" aria-hidden="true">
              {marker === "number" ? <span className="el-tl__num">{i + 1}</span> : marker === "icon" ? <ElementIcon name={item?.icon || "circle"} size={18} /> : null}
            </span>
            <div className="el-tl__card">
              {item?.label && <p className="el-tl__label">{item.label}</p>}
              {item?.title && <p className="el-tl__title">{item.title}</p>}
              {item?.text && <p className="el-tl__text">{item.text}</p>}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

const TimelineInner = {
  label: "Cronologia / Passos",
  fields: {
    items: {
      type: "array",
      label: "Passos",
      getItemSummary: (item, i) => item?.title || item?.label || `Passo ${i + 1}`,
      defaultItemProps: { label: "Passo", title: "Novo passo", text: "Descrição deste passo.", icon: "circle-check" },
      arrayFields: {
        label: { type: "text", label: "Etiqueta (data ou \"Passo 1\")" },
        title: { type: "text", label: "Título" },
        text: { type: "textarea", label: "Texto" },
        icon: iconField("Ícone"),
      },
    },
    layout: buttonsField("Disposição", [
      { label: "Vertical", value: "vertical" },
      { label: "Alternada", value: "alternate", title: "Em zig-zag; fica vertical em telemóvel" },
      { label: "Horizontal", value: "horizontal", title: "Passos lado a lado; fica vertical em telemóvel" },
    ]),
    markerType: buttonsField("Marcadores", [
      { label: "Ícones", value: "icon" },
      { label: "Números", value: "number" },
      { label: "Ponto", value: "dot" },
    ]),
    showCard: switchField("Conteúdo dentro de um cartão"),
    itemGap: sliderField("Espaço entre passos", { min: 0, max: 80, suffix: "px" }),
    lineColor: colorField("Cor da linha", { section: "Cronologia" }),
    markerColor: colorField("Cor do marcador", { section: "Cronologia" }),
    markerTextColor: colorField("Cor do ícone / número", { section: "Cronologia" }),
    cardBackground: colorField("Fundo do cartão", { section: "Cronologia" }),
    labelColor: colorField("Cor da etiqueta", { section: "Cronologia" }),
    titleColor: colorField("Cor do título", { section: "Cronologia" }),
  },
  defaultProps: {
    items: [
      { label: "Passo 1", title: "Avaliação inicial", text: "Recolha da história clínica e medições de base.", icon: "clipboard-list" },
      { label: "Passo 2", title: "Plano personalizado", text: "Definição de objetivos realistas em conjunto com o doente.", icon: "target" },
      { label: "Passo 3", title: "Acompanhamento", text: "Consultas regulares para ajustar o plano e manter a motivação.", icon: "calendar-check" },
      { label: "Passo 4", title: "Manutenção", text: "Estratégias para manter os resultados a longo prazo.", icon: "trophy" },
    ],
    layout: "vertical",
    markerType: "icon",
    showCard: true,
    itemGap: 24,
    lineColor: "#e5e7eb",
    markerColor: "var(--brand-primary)",
    markerTextColor: "#ffffff",
    cardBackground: "#f8f9fb",
    labelColor: "var(--brand-primary)",
  },
  render: (props) => <TimelineView {...props} />,
};

const Timeline = withTabs(withStyle(TimelineInner, { typography: true }), {
  containerKeys: ["layout", "markerType", "showCard", "itemGap"],
  styleKeys: ["lineColor", "markerColor", "markerTextColor", "cardBackground", "labelColor", "titleColor"],
});

export default Timeline;
