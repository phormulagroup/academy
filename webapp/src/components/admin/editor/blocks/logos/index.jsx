import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, linkField, mediaField, responsive, sliderField, switchField } from "../../core/fields";
import { own, resolveForDevice, responsiveRules, rule } from "../../core/css";
import { clamp, linkProps, mediaAlt, mediaSrc } from "../../core/helpers";
import "./styles.css";

const CONTAINER_KEYS = ["layoutMode", "columns", "gap", "logoHeight", "align", "speed", "pauseOnHover", "grayscale"];

const placeholderStyle = { padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" };

const MIN_MARQUEE_ITEMS = 10;
const DEFAULT_COLS = { desktop: 5, tablet: 4, mobile: 3 };

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" };

const isSet = (v) => v !== undefined && v !== null && v !== "";

function LogoItem({ item, isEditing, clone, repeat }) {
  const lp = linkProps(item.link, isEditing);
  // A cópia do letreiro (marquee) é só visual: escondida dos leitores de
  // ecrã e fora da ordem de tabulação.
  const img = <img className="el-logos__img" src={item.src} alt={clone ? "" : item.alt} loading="lazy" draggable={false} />;
  return (
    <div className={`el-logos__item${repeat ? " el-logos__item--repeat" : ""}`} aria-hidden={repeat ? "true" : undefined}>
      {lp ? (
        <a className="el-logos__link" {...lp} tabIndex={clone ? -1 : lp.tabIndex} aria-label={!clone && !item.alt ? "Logótipo" : undefined}>
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}

function LogosView({ id, logos, layoutMode, columns, gap, logoHeight, align, speed, pauseOnHover, grayscale, puck }) {
  const isEditing = puck?.isEditing;
  // Formato antigo: {alt, imageUrl} (URL absoluto em texto) — mediaSrc
  // aceita os dois.
  const items = (Array.isArray(logos) ? logos : [])
    .map((item) => ({ src: mediaSrc(item?.image || item?.imageUrl), alt: mediaAlt(item?.image, item?.alt), link: item?.link }))
    .filter((item) => !!item.src);

  if (items.length === 0) {
    return isEditing ? <div style={placeholderStyle}>Adicione logótipos</div> : null;
  }

  const marquee = layoutMode === "marquee";
  // Com poucos logótipos, uma cópia é mais estreita do que o ecrã e ficava
  // um buraco vazio no fim de cada volta — repete a lista (só visualmente)
  // até ter pelo menos MIN_MARQUEE_ITEMS por cópia.
  const marqueeItems = marquee ? Array.from({ length: Math.ceil(MIN_MARQUEE_ITEMS / items.length) }, () => items).flat() : items;
  const sel = `[data-style-id="${id}"] .el-logos`;
  const gapFor = (d) => (isSet(own(gap, d)) ? `${own(gap, d)}px` : undefined);
  const css = [
    responsiveRules(`${sel} .el-logos__img`, (d) => ({ height: isSet(own(logoHeight, d)) ? `${own(logoHeight, d)}px` : undefined })),
    marquee
      ? [
          // Margem à direita de cada item (e não `gap`) para que as duas
          // cópias meçam exatamente o mesmo e o -50% da animação feche o
          // ciclo sem salto.
          responsiveRules(`${sel} .el-logos__set > .el-logos__item`, (d) => ({ marginRight: gapFor(d) })),
          rule(`${sel} .el-logos__track`, { animationDuration: `${clamp(speed ?? 30, 5, 180)}s` }),
        ].join("\n")
      : [
          responsiveRules(`${sel} .el-logos__grid`, (d) => ({ gap: gapFor(d), justifyContent: JUSTIFY[own(align, d)] })),
          // Largura de cada item calculada em todos os dispositivos com o
          // valor efetivo (herdado): mudar só o gap em mobile também tem de
          // recalcular a largura.
          responsiveRules(`${sel} .el-logos__grid > .el-logos__item`, (d) => {
            const cols = clamp(resolveForDevice(columns, d) ?? DEFAULT_COLS[d], 1, 12);
            const g = Number(resolveForDevice(gap, d) ?? 32) || 0;
            return { width: `calc((100% - ${(cols - 1) * g}px) / ${cols})` };
          }),
        ].join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  const cls = ["el-logos", marquee ? "el-logos--marquee" : "el-logos--grid", grayscale ? "el-logos--grayscale" : null, marquee && pauseOnHover !== false ? "el-logos--pause" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      {css && <style>{css}</style>}
      {marquee ? (
        <div className="el-logos__viewport">
          <div className="el-logos__track">
            <div className="el-logos__set">
              {marqueeItems.map((item, i) => (
                <LogoItem key={i} item={item} isEditing={isEditing} clone={i >= items.length} repeat={i >= items.length} />
              ))}
            </div>
            <div className="el-logos__set el-logos__set--clone" aria-hidden="true">
              {marqueeItems.map((item, i) => (
                <LogoItem key={i} item={item} isEditing={isEditing} clone />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="el-logos__grid">
          {items.map((item, i) => (
            <LogoItem key={i} item={item} isEditing={isEditing} />
          ))}
        </div>
      )}
    </div>
  );
}

const LogosInner = {
  label: "Logótipos",
  fields: {
    logos: {
      type: "array",
      label: "Logótipos",
      getItemSummary: (item, i) => item?.image?.alt || item?.alt || `Logótipo ${i + 1}`,
      defaultItemProps: { image: null, link: null },
      arrayFields: {
        image: mediaField("Logótipo", { withAlt: true }),
        link: linkField("Link (opcional)"),
      },
    },

    layoutMode: buttonsField("Disposição", [
      { label: "Grelha", value: "grid" },
      { label: "Letreiro animado", value: "marquee", title: "Desliza sem fim na horizontal" },
    ]),
    columns: responsive(sliderField("Colunas", { min: 1, max: 12, showIf: (p) => p.layoutMode !== "marquee" })),
    align: responsive(alignField("Alinhamento", { showIf: (p) => p.layoutMode !== "marquee" })),
    gap: responsive(sliderField("Espaço entre logótipos", { min: 0, max: 120, suffix: "px" })),
    logoHeight: responsive(sliderField("Altura dos logótipos", { min: 16, max: 200, suffix: "px" })),
    speed: sliderField("Duração de uma volta", { min: 5, max: 120, suffix: "s", showIf: (p) => p.layoutMode === "marquee" }),
    pauseOnHover: switchField("Pausar ao passar o rato", { showIf: (p) => p.layoutMode === "marquee" }),
    grayscale: switchField("Cinzento (cor ao passar o rato)"),
  },
  // Sem logótipos de exemplo: os antigos eram imagens de um site externo
  // (hot-link) que podiam desaparecer ou mudar a qualquer momento.
  defaultProps: {
    logos: [],
    layoutMode: "grid",
    columns: { desktop: 5, tablet: 4, mobile: 3 },
    align: { desktop: "center" },
    gap: { desktop: 32, mobile: 16 },
    logoHeight: { desktop: 48, mobile: 36 },
    speed: 30,
    pauseOnHover: true,
    grayscale: false,
  },
  render: (p) => <LogosView {...p} />,
};

const Logos = withTabs(withStyle(LogosInner, { exclude: ["color"] }), { containerKeys: CONTAINER_KEYS });

export default Logos;
