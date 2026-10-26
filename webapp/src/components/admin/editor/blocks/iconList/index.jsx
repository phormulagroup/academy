import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, linkField, responsive, sliderField, switchField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { linkProps } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import "./styles.css";

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" };

function IconListView({ id, items, defaultIcon, layout, align, gap, dividers, iconColor, iconSize, textColor, dividerColor, puck }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return puck?.isEditing ? <div style={{ padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" }}>Adicione itens</div> : null;
  }
  const inline = layout === "inline";
  const g = gap ?? 12;
  const sel = `[data-style-id="${id}"] .el-iconlist`;
  const css = [
    rule(sel, {
      "--el-il-icon": iconColor,
      "--el-il-text": textColor,
      "--el-il-divider": dividerColor,
      "--el-il-gap": `${g}px`,
    }),
    // Alinhamento por dispositivo: em linha justifica os itens; na vertical
    // alinha o conteúdo de cada item.
    responsiveRules(sel, (d) => {
      const a = own(align, d);
      return a ? { "--el-il-justify": JUSTIFY[a] || "flex-start", textAlign: a } : {};
    }),
  ]
    .filter(Boolean)
    .join("\n");
  const size = iconSize || 18;

  return (
    <>
      {css && <style>{css}</style>}
      <ul className={`el-iconlist el-iconlist--${inline ? "inline" : "vertical"}${dividers ? " el-iconlist--dividers" : ""}`}>
        {list.map((item, i) => {
          const lp = linkProps(item?.link, puck?.isEditing);
          const iconName = item?.icon || defaultIcon;
          const body = (
            <>
              {iconName && (
                <span className="el-iconlist__icon" style={{ width: size, height: size }}>
                  <ElementIcon name={iconName} size={size} />
                </span>
              )}
              <span className="el-iconlist__text">{item?.text}</span>
            </>
          );
          return (
            <li key={i} className="el-iconlist__item">
              {lp ? (
                <a className="el-iconlist__link" {...lp}>
                  {body}
                </a>
              ) : (
                <span className="el-iconlist__link">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

const IconListInner = {
  label: "Lista com ícones",
  fields: {
    items: {
      type: "array",
      label: "Itens",
      getItemSummary: (item, i) => (typeof item?.text === "string" && item.text) || `Item ${i + 1}`,
      defaultItemProps: { text: "Novo item" },
      arrayFields: {
        text: { type: "text", label: "Texto", contentEditable: true },
        icon: iconField("Ícone (substitui o predefinido)"),
        link: linkField("Link"),
      },
    },
    defaultIcon: iconField("Ícone predefinido", { allowClear: false }),
    layout: buttonsField("Disposição", [
      { label: "Vertical", value: "vertical" },
      { label: "Em linha", value: "inline" },
    ]),
    align: responsive(alignField()),
    gap: sliderField("Espaço entre itens", { min: 0, max: 60, suffix: "px" }),
    dividers: switchField("Separadores entre itens"),
    iconColor: colorField("Cor do ícone", { section: "Lista" }),
    iconSize: sliderField("Tamanho do ícone", { min: 10, max: 64, suffix: "px", section: "Lista" }),
    textColor: colorField("Cor do texto", { section: "Lista" }),
    dividerColor: colorField("Cor dos separadores", { section: "Lista" }),
  },
  defaultProps: {
    items: [
      { text: "Acesso ilimitado aos conteúdos do curso" },
      { text: "Casos clínicos práticos e interativos" },
      { text: "Certificado de conclusão" },
    ],
    defaultIcon: "circle-check",
    layout: "vertical",
    align: { desktop: "left" },
    gap: 12,
    dividers: false,
    iconColor: "var(--brand-primary)",
    iconSize: 20,
    dividerColor: "#e5e7eb",
  },
  render: (props) => <IconListView {...props} />,
};

const IconList = withTabs(withStyle(IconListInner, { typography: true }), {
  containerKeys: ["layout", "align", "gap", "dividers"],
  styleKeys: ["iconColor", "iconSize", "textColor", "dividerColor"],
});

export default IconList;
