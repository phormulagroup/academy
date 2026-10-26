import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, headingField, iconField, linkField, mediaField, responsive, selectField, sliderField, switchField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import { mediaAlt, mediaSrc } from "../../core/helpers";
import { ShapeDivider, SHAPE_OPTIONS } from "../../core/shapes";
import { ElButton, BUTTON_SIZES, BUTTON_VARIANTS } from "../button";
import { ASPECT_RATIOS } from "../image";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const TITLE_SIZES = [
  { value: "xxxl", label: "XXXL · 72px" },
  { value: "xxl", label: "XXL · 56px" },
  { value: "xl", label: "XL · 44px" },
  { value: "l", label: "L · 34px" },
  { value: "m", label: "M · 26px" },
];

const TITLE_TAGS = [
  { label: "H1", value: "h1" },
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "Div", value: "div" },
];

// Modo da imagem. Dados antigos guardavam-no em `image.mode` (inline |
// background | custom); "custom" era uma zona livre (slot) que deixou de
// existir — mostra-se a imagem ao lado se houver URL, senão nada.
function resolveImageMode(imageMode, image) {
  if (imageMode) return imageMode;
  const legacy = image?.mode;
  if (legacy === "inline" || legacy === "background") return legacy;
  return image?.url ? "inline" : "none";
}

function HeroView(props) {
  const {
    id,
    eyebrow,
    title,
    description,
    buttons,
    buttonSize,
    image,
    imageMode,
    align,
    verticalAlign,
    minHeight,
    contentWidth,
    imageSide,
    imageRatio,
    gap,
    titleTag,
    titleSize,
    padding,
    onDark,
    eyebrowColor,
    titleColor,
    descriptionColor,
    imageRadius,
    shapeBottom,
    shapeBottomColor,
    shapeBottomHeight,
    shapeBottomFlip,
    style,
    puck,
  } = props;
  const isEditing = puck?.isEditing;
  const isLegacy = imageMode === undefined;
  const a = ["left", "center", "right"].includes(align) ? align : "left";
  let mode = resolveImageMode(imageMode, image);
  // O Hero antigo nunca mostrava a imagem ao lado quando centrado.
  if (isLegacy && a === "center" && mode === "inline") mode = "none";
  const src = mode !== "none" ? mediaSrc(image) : undefined;
  const showMedia = mode === "inline" && !!src;
  const showBg = mode === "background" && !!src;
  const list = Array.isArray(buttons) ? buttons.filter(Boolean) : [];

  const S = `[data-style-id="${id}"]`;
  const hero = `${S} .el-hero`;
  const css = [
    responsiveRules(hero, (d) => ({ minHeight: unitToCss(own(minHeight, d)) })),
    verticalAlign ? rule(hero, { justifyContent: verticalAlign }) : "",
    responsiveRules(`${hero} .el-hero__inner`, (d) => {
      const g = own(gap, d);
      return { maxWidth: unitToCss(own(contentWidth, d)), gap: typeof g === "number" ? `${g}px` : undefined };
    }),
    // `padding` em texto ("64px") era o campo antigo — só se aplica se o
    // separador Estilo não tiver padding definido.
    typeof padding === "string" && padding.trim() && !style?.padding ? rule(hero, { paddingTop: padding.trim(), paddingBottom: padding.trim() }) : "",
    eyebrowColor ? rule(`${hero} .el-hero__eyebrow`, { color: `${eyebrowColor} !important` }) : "",
    titleColor ? rule(`${hero} .el-hero__title`, { color: `${titleColor} !important` }) : "",
    descriptionColor ? rule(`${hero} .el-hero__desc`, { color: `${descriptionColor} !important`, opacity: "1" }) : "",
    typeof imageRadius === "number" ? rule(`${hero} .el-hero__media img`, { borderRadius: `${imageRadius}px` }) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const Tag = TITLE_TAGS.some((t) => t.value === titleTag) ? titleTag : "h1";
  const cls = [
    "el-hero",
    `el-hero--${a}`,
    showMedia ? `el-hero--media-${imageSide === "left" ? "left" : "right"}` : "el-hero--no-media",
    onDark ? "el-hero--on-dark" : "",
    shapeBottom ? "el-hero--has-shape" : "",
    // Sem nada no separador Estilo = Hero antigo: mantém o gradiente claro
    // que vinha do CSS do bloco original.
    style === undefined || style === null ? "el-hero--legacy" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls}>
      {css && <style>{css}</style>}
      {showBg && (
        <div className="el-hero__bg" aria-hidden="true">
          <img src={src} alt="" />
        </div>
      )}
      {/* Véu claro do Hero antigo em modo "fundo" (os novos usam a
          sobreposição do separador Estilo). */}
      {showBg && isLegacy && !style?.overlayColor && <div className={`el-hero__legacy-veil el-hero__legacy-veil--${a}`} aria-hidden="true" />}

      <div className="el-hero__inner">
        <div className="el-hero__content">
          {eyebrow && <div className="el-hero__eyebrow">{eyebrow}</div>}
          {title && <Tag className={`el-heading el-heading--${titleSize || "xxl"} el-hero__title`}>{title}</Tag>}
          {description && <div className="el-prose el-hero__desc">{description}</div>}
          {list.length > 0 && (
            <div className="el-hero__actions">
              {list.map((b, i) => (
                <ElButton
                  key={i}
                  label={b.label}
                  link={b.link ?? b.href}
                  variant={b.variant || (i === 0 ? "primary" : "outline")}
                  size={buttonSize || "lg"}
                  icon={b.icon}
                  iconPosition={b.iconPosition}
                  isEditing={isEditing}
                  className={onDark ? "el-hero__btn--on-dark" : ""}
                />
              ))}
            </div>
          )}
        </div>

        {showMedia && (
          <div className="el-hero__media" style={{ aspectRatio: imageRatio || undefined }}>
            <img src={src} alt={mediaAlt(image)} />
          </div>
        )}
        {isEditing && mode === "inline" && !src && <div className="el-hero__media el-hero__media--empty">Escolha uma imagem</div>}
      </div>

      {shapeBottom && <ShapeDivider position="bottom" shape={shapeBottom} color={shapeBottomColor || "#ffffff"} height={shapeBottomHeight || 60} flip={shapeBottomFlip} />}
    </section>
  );
}

const HeroInner = {
  label: "Hero",
  fields: {
    eyebrow: { type: "text", label: "Antetítulo", contentEditable: true },
    title: { type: "textarea", label: "Título", contentEditable: true },
    description: {
      type: "richtext",
      label: "Descrição",
      contentEditable: true,
      options: { heading: false, textAlign: false },
    },
    buttons: {
      type: "array",
      label: "Botões",
      max: 3,
      getItemSummary: (item, i) => item?.label || `Botão ${(i ?? 0) + 1}`,
      arrayFields: {
        label: { type: "text", label: "Texto" },
        link: linkField("Link"),
        variant: selectField("Estilo", BUTTON_VARIANTS),
        icon: iconField("Ícone"),
      },
      defaultItemProps: { label: "Botão", link: { url: "#" }, variant: "outline" },
    },
    buttonSize: buttonsField("Tamanho dos botões", BUTTON_SIZES),
    image: mediaField("Imagem", { withAlt: true }),
    imageMode: buttonsField("Mostrar imagem", [
      { label: "Ao lado do texto", value: "inline" },
      { label: "Como fundo", value: "background" },
      { label: "Não", value: "none" },
    ]),

    align: buttonsField("Alinhamento do texto", [
      { label: "Esquerda", value: "left" },
      { label: "Centro", value: "center" },
      { label: "Direita", value: "right" },
    ]),
    verticalAlign: buttonsField("Alinhamento vertical", [
      { label: "Topo", value: "flex-start" },
      { label: "Centro", value: "center" },
      { label: "Fundo", value: "flex-end" },
    ]),
    minHeight: responsive(unitField("Altura mínima", { units: ["px", "vh"], maxByUnit: { px: 1200, vh: 100 } })),
    contentWidth: responsive(unitField("Largura do conteúdo", { units: ["px", "%"] })),
    gap: responsive(sliderField("Espaço entre texto e imagem", { min: 0, max: 160, suffix: "px" })),
    imageSide: buttonsField(
      "Lado da imagem",
      [
        { label: "Esquerda", value: "left" },
        { label: "Direita", value: "right" },
      ],
    ),
    // Sem showIf: no separador Layout só se veem os valores do próprio
    // separador, não o "Mostrar imagem" (que é um campo de conteúdo).
    imageRatio: selectField("Proporção da imagem", ASPECT_RATIOS),
    titleTag: selectField("Etiqueta HTML do título", TITLE_TAGS),
    titleSize: selectField("Tamanho do título", TITLE_SIZES),

    onDark: switchField("Fundo escuro (texto e botões claros)"),
    eyebrowColor: colorField("Cor do antetítulo"),
    titleColor: colorField("Cor do título"),
    descriptionColor: colorField("Cor da descrição"),
    imageRadius: sliderField("Raio da imagem", { min: 0, max: 80, suffix: "px" }),
    shapeHeading: headingField("Separador de forma (fundo)"),
    shapeBottom: selectField("Forma", SHAPE_OPTIONS),
    shapeBottomColor: colorField("Cor da forma", { showIf: (p) => !!get(p, "shapeBottom") }),
    shapeBottomHeight: sliderField("Altura da forma", { min: 10, max: 300, suffix: "px", showIf: (p) => !!get(p, "shapeBottom") }),
    shapeBottomFlip: switchField("Inverter a forma", { showIf: (p) => !!get(p, "shapeBottom") }),
  },
  defaultProps: {
    eyebrow: "Formação certificada",
    title: "Aprenda ao seu ritmo, com especialistas",
    description: "<p>Cursos online pensados para profissionais de saúde, com conteúdos práticos e certificado no final.</p>",
    buttons: [
      { label: "Ver cursos", link: { url: "/cursos" }, variant: "primary" },
      { label: "Saber mais", link: { url: "#" }, variant: "outline" },
    ],
    buttonSize: "md", // = altura dos botões do tema
    imageMode: "inline",
    align: "left",
    verticalAlign: "center",
    minHeight: { desktop: { value: 520, unit: "px" } },
    contentWidth: { desktop: { value: 1400, unit: "px" } },
    gap: { desktop: 56, mobile: 32 },
    imageSide: "right",
    imageRatio: "4/3",
    titleTag: "h2",
    titleSize: "xxl",
    imageRadius: 20,
    shapeBottomHeight: 60,
    style: {
      gradient: { enabled: true, from: "#ffffff", to: "#f2f5fb", angle: 180 },
      padding: { desktop: { top: 80, right: 24, bottom: 80, left: 24, unit: "px" }, mobile: { top: 48, right: 16, bottom: 48, left: 16, unit: "px" } },
    },
  },
  render: (p) => <HeroView {...p} />,
};

const CONTAINER_KEYS = ["align", "verticalAlign", "minHeight", "contentWidth", "gap", "imageSide", "imageRatio", "titleTag", "titleSize"];
const STYLE_KEYS = [
  "onDark",
  "eyebrowColor",
  "titleColor",
  "descriptionColor",
  "imageRadius",
  "shapeHeading",
  "shapeBottom",
  "shapeBottomColor",
  "shapeBottomHeight",
  "shapeBottomFlip",
];

// Estilo (fundo, imagem de fundo, sobreposição, padding…) aplica-se à
// própria <section>, para a sobreposição ficar entre o fundo e o texto.
const Hero = withTabs(withStyle(HeroInner, { typography: true, target: " .el-hero" }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default Hero;
