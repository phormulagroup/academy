import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, iconField, selectField, switchField } from "../../core/fields";
import { rule } from "../../core/css";
import ElementIcon from "../../core/icon";
import "./styles.css";

// Cada tipo traz o ícone e a cor de destaque; fundo e cor do título são
// derivados da cor de destaque em CSS (color-mix), por isso uma cor
// personalizada em "Estilo" refaz o esquema inteiro de forma coerente.
const CALLOUT_TYPES = {
  note: { label: "Nota", icon: "notebook-pen" },
  info: { label: "Informação", icon: "info" },
  tip: { label: "Dica", icon: "lightbulb" },
  warning: { label: "Aviso", icon: "triangle-alert" },
  danger: { label: "Perigo", icon: "octagon-alert" },
  success: { label: "Sucesso", icon: "circle-check" },
};

function CalloutView({ id, type, title, content, showIcon, icon, variant, accentColor, backgroundColor, titleColor, textColor, iconColor }) {
  const t = CALLOUT_TYPES[type] ? type : "info";
  const v = ["filled", "outline", "sidebar"].includes(variant) ? variant : "filled";
  const iconName = icon || CALLOUT_TYPES[t].icon;

  const css = rule(`[data-style-id="${id}"] .el-callout`, {
    "--el-callout-accent": accentColor,
    "--el-callout-bg": backgroundColor,
    "--el-callout-title": titleColor,
    "--el-callout-text": textColor,
    "--el-callout-icon": iconColor,
  });

  return (
    <>
      {css && <style>{css}</style>}
      <div className={`el-callout el-callout--${t} el-callout--${v}`} role="note" aria-label={title ? undefined : CALLOUT_TYPES[t].label}>
        {showIcon !== false && (
          <span className="el-callout__icon">
            <ElementIcon name={iconName} size={22} />
          </span>
        )}
        <div className="el-callout__body">
          {title && <p className="el-callout__title">{title}</p>}
          {content && <div className="el-callout__content el-prose">{content}</div>}
        </div>
      </div>
    </>
  );
}

const CalloutInner = {
  label: "Caixa de destaque",
  fields: {
    type: selectField(
      "Tipo",
      Object.entries(CALLOUT_TYPES).map(([value, t]) => ({ label: t.label, value })),
    ),
    variant: buttonsField("Estilo", [
      { label: "Preenchido", value: "filled" },
      { label: "Contorno", value: "outline" },
      { label: "Barra lateral", value: "sidebar" },
    ]),
    title: { type: "text", label: "Título", contentEditable: true },
    content: { type: "richtext", label: "Conteúdo", contentEditable: true },
    showIcon: switchField("Mostrar ícone"),
    icon: iconField("Ícone personalizado", { showIf: (p) => p.showIcon !== false }),
    accentColor: colorField("Cor de destaque", { section: "Cores da caixa" }),
    backgroundColor: colorField("Cor de fundo da caixa", { section: "Cores da caixa" }),
    titleColor: colorField("Cor do título", { section: "Cores da caixa" }),
    textColor: colorField("Cor do texto", { section: "Cores da caixa" }),
    iconColor: colorField("Cor do ícone", { section: "Cores da caixa" }),
  },
  defaultProps: {
    type: "tip",
    variant: "filled",
    title: "Dica",
    content: "<p>Reveja os conceitos-chave antes de avançar para o teste do módulo.</p>",
    showIcon: true,
  },
  render: (props) => <CalloutView {...props} />,
};

// O estilo visual (padding, borda, sombra…) aplica-se à própria caixa, para
// o padding de "Estilo" substituir o padding por omissão em vez de somar.
const Callout = withTabs(withStyle(CalloutInner, { typography: true, target: " .el-callout", exclude: ["color", "background"] }), {
  styleKeys: ["accentColor", "backgroundColor", "titleColor", "textColor", "iconColor"],
});

export default Callout;
