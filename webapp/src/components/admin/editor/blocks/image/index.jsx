import { Image as AntImage } from "antd";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, linkField, mediaField, responsive, selectField, switchField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, unitToCss } from "../../core/css";
import { linkProps, mediaAlt, mediaSrc } from "../../core/helpers";

export const ASPECT_RATIOS = [
  { label: "Original", value: "" },
  { label: "1:1 (quadrado)", value: "1/1" },
  { label: "4:3", value: "4/3" },
  { label: "3:2", value: "3/2" },
  { label: "16:9", value: "16/9" },
  { label: "21:9", value: "21/9" },
  { label: "3:4 (vertical)", value: "3/4" },
  { label: "9:16 (vertical)", value: "9/16" },
];

const ImageInner = {
  label: "Imagem",
  fields: {
    image: mediaField("Imagem", { withAlt: true }),
    caption: textField("Legenda"),
    link: linkField("Link"),
    lightbox: switchField("Ampliar ao clicar (lightbox)", { showIf: (p) => !(p.link?.url || "").trim() }),
    align: responsive(alignField("Alinhamento")),
    imgWidth: responsive(unitField("Largura da imagem", { units: ["%", "px", "vw"] })),
    imgHeight: responsive(unitField("Altura da imagem", { units: ["px", "vh"] })),
    aspectRatio: selectField("Proporção", ASPECT_RATIOS),
    objectFit: selectField(
      "Ajuste",
      [
        { label: "Cobrir (cortar)", value: "cover" },
        { label: "Conter (sem cortar)", value: "contain" },
      ],
      { showIf: (p) => !!p.aspectRatio || !!p.imgHeight?.desktop },
    ),
  },
  defaultProps: {
    align: { desktop: "center" },
    objectFit: "cover",
  },
  // `alt` e `size` ({width,height} em texto) eram os campos antigos.
  render: ({ id, image, alt, caption, link, lightbox, align, imgWidth, imgHeight, aspectRatio, objectFit, size, puck }) => {
    const src = mediaSrc(image);
    if (!src) {
      return puck?.isEditing ? <div style={{ padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" }}>Escolha uma imagem</div> : null;
    }
    const sel = `[data-style-id="${id}"]`;
    const css = [
      responsiveRules(`${sel} .el-image`, (d) => ({ textAlign: own(align, d) })),
      responsiveRules(`${sel} .el-image__img`, (d) => ({
        width: unitToCss(own(imgWidth, d)) ?? (d === "desktop" ? size?.width || undefined : undefined),
        height: unitToCss(own(imgHeight, d)) ?? (d === "desktop" ? size?.height || undefined : undefined),
      })),
    ].join("\n");
    const altText = mediaAlt(image, alt);
    const imgStyle = {
      aspectRatio: aspectRatio || undefined,
      objectFit: aspectRatio || imgHeight ? objectFit || "cover" : undefined,
      display: "inline-block",
      verticalAlign: "middle",
      maxWidth: "100%",
    };
    const lp = linkProps(link, puck?.isEditing);
    let img = <img className="el-image__img" src={src} alt={altText} loading="lazy" style={imgStyle} />;
    if (lightbox && !lp && !puck?.isEditing) {
      img = <AntImage rootClassName="el-image__lightbox" className="el-image__img" src={src} alt={altText} style={imgStyle} preview={{ mask: "Ampliar" }} />;
    }
    return (
      <figure className="el-image" style={{ margin: 0 }}>
        {css && <style>{css}</style>}
        {lp ? <a {...lp}>{img}</a> : img}
        {caption ? <figcaption style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>{caption}</figcaption> : null}
      </figure>
    );
  },
};

// Borda/raio/sombra/hover aplicam-se à própria imagem (como no Elementor).
const Image = withTabs(withStyle(ImageInner, { target: " .el-image__img", exclude: ["color", "padding"] }));

export default Image;
