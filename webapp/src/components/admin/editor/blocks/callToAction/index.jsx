import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, linkField, mediaField, responsive, selectField, sliderField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import { mediaAlt, mediaSrc } from "../../core/helpers";
import { ElButton, BUTTON_SIZES, BUTTON_VARIANTS } from "../button";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const TITLE_SIZES = [
  { value: "xxl", label: "XXL · 56px" },
  { value: "xl", label: "XL · 44px" },
  { value: "l", label: "L · 34px" },
  { value: "m", label: "M · 26px" },
  { value: "s", label: "S · 20px" },
];

const TITLE_TAGS = [
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "H4", value: "h4" },
  { label: "Div", value: "div" },
];

function CtaView(props) {
  const {
    id,
    eyebrow,
    title,
    description,
    image,
    buttonLabel,
    buttonLink,
    buttonVariant,
    button2Label,
    button2Link,
    button2Variant,
    buttonSize,
    ctaLayout,
    imageSide,
    contentWidth,
    gap,
    align,
    titleTag,
    titleSize,
    textTheme,
    eyebrowColor,
    titleColor,
    descriptionColor,
    imageRadius,
    puck,
  } = props;
  const isEditing = puck?.isEditing;
  const mode = ["banner", "boxed", "image"].includes(ctaLayout) ? ctaLayout : "banner";
  const onDark = textTheme !== "dark";
  const src = mediaSrc(image);
  const S = `[data-style-id="${id}"]`;
  const box = `${S} .el-cta`;

  const css = [
    responsiveRules(`${box} .el-cta__inner`, (d) => {
      const g = own(gap, d);
      return { gap: typeof g === "number" ? `${g}px` : undefined };
    }),
    mode === "boxed" ? responsiveRules(`${box} .el-cta__inner`, (d) => ({ maxWidth: unitToCss(own(contentWidth, d)) })) : "",
    mode === "boxed" && ["left", "right"].includes(align) ? rule(`${box} .el-cta__inner`, { textAlign: align, alignItems: align === "left" ? "flex-start" : "flex-end" }) : "",
    mode === "boxed" && ["left", "right"].includes(align) ? rule(`${box} .el-cta__actions`, { justifyContent: align === "left" ? "flex-start" : "flex-end" }) : "",
    eyebrowColor ? rule(`${box} .el-cta__eyebrow`, { color: `${eyebrowColor} !important`, opacity: "1" }) : "",
    titleColor ? rule(`${box} .el-cta__title`, { color: `${titleColor} !important` }) : "",
    descriptionColor ? rule(`${box} .el-cta__desc`, { color: `${descriptionColor} !important`, opacity: "1" }) : "",
    typeof imageRadius === "number" ? rule(`${box} .el-cta__media img`, { borderRadius: `${imageRadius}px` }) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const Tag = TITLE_TAGS.some((t) => t.value === titleTag) ? titleTag : "h2";
  // Em fundo escuro, os botões "Contorno"/"Só texto" passam a branco
  // (o contorno da cor da marca desaparecia em cima do gradiente da marca).
  const btnClass = onDark ? "el-cta__btn--on-dark" : "";
  const buttons = (
    <>
      {buttonLabel && <ElButton label={buttonLabel} link={buttonLink} variant={buttonVariant || "light"} size={buttonSize || "lg"} isEditing={isEditing} className={btnClass} />}
      {button2Label && <ElButton label={button2Label} link={button2Link} variant={button2Variant || "outline"} size={buttonSize || "lg"} isEditing={isEditing} className={btnClass} />}
    </>
  );
  const hasButtons = !!(buttonLabel || button2Label);

  const text = (
    <div className="el-cta__content">
      {eyebrow && <div className="el-cta__eyebrow">{eyebrow}</div>}
      {title && <Tag className={`el-heading el-heading--${titleSize || "l"} el-cta__title`}>{title}</Tag>}
      {description && <div className="el-cta__desc">{description}</div>}
      {mode !== "banner" && hasButtons && <div className="el-cta__actions">{buttons}</div>}
    </div>
  );

  return (
    <div className={`el-cta el-cta--${mode}${onDark ? " el-cta--on-dark" : ""}${mode === "image" ? ` el-cta--img-${imageSide === "left" ? "left" : "right"}` : ""}`}>
      {css && <style>{css}</style>}
      <div className="el-cta__inner">
        {text}
        {mode === "banner" && hasButtons && <div className="el-cta__actions">{buttons}</div>}
        {mode === "image" &&
          (src ? (
            <div className="el-cta__media">
              <img src={src} alt={mediaAlt(image)} loading="lazy" />
            </div>
          ) : isEditing ? (
            <div className="el-cta__media el-cta__media--empty">Escolha uma imagem</div>
          ) : null)}
      </div>
    </div>
  );
}

const CallToActionInner = {
  label: "Chamada à ação",
  fields: {
    eyebrow: { type: "text", label: "Antetítulo", contentEditable: true },
    title: { type: "textarea", label: "Título", contentEditable: true },
    description: { type: "textarea", label: "Descrição", contentEditable: true },
    image: mediaField("Imagem", { withAlt: true, showIf: (p) => get(p, "ctaLayout") === "image" }),
    buttonLabel: textField("Botão principal — texto"),
    buttonLink: linkField("Botão principal — link"),
    buttonVariant: selectField("Botão principal — estilo", BUTTON_VARIANTS),
    button2Label: textField("Botão secundário — texto (opcional)"),
    button2Link: linkField("Botão secundário — link", { showIf: (p) => !!get(p, "button2Label") }),
    button2Variant: selectField("Botão secundário — estilo", BUTTON_VARIANTS, { showIf: (p) => !!get(p, "button2Label") }),
    buttonSize: buttonsField("Tamanho dos botões", BUTTON_SIZES),

    // Não pode chamar-se `layout`: é a prop do separador Avançado.
    ctaLayout: buttonsField("Disposição", [
      { label: "Faixa", value: "banner", title: "Texto à esquerda, botões à direita" },
      { label: "Caixa centrada", value: "boxed" },
      { label: "Com imagem", value: "image" },
    ]),
    imageSide: buttonsField(
      "Lado da imagem",
      [
        { label: "Esquerda", value: "left" },
        { label: "Direita", value: "right" },
      ],
      { showIf: (p) => get(p, "ctaLayout") === "image" },
    ),
    contentWidth: responsive(unitField("Largura do conteúdo", { units: ["px", "%"], showIf: (p) => get(p, "ctaLayout") === "boxed" })),
    align: buttonsField(
      "Alinhamento",
      [
        { label: "Esquerda", value: "left" },
        { label: "Centro", value: "center" },
        { label: "Direita", value: "right" },
      ],
      { showIf: (p) => get(p, "ctaLayout") === "boxed" },
    ),
    gap: responsive(sliderField("Espaço entre texto e botões/imagem", { min: 0, max: 120, suffix: "px" })),
    titleTag: selectField("Etiqueta HTML do título", TITLE_TAGS),
    titleSize: selectField("Tamanho do título", TITLE_SIZES),

    textTheme: buttonsField("Fundo", [
      { label: "Escuro (texto claro)", value: "light" },
      { label: "Claro (texto escuro)", value: "dark" },
    ]),
    eyebrowColor: colorField("Cor do antetítulo"),
    titleColor: colorField("Cor do título"),
    descriptionColor: colorField("Cor da descrição"),
    imageRadius: sliderField("Raio da imagem", { min: 0, max: 60, suffix: "px", showIf: (p) => get(p, "ctaLayout") === "image" }),
  },
  defaultProps: {
    eyebrow: "Inscrições abertas",
    title: "Pronto para dar o próximo passo?",
    description: "Junte-se a centenas de profissionais que já estão a aprender connosco.",
    buttonLabel: "Inscrever-me agora",
    buttonLink: { url: "#" },
    buttonVariant: "light",
    button2Label: "",
    button2Variant: "outline",
    buttonSize: "md", // = altura dos botões do tema
    ctaLayout: "banner",
    imageSide: "right",
    contentWidth: { desktop: { value: 760, unit: "px" } },
    align: "center",
    gap: { desktop: 32 },
    titleTag: "h2",
    titleSize: "l",
    textTheme: "light",
    imageRadius: 12,
    style: {
      gradient: { enabled: true, from: "var(--brand-primary)", to: "var(--brand-primary-dark)", angle: 135 },
      color: "#ffffff",
      borderRadius: { topLeft: 16, topRight: 16, bottomRight: 16, bottomLeft: 16, unit: "px", linked: true },
      padding: { desktop: { top: 48, right: 48, bottom: 48, left: 48, unit: "px" }, mobile: { top: 32, right: 20, bottom: 32, left: 20, unit: "px" } },
    },
  },
  render: (p) => <CtaView {...p} />,
};

const CONTAINER_KEYS = ["ctaLayout", "imageSide", "contentWidth", "align", "gap", "titleTag", "titleSize"];
const STYLE_KEYS = ["textTheme", "eyebrowColor", "titleColor", "descriptionColor", "imageRadius"];

// Estilo (gradiente, padding, raio…) aplica-se à própria caixa.
const CallToAction = withTabs(withStyle(CallToActionInner, { typography: true, target: " .el-cta" }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default CallToAction;
