import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, linkField, mediaField, responsive, selectField, sliderField, switchField, textField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { linkProps, mediaAlt, mediaSrc } from "../../core/helpers";
import { ASPECT_RATIOS } from "../image";
import { legacyAlign } from "../icon";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const TITLE_TAGS = [
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
  { label: "H4", value: "h4" },
  { label: "Div", value: "div" },
];

const ImageBoxInner = {
  label: "Caixa de imagem",
  fields: {
    image: mediaField("Imagem", { withAlt: true }),
    title: { type: "text", label: "Título", contentEditable: true },
    text: { type: "textarea", label: "Texto", contentEditable: true },
    link: linkField("Link"),
    linkText: textField("Texto do link", { placeholder: "ex.: Saber mais", showIf: (p) => !!(get(p, "link")?.url || "").trim() }),
    wholeCard: switchField("Caixa inteira clicável", { showIf: (p) => !!(get(p, "link")?.url || "").trim() }),

    imagePosition: buttonsField("Posição da imagem", [
      { label: "Topo", value: "top" },
      { label: "Esquerda", value: "left" },
      { label: "Direita", value: "right" },
    ]),
    imageWidth: sliderField("Largura da imagem", { min: 15, max: 70, suffix: "%", showIf: (p) => get(p, "imagePosition") !== "top" }),
    aspectRatio: selectField("Proporção da imagem", ASPECT_RATIOS),
    align: responsive(alignField("Alinhamento do texto")),
    titleTag: selectField("Etiqueta HTML do título", TITLE_TAGS),

    hoverZoom: switchField("Zoom da imagem ao passar o rato"),
    imageRadius: sliderField("Raio da imagem", { min: 0, max: 60, suffix: "px" }),
    bodyPadding: sliderField("Espaço interno do texto", { min: 0, max: 80, suffix: "px" }),
    titleColor: colorField("Cor do título"),
    textColor: colorField("Cor do texto"),
    linkColor: colorField("Cor do link"),
  },
  defaultProps: {
    title: "Título da caixa",
    text: "Uma descrição curta do que se encontra aqui.",
    link: { url: "" },
    linkText: "Saber mais",
    imagePosition: "top",
    imageWidth: 40,
    aspectRatio: "16/9",
    align: { desktop: "left" },
    titleTag: "h3",
    hoverZoom: true,
    bodyPadding: 20,
    style: {
      background: "#ffffff",
      borderRadius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12, unit: "px", linked: true },
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    },
  },
  render: ({ id, image, title, text, link, linkText, wholeCard, imagePosition, imageWidth, aspectRatio, align, titleTag, hoverZoom, imageRadius, bodyPadding, titleColor, textColor, linkColor, puck }) => {
    const isEditing = puck?.isEditing;
    const pos = ["left", "right"].includes(imagePosition) ? imagePosition : "top";
    const src = mediaSrc(image);
    const lp = linkProps(link, isEditing);
    const cardLink = !!(lp && wholeCard);
    const S = `[data-style-id="${id}"]`;
    const box = `${S} .el-imagebox`;

    const css = [
      pos !== "top" && typeof imageWidth === "number" ? rule(`${box} .el-imagebox__media`, { flexBasis: `${imageWidth}%`, width: `${imageWidth}%` }) : "",
      typeof imageRadius === "number" ? rule(`${box} .el-imagebox__media`, { borderRadius: `${imageRadius}px` }) : "",
      typeof bodyPadding === "number" ? rule(`${box} .el-imagebox__body`, { padding: `${bodyPadding}px` }) : "",
      responsiveRules(`${box} .el-imagebox__body`, (d) => {
        const a = legacyAlign(own(align, d));
        return a ? { textAlign: a, alignItems: a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center" } : {};
      }),
      titleColor ? rule(`${box} .el-imagebox__title`, { color: `${titleColor} !important` }) : "",
      textColor ? rule(`${box} .el-imagebox__text`, { color: `${textColor} !important`, opacity: "1" }) : "",
      linkColor ? rule(`${box} .el-imagebox__more`, { color: `${linkColor} !important` }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const Tag = TITLE_TAGS.some((t) => t.value === titleTag) ? titleTag : "h3";
    // Com a caixa inteira clicável há um único <a> a envolver tudo (nunca
    // links dentro de links); senão o link fica no título e no "Saber mais".
    const titleInner = lp && !cardLink ? (
      <a className="el-imagebox__title-link" {...lp}>
        {title}
      </a>
    ) : (
      title
    );
    const more = lp && linkText ? (
      cardLink ? (
        <span className="el-imagebox__more">{linkText}</span>
      ) : (
        // Com título, o link do título já é o link acessível — este fica
        // fora da ordem do Tab para não haver dois links iguais seguidos.
        <a className="el-imagebox__more" {...lp} {...(title ? { tabIndex: -1, "aria-hidden": "true" } : {})}>
          {linkText}
        </a>
      )
    ) : null;

    const content = (
      <>
        {src ? (
          <div className="el-imagebox__media" style={{ aspectRatio: aspectRatio || undefined }}>
            <img src={src} alt={mediaAlt(image)} loading="lazy" />
          </div>
        ) : isEditing ? (
          <div className="el-imagebox__media el-imagebox__media--empty" style={{ aspectRatio: aspectRatio || "16/9" }}>
            Escolha uma imagem
          </div>
        ) : null}
        <div className="el-imagebox__body">
          {title && <Tag className="el-imagebox__title">{titleInner}</Tag>}
          {text && <div className="el-imagebox__text">{text}</div>}
          {more}
        </div>
      </>
    );

    const cls = `el-imagebox el-imagebox--${pos}${hoverZoom ? " el-imagebox--zoom" : ""}${cardLink ? " el-imagebox--clickable" : ""}`;
    return (
      <>
        {css && <style>{css}</style>}
        {cardLink ? (
          <a className={cls} {...lp}>
            {content}
          </a>
        ) : (
          <div className={cls}>{content}</div>
        )}
      </>
    );
  },
};

const CONTAINER_KEYS = ["imagePosition", "imageWidth", "aspectRatio", "align", "titleTag"];
const STYLE_KEYS = ["hoverZoom", "imageRadius", "bodyPadding", "titleColor", "textColor", "linkColor"];

// Estilo (fundo, borda, sombra…) aplica-se à própria caixa.
const ImageBox = withTabs(withStyle(ImageBoxInner, { typography: true, target: " .el-imagebox" }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default ImageBox;
