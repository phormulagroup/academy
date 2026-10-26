import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, iconField, linkField, mediaField, responsive, selectField, sliderField, textField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { linkProps, mediaAlt, mediaSrc } from "../../core/helpers";
import { ElButton, BUTTON_SIZES, BUTTON_VARIANTS } from "../button";
import { IconView, iconViewCss, legacyAlign } from "../icon";
import { ASPECT_RATIOS } from "../image";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const TITLE_TAGS = [
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "H4", value: "h4" },
  { label: "Div", value: "div" },
];

const CardInner = {
  label: "Cartão",
  fields: {
    image: mediaField("Imagem (topo, opcional)", { withAlt: true }),
    icon: iconField("Ícone"),
    title: { type: "text", label: "Título", contentEditable: true },
    description: { type: "textarea", label: "Descrição", contentEditable: true },
    link: linkField("Link"),
    buttonLabel: textField("Texto do botão (opcional)", { placeholder: "ex.: Saber mais" }),
    buttonVariant: selectField("Estilo do botão", BUTTON_VARIANTS, { showIf: (p) => !!get(p, "buttonLabel") }),
    buttonSize: buttonsField("Tamanho do botão", BUTTON_SIZES, { showIf: (p) => !!get(p, "buttonLabel") }),

    mode: buttonsField("Aspeto", [
      { label: "Cartão", value: "card" },
      { label: "Simples", value: "flat" },
    ]),
    align: responsive(alignField("Alinhamento")),
    titleTag: selectField("Etiqueta HTML do título", TITLE_TAGS),
    imageRatio: selectField("Proporção da imagem", ASPECT_RATIOS),

    iconShape: buttonsField("Forma do ícone", [
      { label: "Círculo", value: "circle" },
      { label: "Quadrado", value: "rounded" },
      { label: "Sem fundo", value: "none" },
    ]),
    iconSize: responsive(sliderField("Tamanho do ícone", { min: 12, max: 120, suffix: "px" })),
    iconColor: colorField("Cor do ícone"),
    iconBackground: colorField("Fundo do ícone", { showIf: (p) => get(p, "iconShape") !== "none" }),
    titleColor: colorField("Cor do título"),
    descriptionColor: colorField("Cor da descrição"),
  },
  defaultProps: {
    title: "Título",
    description: "Descrição",
    icon: "feather",
    mode: "card",
    titleTag: "h3",
    imageRatio: "16/9",
    iconShape: "circle",
    buttonVariant: "link",
    buttonSize: "md",
  },
  render: ({
    id,
    image,
    icon,
    title,
    description,
    link,
    buttonLabel,
    buttonVariant,
    buttonSize,
    mode,
    align,
    titleTag,
    imageRatio,
    iconShape,
    iconSize,
    iconColor,
    iconBackground,
    titleColor,
    descriptionColor,
    puck,
  }) => {
    const isCard = mode === "card";
    const S = `[data-style-id="${id}"]`;
    const box = `${S} .el-card`;
    // Sem alinhamento escolhido mantém o aspeto antigo: "Simples"
    // centrado, "Cartão" à esquerda.
    const fallbackAlign = isCard ? "left" : "center";
    const src = mediaSrc(image);
    const shape = iconShape || "circle";

    const css = [
      responsiveRules(box, (d) => {
        const a = legacyAlign(own(align, d)) || (d === "desktop" ? fallbackAlign : undefined);
        if (!a) return {};
        return { textAlign: a, "--el-card-align": a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center" };
      }),
      iconViewCss(`${box} .el-iconview`, {
        view: shape === "none" ? "default" : "stacked",
        size: iconSize,
        primary: shape === "none" ? iconColor : iconBackground || "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
        secondary: iconColor || "var(--brand-primary)",
        padding: shape === "none" ? undefined : 0.65,
      }),
      shape === "none" && !iconColor ? rule(`${box} .el-iconview`, { color: "var(--brand-primary)" }) : "",
      titleColor ? rule(`${box} .el-card__title`, { color: `${titleColor} !important` }) : "",
      descriptionColor ? rule(`${box} .el-card__desc`, { color: `${descriptionColor} !important` }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const lp = linkProps(link, puck?.isEditing);
    const Tag = TITLE_TAGS.some((t) => t.value === titleTag) ? titleTag : "div";

    return (
      <div className={`el-card el-card--${isCard ? "card" : "flat"}`}>
        {css && <style>{css}</style>}
        {src && (
          <div className="el-card__media" style={{ aspectRatio: imageRatio || undefined }}>
            <img src={src} alt={mediaAlt(image)} loading="lazy" />
          </div>
        )}
        <div className="el-card__inner">
          {icon && <IconView name={icon} view={shape === "none" ? "default" : "stacked"} shape={shape === "rounded" ? "rounded" : "circle"} />}
          {title && (
            <Tag className="el-card__title">
              {lp && !buttonLabel ? (
                <a className="el-card__link" {...lp}>
                  {title}
                </a>
              ) : (
                title
              )}
            </Tag>
          )}
          {description && <div className="el-card__desc">{description}</div>}
          {buttonLabel && (
            <div className="el-card__actions">
              <ElButton label={buttonLabel} link={link} variant={buttonVariant || "link"} size={buttonSize || "md"} isEditing={puck?.isEditing} />
            </div>
          )}
        </div>
      </div>
    );
  },
};

const CONTAINER_KEYS = ["mode", "align", "titleTag", "imageRatio"];
const STYLE_KEYS = ["iconShape", "iconSize", "iconColor", "iconBackground", "titleColor", "descriptionColor"];

// Estilo (fundo, borda, sombra, padding…) aplica-se ao próprio cartão.
const Card = withTabs(withStyle(CardInner, { typography: true, target: " .el-card" }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default Card;
