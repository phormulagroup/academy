import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, iconField, linkField, responsive, selectField, switchField } from "../../core/fields";
import { responsiveRules, own } from "../../core/css";
import { linkProps } from "../../core/helpers";
import ElementIcon from "../../core/icon";

export const BUTTON_VARIANTS = [
  { label: "Principal (cor da marca)", value: "primary" },
  { label: "Secundário", value: "secondary" },
  { label: "Contorno", value: "outline" },
  { label: "Claro (para fundos escuros)", value: "light" },
  { label: "Só texto (link)", value: "link" },
];

// Como os botões da app: pequeno, normal (= altura do tema, ver
// theme/antdTheme.jsx BUTTON_HEIGHT) e grande. "xl" (antigo) = grande.
export const BUTTON_SIZES = [
  { label: "Pequeno", value: "sm" },
  { label: "Normal", value: "md" },
  { label: "Grande", value: "lg" },
];

// Usado também por Hero/CTA/Preços — um único botão com o mesmo visual em
// todo o lado.
export function ElButton({ label, link, variant = "primary", size = "md", icon, iconPosition = "before", isEditing, className = "", style }) {
  const lp = linkProps(link, isEditing) || (isEditing ? { href: "#", tabIndex: -1, onClick: (e) => e.preventDefault() } : null);
  const v = variant === "default" ? "outline" : variant; // valor antigo
  const content = (
    <>
      {icon && iconPosition !== "after" && <ElementIcon name={icon} size="1.1em" />}
      {label && <span>{label}</span>}
      {icon && iconPosition === "after" && <ElementIcon name={icon} size="1.1em" />}
    </>
  );
  const cls = `el-button el-button--${v || "primary"} el-button--${size || "md"} ${className}`.trim();
  if (!lp) {
    return (
      <span className={cls} style={style}>
        {content}
      </span>
    );
  }
  return (
    <a className={cls} style={style} {...lp}>
      {content}
    </a>
  );
}

const ButtonInner = {
  label: "Botão",
  fields: {
    label: { type: "text", label: "Texto", placeholder: "Texto do botão", contentEditable: true },
    link: linkField("Link"),
    variant: selectField("Estilo", BUTTON_VARIANTS),
    size: buttonsField("Tamanho", BUTTON_SIZES),
    icon: iconField("Ícone"),
    iconPosition: buttonsField(
      "Posição do ícone",
      [
        { label: "Antes", value: "before" },
        { label: "Depois", value: "after" },
      ],
      { showIf: (p) => !!p.icon },
    ),
    align: responsive(alignField("Alinhamento", { justify: true })),
    fullWidth: switchField("Largura total"),
  },
  defaultProps: {
    label: "Botão",
    link: { url: "#" },
    variant: "primary",
    size: "md",
    align: { desktop: "left" },
  },
  // `href` (string) era o campo antigo — continua a funcionar.
  render: ({ id, label, link, href, variant, size, icon, iconPosition, align, fullWidth, puck }) => {
    const sel = `[data-style-id="${id}"]`;
    const css = [
      responsiveRules(sel, (d) => {
        const a = own(align, d);
        return { textAlign: a && a !== "justify" ? a : undefined };
      }),
      responsiveRules(`${sel} .el-button`, (d) => (own(align, d) === "justify" ? { width: "100%" } : {})),
      fullWidth ? `${sel} .el-button{width:100%}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return (
      <>
        {css && <style>{css}</style>}
        <ElButton label={label} link={link ?? href} variant={variant} size={size} icon={icon} iconPosition={iconPosition} isEditing={puck?.isEditing} />
      </>
    );
  },
};

// O estilo visual (fundo, borda, padding, hover…) aplica-se ao próprio
// botão; margem/dimensões ficam no invólucro.
const Button = withTabs(withStyle(ButtonInner, { typography: true, target: " .el-button" }));

export default Button;
