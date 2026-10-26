import { useRef, useState } from "react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, iconField, sliderField } from "../../core/fields";
import { rule } from "../../core/css";
import ElementIcon from "../../core/icon";
import { createDropSlot } from "../../components/dropSlot";
import "./styles.css";

// Ids do Puck podem ter caracteres que não servem num atributo id/aria.
const domId = (id) => String(id || "el").replace(/[^a-zA-Z0-9_-]/g, "");

// Blocks dropped inside a tab. Older data has no `blocks` — nothing to render
// (but in the editor an empty slot shows the drop area).
function ItemSlot({ slot: Slot, isEditing, label }) {
  if (typeof Slot !== "function") return null;
  return <Slot as={createDropSlot(isEditing, `Arraste blocos para «${label || "este separador"}»`)} minEmptyHeight={isEditing ? 60 : undefined} disallow={["Hero", "Stats"]} />;
}

function TabsView({ id, items, orientation, tabAlign, tabStyle, tabColor, activeColor, indicatorColor, contentBackground, borderColor, contentPadding, puck }) {
  const list = Array.isArray(items) ? items : [];
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);
  const base = `el-tabs-${domId(id)}`;
  const vertical = orientation === "vertical";

  // Ao apagar separadores no editor, o índice ativo pode deixar de existir.
  const current = Math.min(active, Math.max(list.length - 1, 0));

  if (list.length === 0) {
    return puck?.isEditing ? <div style={{ padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" }}>Adicione separadores</div> : null;
  }

  const focusTab = (i) => {
    const n = (i + list.length) % list.length;
    setActive(n);
    tabRefs.current[n]?.focus();
  };

  // Navegação por teclado do padrão WAI-ARIA "tabs" (setas + Home/End).
  const onKeyDown = (e, i) => {
    const next = vertical ? ["ArrowDown", "ArrowRight"] : ["ArrowRight"];
    const prev = vertical ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft"];
    if (next.includes(e.key)) focusTab(i + 1);
    else if (prev.includes(e.key)) focusTab(i - 1);
    else if (e.key === "Home") focusTab(0);
    else if (e.key === "End") focusTab(list.length - 1);
    else return;
    e.preventDefault();
  };

  const sel = `[data-style-id="${id}"] .el-tabs`;
  const css = rule(sel, {
    "--el-tabs-color": tabColor,
    "--el-tabs-active": activeColor,
    "--el-tabs-indicator": indicatorColor,
    "--el-tabs-content-bg": contentBackground,
    "--el-tabs-border": borderColor,
    "--el-tabs-padding": contentPadding !== undefined && contentPadding !== null ? `${contentPadding}px` : undefined,
  });

  const classes = ["el-tabs", vertical ? "el-tabs--vertical" : "el-tabs--horizontal", `el-tabs--align-${tabAlign || "start"}`, `el-tabs--${tabStyle || "line"}`].join(" ");

  return (
    <div className={classes}>
      {css && <style>{css}</style>}
      <div className="el-tabs__list" role="tablist" aria-orientation={vertical ? "vertical" : "horizontal"}>
        {list.map((item, i) => (
          <button
            key={i}
            ref={(el) => (tabRefs.current[i] = el)}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-selected={i === current}
            aria-controls={`${base}-panel-${i}`}
            tabIndex={i === current ? 0 : -1}
            className={`el-tabs__tab${i === current ? " el-tabs__tab--active" : ""}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {item?.icon && <ElementIcon name={item.icon} size="1.1em" />}
            <span>{item?.title || `Separador ${i + 1}`}</span>
          </button>
        ))}
      </div>
      <div className="el-tabs__panels">
        {list.map((item, i) => (
          <div key={i} role="tabpanel" id={`${base}-panel-${i}`} aria-labelledby={`${base}-tab-${i}`} hidden={i !== current} tabIndex={0} className="el-tabs__panel">
            <div className="el-prose">{item?.content}</div>
            <ItemSlot slot={item?.blocks} isEditing={puck?.isEditing} label={item?.title} />
          </div>
        ))}
      </div>
    </div>
  );
}

const TabsInner = {
  label: "Separadores",
  fields: {
    items: {
      type: "array",
      label: "Separadores",
      getItemSummary: (item, i) => item?.title || `Separador ${i + 1}`,
      defaultItemProps: {
        title: "Novo separador",
        content: "<p>Conteúdo do separador.</p>",
        blocks: [],
      },
      arrayFields: {
        title: { type: "text", label: "Título" },
        icon: iconField("Ícone"),
        content: { type: "richtext", label: "Texto" },
        // Reusable section (Website > Modelos) shown below the text.
        // Other blocks (e.g. Listagem dinâmica) inside the item, below the text.
        blocks: { type: "slot" },
      },
    },
    orientation: buttonsField("Orientação", [
      { label: "Horizontal", value: "horizontal" },
      { label: "Vertical", value: "vertical" },
    ]),
    tabAlign: buttonsField("Alinhamento dos separadores", [
      { label: "Início", value: "start" },
      { label: "Centro", value: "center" },
      { label: "Fim", value: "end" },
      { label: "Justificar", value: "justify" },
    ]),
    tabStyle: buttonsField("Estilo dos separadores", [
      { label: "Linha", value: "line" },
      { label: "Caixa", value: "boxed" },
      { label: "Pílula", value: "pills" },
    ]),
    contentPadding: sliderField("Espaço interno do conteúdo", { min: 0, max: 80, suffix: "px" }),
    tabColor: colorField("Cor do texto dos separadores", { section: "Separadores" }),
    activeColor: colorField("Cor do separador ativo", { section: "Separadores" }),
    indicatorColor: colorField("Cor do indicador / fundo ativo", { section: "Separadores" }),
    contentBackground: colorField("Fundo do conteúdo", { section: "Separadores" }),
    borderColor: colorField("Cor da borda", { section: "Separadores" }),
  },
  defaultProps: {
    items: [
      {
        title: "Visão geral",
        icon: "book-open",
        content: "<p>Neste módulo vai conhecer os conceitos fundamentais e o enquadramento do tema.</p>",
      },
      {
        title: "Objetivos",
        icon: "target",
        content: "<ul><li>Compreender os princípios essenciais</li><li>Aplicar o conhecimento na prática clínica</li></ul>",
      },
      {
        title: "Recursos",
        icon: "paperclip",
        content: "<p>Consulte os materiais de apoio disponíveis no final da lição.</p>",
      },
    ],
    orientation: "horizontal",
    tabAlign: "start",
    tabStyle: "line",
    contentPadding: 20,
    tabColor: "#4b5563",
    activeColor: "var(--brand-primary)",
    indicatorColor: "var(--brand-primary)",
    borderColor: "#e5e7eb",
  },
  render: (props) => <TabsView {...props} />,
};

const Tabs = withTabs(withStyle(TabsInner), {
  containerKeys: ["orientation", "tabAlign", "tabStyle", "contentPadding"],
  styleKeys: ["tabColor", "activeColor", "indicatorColor", "contentBackground", "borderColor"],
});

export default Tabs;
