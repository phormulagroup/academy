import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, iconField, selectField, sliderField, switchField } from "../../core/fields";
import { rule } from "../../core/css";
import ElementIcon from "../../core/icon";
import { createDropSlot } from "../../components/dropSlot";
import "./styles.css";

const domId = (id) => String(id || "el").replace(/[^a-zA-Z0-9_-]/g, "");

const TITLE_TAGS = [
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "H4", value: "h4" },
  { label: "H5", value: "h5" },
  { label: "H6", value: "h6" },
  { label: "Div (sem título)", value: "div" },
];

const initialOpen = (openFirst, count) => (openFirst && count > 0 ? [0] : []);

// Blocks dropped inside an item (older data has none).
function ItemSlot({ slot: Slot, isEditing, label }) {
  if (typeof Slot !== "function") return null;
  return <Slot as={createDropSlot(isEditing, `Arraste blocos para «${label || "este item"}»`)} minEmptyHeight={isEditing ? 60 : undefined} disallow={["Hero", "Stats"]} />;
}

function AccordionView({
  id,
  items,
  openFirst,
  multiple,
  iconStyle,
  iconPosition,
  titleTag,
  titleColor,
  titleBackground,
  activeTitleColor,
  activeTitleBackground,
  contentBackground,
  borderColor,
  radius,
  itemGap,
  puck,
}) {
  const list = Array.isArray(items) ? items : [];
  const [open, setOpen] = useState(() => initialOpen(openFirst, list.length));
  const headerRefs = useRef([]);
  const base = `el-acc-${domId(id)}`;

  // No editor, mudar "Primeiro aberto" ou passar de vários para um de cada
  // vez repõe o estado (ajuste durante o render, como recomenda o React,
  // em vez de um efeito que desenhava primeiro o estado errado).
  const [prev, setPrev] = useState({ openFirst, multiple });
  if (prev.openFirst !== openFirst || prev.multiple !== multiple) {
    setPrev({ openFirst, multiple });
    setOpen(prev.openFirst !== openFirst ? initialOpen(openFirst, list.length) : open.slice(0, 1));
  }

  if (list.length === 0) {
    return puck?.isEditing ? <div style={{ padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" }}>Adicione itens</div> : null;
  }

  const toggle = (i) => {
    setOpen((o) => {
      if (o.includes(i)) return o.filter((n) => n !== i);
      return multiple ? [...o, i] : [i];
    });
  };

  const onKeyDown = (e, i) => {
    const go = (n) => headerRefs.current[(n + list.length) % list.length]?.focus();
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else return;
    e.preventDefault();
  };

  const sel = `[data-style-id="${id}"] .el-acc`;
  const css = rule(sel, {
    "--el-acc-title": titleColor,
    "--el-acc-title-bg": titleBackground,
    "--el-acc-active": activeTitleColor,
    "--el-acc-active-bg": activeTitleBackground,
    "--el-acc-content-bg": contentBackground,
    "--el-acc-border": borderColor,
    "--el-acc-radius": radius !== undefined && radius !== null ? `${radius}px` : undefined,
    "--el-acc-gap": itemGap !== undefined && itemGap !== null ? `${itemGap}px` : undefined,
  });

  // Dados antigos (antes destas opções) não têm titleTag: "div" mantém o
  // aspeto e não acrescenta títulos novos ao Índice das lições já feitas.
  const Tag = TITLE_TAGS.some((t) => t.value === titleTag) ? titleTag : "div";
  const iconLeft = iconPosition === "left";

  return (
    <div className={`el-acc el-acc--icon-${iconLeft ? "left" : "right"}`}>
      {css && <style>{css}</style>}
      {list.map((item, i) => {
        const isOpen = open.includes(i);
        const headerId = `${base}-h-${i}`;
        const panelId = `${base}-p-${i}`;
        const marker =
          iconStyle === "plus" ? (
            <span className="el-acc__plus" aria-hidden="true" />
          ) : (
            <ChevronDown className="el-acc__chevron" size={18} aria-hidden="true" />
          );
        return (
          <div key={i} className={`el-acc__item${isOpen ? " el-acc__item--open" : ""}`}>
            <Tag className="el-acc__heading">
              <button
                ref={(el) => (headerRefs.current[i] = el)}
                type="button"
                id={headerId}
                className="el-acc__header"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                {iconLeft && marker}
                {item?.icon && <ElementIcon name={item.icon} size="1.1em" />}
                <span className="el-acc__title">{item?.title || `Item ${i + 1}`}</span>
                {!iconLeft && marker}
              </button>
            </Tag>
            <div id={panelId} role="region" aria-labelledby={headerId} className="el-acc__panel">
              <div className="el-acc__panel-inner">
                <div className="el-acc__body el-prose">
                  {item?.content}
                  <ItemSlot slot={item?.blocks} isEditing={puck?.isEditing} label={item?.title} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const AccordionInner = {
  label: "Acordeão",
  fields: {
    items: {
      type: "array",
      label: "Itens",
      getItemSummary: (item, i) => item?.title || `Item ${i + 1}`,
      defaultItemProps: {
        title: "Pergunta",
        content: "<p>Resposta</p>",
        blocks: [],
      },
      arrayFields: {
        title: { type: "text", label: "Título" },
        icon: iconField("Ícone (opcional)"),
        content: { type: "richtext", label: "Texto" },
        // Reusable section (Website > Modelos) shown below the text.
        // Other blocks (e.g. Listagem dinâmica) inside the item, below the text.
        blocks: { type: "slot" },
      },
    },
    openFirst: switchField("Primeiro item aberto"),
    multiple: switchField("Permitir vários abertos ao mesmo tempo"),
    iconStyle: buttonsField("Ícone de abrir/fechar", [
      { label: "Seta", value: "chevron" },
      { label: "Mais / menos", value: "plus" },
    ]),
    iconPosition: buttonsField("Posição do ícone", [
      { label: "Esquerda", value: "left" },
      { label: "Direita", value: "right" },
    ]),
    titleTag: selectField("Etiqueta HTML do título", TITLE_TAGS),
    titleColor: colorField("Cor do título", { section: "Itens" }),
    titleBackground: colorField("Fundo do título", { section: "Itens" }),
    activeTitleColor: colorField("Cor do título aberto", { section: "Itens" }),
    activeTitleBackground: colorField("Fundo do título aberto", { section: "Itens" }),
    contentBackground: colorField("Fundo do conteúdo", { section: "Itens" }),
    borderColor: colorField("Cor da borda", { section: "Itens" }),
    radius: sliderField("Raio dos cantos", { min: 0, max: 32, suffix: "px", section: "Itens" }),
    itemGap: sliderField("Espaço entre itens", { min: 0, max: 48, suffix: "px", section: "Itens" }),
  },
  defaultProps: {
    items: [
      {
        title: "O que vou aprender neste curso?",
        content: "<p>Vai adquirir uma visão prática e atualizada do tema, com casos clínicos e materiais de apoio.</p>",
      },
      {
        title: "Quanto tempo demora cada módulo?",
        content: "<p>Cada módulo tem cerca de 30 minutos e pode ser feito ao seu ritmo.</p>",
      },
      {
        title: "Recebo um certificado no fim?",
        content: "<p>Sim. Ao concluir todos os módulos e testes, o certificado fica disponível na sua área de utilizador.</p>",
      },
    ],
    openFirst: true,
    multiple: false,
    iconStyle: "chevron",
    iconPosition: "right",
    titleTag: "h3",
    activeTitleColor: "var(--brand-primary)",
    borderColor: "#e5e7eb",
    radius: 8,
    itemGap: 8,
  },
  render: (props) => <AccordionView {...props} />,
};

const Accordion = withTabs(withStyle(AccordionInner), {
  containerKeys: ["openFirst", "multiple", "iconStyle", "iconPosition", "titleTag"],
  styleKeys: ["titleColor", "titleBackground", "activeTitleColor", "activeTitleBackground", "contentBackground", "borderColor", "radius", "itemGap"],
});

export default Accordion;
