import { useState } from "react";
import { Image as AntImage } from "antd";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, cornersField, mediaField, responsive, selectField, sliderField, switchField, textField } from "../../core/fields";
import { cornersToCss, own, responsiveRules, rule } from "../../core/css";
import { clamp, mediaAlt, mediaSrc } from "../../core/helpers";
import { ASPECT_RATIOS } from "../image";
import "./styles.css";

const CONTAINER_KEYS = ["columns", "gap", "layoutMode", "aspectRatio", "hoverEffect"];
const STYLE_KEYS = ["imageRadius", "captionColor", "captionBackground", "hoverOverlayColor"];

const placeholderStyle = { padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" };

function GalleryView({ id, images, lightbox, captionDisplay, columns, gap, layoutMode, aspectRatio, hoverEffect, imageRadius, captionColor, captionBackground, hoverOverlayColor, puck }) {
  const isEditing = puck?.isEditing;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  // Itens sem imagem (acabados de adicionar, ou "Limpar" a meio) ficam de
  // fora em vez de rebentarem a galeria inteira.
  const items = (Array.isArray(images) ? images : [])
    .map((item) => ({ src: mediaSrc(item?.image), alt: mediaAlt(item?.image, item?.alt), caption: (item?.caption || "").trim() }))
    .filter((item) => !!item.src);

  if (items.length === 0) {
    return isEditing ? <div style={placeholderStyle}>Adicione imagens à galeria</div> : null;
  }

  const masonry = layoutMode === "masonry";
  const display = captionDisplay || "below";
  // Lightbox nunca no editor: o antd abre o portal no document do topo, fora
  // do iframe do canvas, e um clique serve para selecionar o bloco.
  const useLightbox = !!lightbox && !isEditing;

  const sel = `[data-style-id="${id}"] .el-gallery`;
  const colsFor = (d) => {
    const n = own(columns, d);
    return n === undefined || n === null || n === "" ? undefined : clamp(n, 1, 8);
  };
  const gapFor = (d) => {
    const g = own(gap, d);
    return g === undefined || g === null || g === "" ? undefined : `${g}px`;
  };
  const css = [
    masonry
      ? responsiveRules(sel, (d) => ({ columnCount: colsFor(d), columnGap: gapFor(d) }))
      : responsiveRules(sel, (d) => ({ gridTemplateColumns: colsFor(d) ? `repeat(${colsFor(d)}, minmax(0, 1fr))` : undefined, gap: gapFor(d) })),
    masonry ? responsiveRules(`${sel} .el-gallery__item`, (d) => ({ marginBottom: gapFor(d) })) : "",
    rule(`${sel} .el-gallery__media`, { borderRadius: cornersToCss(imageRadius) }),
    rule(`${sel} .el-gallery__caption`, { color: captionColor }),
    rule(`${sel} .el-gallery__caption--overlay`, { background: captionBackground }),
    rule(`${sel} .el-gallery__overlay`, { background: hoverOverlayColor }),
  ]
    .filter(Boolean)
    .join("\n");

  const cls = ["el-gallery", masonry ? "el-gallery--masonry" : "el-gallery--grid", hoverEffect === "zoom" ? "el-gallery--zoom" : null, hoverOverlayColor ? "el-gallery--overlay" : null]
    .filter(Boolean)
    .join(" ");
  // Em alvenaria (masonry) as imagens ficam sempre com a proporção original
  // — é essa a ideia do layout.
  const ratio = !masonry && aspectRatio ? aspectRatio : undefined;

  const open = (i) => {
    setCurrent(i);
    setPreviewOpen(true);
  };

  return (
    <>
      {css && <style>{css}</style>}
      <div className={cls}>
        {items.map((item, i) => {
          const img = <img className="el-gallery__img" src={item.src} alt={item.alt} loading="lazy" style={{ aspectRatio: ratio, objectFit: ratio ? "cover" : undefined }} />;
          const inner = (
            <>
              {img}
              <span className="el-gallery__overlay" aria-hidden="true" />
              {display === "overlay" && item.caption && <span className="el-gallery__caption el-gallery__caption--overlay">{item.caption}</span>}
            </>
          );
          return (
            <figure key={i} className="el-gallery__item">
              {useLightbox ? (
                <button type="button" className="el-gallery__media" onClick={() => open(i)} aria-label={`Ampliar imagem${item.alt ? `: ${item.alt}` : ` ${i + 1}`}`}>
                  {inner}
                </button>
              ) : (
                <div className="el-gallery__media">{inner}</div>
              )}
              {display === "below" && item.caption && <figcaption className="el-gallery__caption el-gallery__caption--below">{item.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
      {useLightbox && (
        <AntImage.PreviewGroup
          items={items.map((it) => ({ src: it.src, alt: it.alt }))}
          preview={{
            open: previewOpen,
            current,
            onOpenChange: (o) => setPreviewOpen(o),
            onChange: (c) => setCurrent(c),
            countRender: (c, total) => `${c} / ${total}`,
            // A legenda da imagem atual aparece por cima da barra de ações.
            actionsRender: (node) => (
              <div className="el-gallery-lightbox__footer">
                {items[current]?.caption && <div className="el-gallery-lightbox__caption">{items[current].caption}</div>}
                {node}
              </div>
            ),
          }}
        />
      )}
    </>
  );
}

const GalleryInner = {
  label: "Galeria",
  fields: {
    images: {
      type: "array",
      label: "Imagens",
      getItemSummary: (item, i) => item?.caption || item?.image?.alt || `Imagem ${i + 1}`,
      defaultItemProps: { image: null, caption: "" },
      arrayFields: {
        image: mediaField("Imagem", { withAlt: true }),
        caption: textField("Legenda"),
      },
    },
    lightbox: switchField("Ampliar ao clicar (lightbox)"),
    captionDisplay: buttonsField("Legendas", [
      { label: "Por baixo", value: "below" },
      { label: "Sobre a imagem", value: "overlay", title: "Aparece ao passar o rato (sempre visível em ecrãs táteis)" },
      { label: "Não mostrar", value: "none" },
    ]),

    columns: responsive(sliderField("Colunas", { min: 1, max: 8 })),
    gap: responsive(sliderField("Espaço entre imagens", { min: 0, max: 80, suffix: "px" })),
    layoutMode: buttonsField("Disposição", [
      { label: "Grelha", value: "grid" },
      { label: "Alvenaria", value: "masonry", title: "Masonry — imagens com a altura original, em colunas" },
    ]),
    aspectRatio: selectField("Proporção", ASPECT_RATIOS, { showIf: (p) => p.layoutMode !== "masonry" }),
    hoverEffect: buttonsField("Efeito ao passar o rato", [
      { label: "Nenhum", value: "none" },
      { label: "Zoom", value: "zoom" },
    ]),

    imageRadius: cornersField("Raio dos cantos das imagens", { section: "Imagens" }),
    hoverOverlayColor: colorField("Sobreposição ao passar o rato", { section: "Imagens" }),
    captionColor: colorField("Cor da legenda", { section: "Legendas" }),
    captionBackground: colorField("Fundo da legenda sobre a imagem", { section: "Legendas" }),
  },
  defaultProps: {
    images: [],
    lightbox: true,
    captionDisplay: "below",
    columns: { desktop: 3, tablet: 2, mobile: 2 },
    gap: { desktop: 16, mobile: 8 },
    layoutMode: "grid",
    aspectRatio: "1/1",
    hoverEffect: "zoom",
  },
  render: (p) => <GalleryView {...p} />,
};

const Gallery = withTabs(withStyle(GalleryInner, { exclude: ["color"] }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default Gallery;
