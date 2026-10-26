import { Component, useEffect, useRef, useState } from "react";
import {
  colorField,
  spacingField,
  cornersField,
  unitField,
  sliderField,
  selectField,
  buttonsField,
  switchField,
  textField,
  mediaField,
  gradientField,
  shadowField,
  responsive,
  alignOptions,
} from "../core/fields";
import {
  BREAKPOINTS,
  rule,
  responsiveRules,
  toBucket,
  sidesToCss,
  cornersToCss,
  unitToCss,
  shadowToCss,
  gradientToCss,
  scopeCustomCss,
  DEVICES,
} from "../core/css";
import { mediaSrc } from "../core/helpers";
import { FONT_FAMILIES, fontStack, ensureFontLoaded } from "../core/fonts";

// ==========================================================================
// Campos do separador "Estilo"
// ==========================================================================

const FONT_WEIGHTS = [
  { label: "Herdar", value: "" },
  { label: "300 · Leve", value: "300" },
  { label: "400 · Normal", value: "400" },
  { label: "500 · Médio", value: "500" },
  { label: "600 · Semi-negrito", value: "600" },
  { label: "700 · Negrito", value: "700" },
  { label: "800 · Extra-negrito", value: "800" },
];

const BG_POSITIONS = [
  { label: "Centro", value: "center center" },
  { label: "Topo", value: "center top" },
  { label: "Fundo", value: "center bottom" },
  { label: "Esquerda", value: "left center" },
  { label: "Direita", value: "right center" },
  { label: "Topo esquerda", value: "left top" },
  { label: "Topo direita", value: "right top" },
  { label: "Fundo esquerda", value: "left bottom" },
  { label: "Fundo direita", value: "right bottom" },
];

export const ANIMATIONS = [
  { label: "Nenhuma", value: "" },
  { label: "Aparecer (fade)", value: "fadeIn" },
  { label: "Aparecer de baixo", value: "fadeInUp" },
  { label: "Aparecer de cima", value: "fadeInDown" },
  { label: "Aparecer da esquerda", value: "fadeInLeft" },
  { label: "Aparecer da direita", value: "fadeInRight" },
  { label: "Zoom", value: "zoomIn" },
  { label: "Deslizar de baixo", value: "slideInUp" },
  { label: "Saltar (bounce)", value: "bounceIn" },
  { label: "Rodar (flip)", value: "flipInX" },
];

export const HOVER_TRANSFORMS = [
  { label: "Nenhuma", value: "" },
  { label: "Levantar", value: "translateY(-4px)" },
  { label: "Crescer", value: "scale(1.04)" },
  { label: "Encolher", value: "scale(0.97)" },
  { label: "Inclinar", value: "rotate(-1.5deg)" },
];

function typographyFields() {
  const s = "Tipografia";
  return {
    fontFamily: selectField("Fonte", FONT_FAMILIES, { section: s }),
    fontSize: responsive(unitField("Tamanho", { units: ["px", "em", "rem", "vw"], max: 120, section: s })),
    fontWeight: selectField("Peso", FONT_WEIGHTS, { section: s }),
    lineHeight: responsive(unitField("Altura da linha", { units: ["em", "px"], maxByUnit: { em: 3, px: 120 }, step: 0.1, section: s })),
    letterSpacing: unitField("Espaçamento entre letras", { units: ["px", "em"], min: -5, max: 20, allowNegative: true, step: 0.1, section: s }),
    textTransform: selectField(
      "Transformação",
      [
        { label: "Nenhuma", value: "" },
        { label: "MAIÚSCULAS", value: "uppercase" },
        { label: "minúsculas", value: "lowercase" },
        { label: "Capitalizar", value: "capitalize" },
      ],
      { section: s },
    ),
    fontStyle: buttonsField(
      "Estilo",
      [
        { label: "Normal", value: "" },
        { label: <em>Itálico</em>, value: "italic" },
      ],
      { section: s },
    ),
    textDecoration: selectField(
      "Decoração",
      [
        { label: "Nenhuma", value: "" },
        { label: "Sublinhado", value: "underline" },
        { label: "Rasurado", value: "line-through" },
      ],
      { section: s },
    ),
    textShadow: selectField(
      "Sombra do texto",
      [
        { label: "Nenhuma", value: "" },
        { label: "Suave", value: "0 1px 2px rgba(0,0,0,0.25)" },
        { label: "Forte", value: "0 2px 8px rgba(0,0,0,0.45)" },
      ],
      { section: s },
    ),
  };
}

function buildStyleFields(opts = {}) {
  const exclude = new Set(opts.exclude || []);
  const fields = {
    ...(opts.typography ? typographyFields() : {}),
    color: colorField(opts.typography ? "Cor do texto" : "Cor do Texto", { section: opts.typography ? "Tipografia" : "Fundo" }),

    background: colorField("Cor de fundo", { section: "Fundo" }),
    gradient: gradientField("Gradiente", { section: "Fundo" }),
    backgroundImage: mediaField("Imagem de fundo", { section: "Fundo" }),
    backgroundSize: selectField(
      "Tamanho da imagem",
      [
        { label: "Cobrir (cover)", value: "cover" },
        { label: "Conter (contain)", value: "contain" },
        { label: "Original", value: "auto" },
      ],
      { section: "Fundo", showIf: (s) => !!s?.backgroundImage?.url },
    ),
    backgroundPosition: selectField("Posição da imagem", BG_POSITIONS, { section: "Fundo", showIf: (s) => !!s?.backgroundImage?.url }),
    backgroundRepeat: selectField(
      "Repetir",
      [
        { label: "Não repetir", value: "no-repeat" },
        { label: "Repetir", value: "repeat" },
        { label: "Repetir na horizontal", value: "repeat-x" },
        { label: "Repetir na vertical", value: "repeat-y" },
      ],
      { section: "Fundo", showIf: (s) => !!s?.backgroundImage?.url },
    ),
    backgroundAttachment: selectField(
      "Efeito",
      [
        { label: "Normal", value: "" },
        { label: "Fixo (parallax)", value: "fixed" },
      ],
      { section: "Fundo", showIf: (s) => !!s?.backgroundImage?.url },
    ),
    overlayColor: colorField("Sobreposição (overlay)", { section: "Fundo" }),
    overlayOpacity: sliderField("Opacidade da sobreposição", { min: 0, max: 100, suffix: "%", section: "Fundo", showIf: (s) => !!s?.overlayColor }),

    borderStyle: selectField(
      "Tipo de borda",
      [
        { label: "Nenhuma / sólida", value: "" },
        { label: "Sólida", value: "solid" },
        { label: "Tracejada", value: "dashed" },
        { label: "Pontilhada", value: "dotted" },
        { label: "Dupla", value: "double" },
      ],
      { section: "Borda" },
    ),
    borderWidth: spacingField("Largura da borda", { units: ["px"], section: "Borda" }),
    borderColor: colorField("Cor da borda", { section: "Borda" }),
    borderRadius: cornersField("Raio dos cantos", { section: "Borda" }),
    boxShadow: shadowField("Sombra", { section: "Borda" }),

    padding: responsive(spacingField("Espaçamento interno (padding)", { section: "Espaçamento" })),
    margin: responsive(spacingField("Margem", { allowNegative: true, section: "Espaçamento" })),

    hoverColor: colorField("Cor do texto (hover)", { section: "Ao passar o rato" }),
    hoverBackground: colorField("Cor de fundo (hover)", { section: "Ao passar o rato" }),
    hoverBorderColor: colorField("Cor da borda (hover)", { section: "Ao passar o rato" }),
    hoverShadow: shadowField("Sombra (hover)", { section: "Ao passar o rato" }),
    hoverTransform: selectField("Efeito (hover)", HOVER_TRANSFORMS, { section: "Ao passar o rato" }),
    transitionDuration: sliderField("Duração da transição", { min: 0, max: 1500, step: 50, suffix: "ms", section: "Ao passar o rato" }),
  };
  exclude.forEach((key) => delete fields[key]);
  if (opts.hover === false) Object.keys(fields).forEach((k) => (k.startsWith("hover") || k === "transitionDuration") && delete fields[k]);
  return fields;
}

// ==========================================================================
// Campos do separador "Avançado"
// ==========================================================================

function buildAdvancedFields(parentType) {
  const fields = {};

  if (parentType === "Grid") {
    fields.spanCol = responsive(sliderField("Ocupa colunas", { min: 1, max: 12, section: "Posição na grelha" }));
    fields.spanRow = responsive(sliderField("Ocupa linhas", { min: 1, max: 12, section: "Posição na grelha" }));
  }
  if (parentType === "Flex") {
    fields.grow = switchField("Crescer para ocupar o espaço livre", { section: "Posição no contentor" });
    fields.alignSelf = responsive(
      buttonsField(
        "Alinhamento próprio",
        [
          { label: "Auto", value: "" },
          { label: "Início", value: "flex-start" },
          { label: "Centro", value: "center" },
          { label: "Fim", value: "flex-end" },
          { label: "Esticar", value: "stretch" },
        ],
        { section: "Posição no contentor" },
      ),
    );
    fields.order = responsive(sliderField("Ordem", { min: -10, max: 10, section: "Posição no contentor" }));
  }

  Object.assign(fields, {
    width: responsive(unitField("Largura", { units: ["%", "px", "vw", "auto"], section: "Dimensões" })),
    maxWidth: responsive(unitField("Largura máxima", { units: ["px", "%", "vw"], section: "Dimensões" })),
    minHeight: responsive(unitField("Altura mínima", { units: ["px", "vh"], maxByUnit: { px: 1200, vh: 100 }, section: "Dimensões" })),
    blockAlign: responsive(buttonsField("Posição do bloco", alignOptions(false), { section: "Dimensões" })),
    zIndex: sliderField("Camada (z-index)", { min: 0, max: 50, section: "Dimensões" }),
    opacity: sliderField("Opacidade", { min: 0, max: 100, suffix: "%", section: "Dimensões" }),

    animation: selectField("Animação de entrada", ANIMATIONS, { section: "Animação" }),
    animationDuration: selectField(
      "Velocidade",
      [
        { label: "Normal", value: "" },
        { label: "Lenta", value: "1200" },
        { label: "Rápida", value: "400" },
      ],
      { section: "Animação", showIf: (l) => !!l?.animation },
    ),
    animationDelay: sliderField("Atraso", { min: 0, max: 3000, step: 100, suffix: "ms", section: "Animação", showIf: (l) => !!l?.animation }),

    hideDesktop: switchField("Esconder em desktop", { section: "Visibilidade" }),
    hideTablet: switchField("Esconder em tablet", { section: "Visibilidade" }),
    hideMobile: switchField("Esconder em mobile", { section: "Visibilidade" }),

    cssId: textField("ID (âncora)", { placeholder: "ex.: introducao → link #introducao", section: "Atributos" }),
    className: textField("Classes CSS", { section: "Atributos" }),
    customCss: textField("CSS personalizado", {
      multiline: true,
      monospace: true,
      rows: 5,
      placeholder: "selector { border-left: 4px solid red; }\nselector:hover h2 { color: blue; }",
      help: "Use \"selector\" para se referir a este bloco.",
      section: "Atributos",
    }),
  });

  return fields;
}

// ==========================================================================
// Geração de CSS
// ==========================================================================

const isSet = (v) => v !== undefined && v !== null && v !== "";

function hexToRgba(color, alpha) {
  if (!color) return undefined;
  if (color.startsWith("#")) {
    let h = color.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  return color;
}

function borderWidthCss(bw) {
  if (!isSet(bw)) return undefined;
  if (typeof bw === "number") return bw ? `${bw}px` : undefined;
  return sidesToCss(bw, "px");
}

function hasBorder(bw) {
  if (typeof bw === "number") return bw > 0;
  return bw && ["top", "right", "bottom", "left"].some((k) => Number(bw[k]) > 0);
}

const DEFAULT_PADDING = { top: 20, right: 20, bottom: 20, left: 20, unit: "px" };

export function buildElementCss({ id, style = {}, layout = {}, target = "", isEditing, typography, defaultPadding }) {
  const S = `[data-style-id="${id}"]`;
  const T = `${S}${target}`;
  const P = `[data-puck-component="${id}"]`;
  const css = [];

  // ---- Visual (aplica-se ao alvo: o próprio bloco ou um elemento interior)
  const images = [];
  const grad = gradientToCss(style.gradient);
  if (grad) images.push(grad);
  const imgSrc = style.backgroundImage?.url ? mediaSrc(style.backgroundImage) : null;
  if (imgSrc) images.push(`url("${imgSrc.replace(/"/g, "%22")}")`);

  // !important na cor: o CSS global da app tem `a { color: unset
  // !important }`, que de outra forma ganhava sempre em blocos que são links
  // (Botão, Ícone com link…). Os filhos continuam a herdar normalmente.
  const important = (c) => (c ? `${c} !important` : undefined);
  const base = {
    color: important(style.color),
    backgroundColor: style.background,
    backgroundImage: images.length ? images.join(",") : undefined,
    backgroundSize: imgSrc ? style.backgroundSize || "cover" : undefined,
    backgroundPosition: imgSrc ? style.backgroundPosition || "center center" : undefined,
    backgroundRepeat: imgSrc ? style.backgroundRepeat || "no-repeat" : undefined,
    backgroundAttachment: imgSrc ? style.backgroundAttachment : undefined,
    borderStyle: hasBorder(style.borderWidth) ? style.borderStyle || "solid" : undefined,
    borderWidth: hasBorder(style.borderWidth) ? borderWidthCss(style.borderWidth) : undefined,
    borderColor: style.borderColor,
    borderRadius: cornersToCss(style.borderRadius),
    boxShadow: shadowToCss(style.boxShadow),
    textShadow: style.textShadow,
    transition:
      isSet(style.transitionDuration) || style.hoverColor || style.hoverBackground || style.hoverBorderColor || style.hoverShadow || style.hoverTransform
        ? `all ${isSet(style.transitionDuration) ? style.transitionDuration : 250}ms ease`
        : undefined,
  };
  if (typography) {
    Object.assign(base, {
      fontFamily: fontStack(style.fontFamily),
      fontWeight: style.fontWeight,
      letterSpacing: unitToCss(style.letterSpacing),
      textTransform: style.textTransform,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
    });
  }
  css.push(rule(T, base));

  // Overlay: pseudo-elemento por cima do fundo, por baixo do conteúdo.
  if (style.overlayColor) {
    const alpha = isSet(style.overlayOpacity) ? style.overlayOpacity / 100 : 0.5;
    css.push(rule(T, { position: "relative", isolation: "isolate" }));
    css.push(
      `${T}::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;background:${style.overlayColor.startsWith("#") ? hexToRgba(style.overlayColor, alpha) : style.overlayColor};${
        style.overlayColor.startsWith("#") ? "" : `opacity:${alpha};`
      }}`,
    );
  }

  css.push(
    rule(`${T}:hover`, {
      color: important(style.hoverColor),
      backgroundColor: style.hoverBackground,
      borderColor: style.hoverBorderColor,
      boxShadow: shadowToCss(style.hoverShadow),
      transform: style.hoverTransform,
    }),
  );

  // ---- Responsivo (padding no alvo, margem no invólucro)
  // Por omissão todo o bloco tem 20px de espaçamento interno; defini-lo
  // (mesmo a 0) no painel Estilo substitui este valor.
  const padding = style.padding === undefined ? defaultPadding || DEFAULT_PADDING : style.padding;
  css.push(
    responsiveRules(T, (d) => ({
      padding: sidesToCss(resolveOwn(padding, d)),
      fontSize: typography ? unitToCss(resolveOwn(style.fontSize, d)) : undefined,
      lineHeight: typography ? lineHeightCss(resolveOwn(style.lineHeight, d)) : undefined,
    })),
  );
  css.push(responsiveRules(S, (d) => ({ margin: sidesToCss(resolveOwn(style.margin, d)) })));

  // ---- Dimensões / posição (no invólucro). Largura e posição no
  // contentor pai aplicam-se ao item real do grid/flex: no editor é o
  // invólucro do próprio Puck (P), na página publicada é este (S).
  const itemProps = (d) => ({
    width: unitToCss(resolveOwn(layout.width, d)),
    maxWidth: unitToCss(resolveOwn(layout.maxWidth, d)),
    gridColumn: isSet(resolveOwn(layout.spanCol, d)) && Number(resolveOwn(layout.spanCol, d)) > 1 ? `span ${Math.min(Number(resolveOwn(layout.spanCol, d)), 12)}` : undefined,
    gridRow: isSet(resolveOwn(layout.spanRow, d)) && Number(resolveOwn(layout.spanRow, d)) > 1 ? `span ${Math.min(Number(resolveOwn(layout.spanRow, d)), 12)}` : undefined,
    alignSelf: resolveOwn(layout.alignSelf, d) || undefined,
    order: resolveOwn(layout.order, d),
    marginLeft: blockAlignMargin(resolveOwn(layout.blockAlign, d), "left"),
    marginRight: blockAlignMargin(resolveOwn(layout.blockAlign, d), "right"),
  });
  const widthAuto = DEVICES.some((d) => isSet(resolveOwn(layout.width, d)) || isSet(resolveOwn(layout.maxWidth, d)));
  css.push(responsiveRules(S, itemProps));
  if (isEditing) {
    css.push(responsiveRules(P, itemProps));
    if (widthAuto) css.push(rule(`${P} > ${S}`, { width: "100%", maxWidth: "none", marginLeft: "0", marginRight: "0" }));
  }
  if (layout.grow) {
    css.push(rule(S, { flex: "1 1 0", minWidth: "0" }));
    if (isEditing) css.push(rule(P, { flex: "1 1 0", minWidth: "0" }));
  }

  css.push(
    responsiveRules(S, (d) => ({
      minHeight: unitToCss(resolveOwn(layout.minHeight, d)),
    })),
  );
  css.push(
    rule(S, {
      position: isSet(layout.zIndex) && layout.zIndex !== 0 ? "relative" : undefined,
      zIndex: isSet(layout.zIndex) && layout.zIndex !== 0 ? layout.zIndex : undefined,
      opacity: isSet(layout.opacity) && layout.opacity !== 100 ? layout.opacity / 100 : undefined,
      animationDuration: layout.animation && layout.animationDuration ? `${layout.animationDuration}ms` : undefined,
      animationDelay: layout.animation && layout.animationDelay ? `${layout.animationDelay}ms` : undefined,
    }),
  );

  // ---- Visibilidade. No editor nunca se esconde de verdade (deixava de
  // ser possível selecionar o bloco) — fica só esbatido, como no Elementor.
  const hidden = isEditing ? "opacity:.35 !important;outline:1px dashed #999;outline-offset:-1px" : "display:none !important";
  if (layout.hideDesktop) css.push(`@media (min-width:${BREAKPOINTS.tablet + 1}px){${S}{${hidden}}}`);
  if (layout.hideTablet) css.push(`@media (min-width:${BREAKPOINTS.mobile + 1}px) and (max-width:${BREAKPOINTS.tablet}px){${S}{${hidden}}}`);
  if (layout.hideMobile) css.push(`@media (max-width:${BREAKPOINTS.mobile}px){${S}{${hidden}}}`);

  if (layout.customCss) css.push(scopeCustomCss(layout.customCss, S));

  return css.filter(Boolean).join("\n");
}

// Ao contrário de resolveForDevice (herança), aqui só o valor do próprio
// dispositivo — as media queries max-width já fazem a herança em CSS.
function resolveOwn(value, device) {
  const b = toBucket(value);
  return b[device];
}

function lineHeightCss(v) {
  if (!isSet(v)) return undefined;
  if (typeof v === "object" && v.unit === "em") return isSet(v.value) ? String(v.value) : undefined;
  return unitToCss(v);
}

function blockAlignMargin(align, side) {
  if (!align) return undefined;
  if (align === "center") return "auto";
  if (align === "left") return side === "left" ? "0" : "auto";
  if (align === "right") return side === "right" ? "0" : "auto";
  return undefined;
}

// Mantido para blocos que ainda aplicam estilo inline num elemento interior.
export function styleToProps(style) {
  if (!style) return undefined;
  return {
    backgroundColor: style.background || undefined,
    backgroundImage: style.backgroundImage?.url ? `url(${mediaSrc(style.backgroundImage)})` : undefined,
    backgroundSize: style.backgroundImage?.url ? "cover" : undefined,
    backgroundPosition: style.backgroundImage?.url ? "center" : undefined,
    color: style.color || undefined,
    borderWidth: borderWidthCss(style.borderWidth),
    borderStyle: hasBorder(style.borderWidth) ? style.borderStyle || "solid" : undefined,
    borderColor: style.borderColor || undefined,
    borderRadius: cornersToCss(style.borderRadius),
    boxShadow: shadowToCss(style.boxShadow),
  };
}

// ==========================================================================
// Invólucro de cada bloco
// ==========================================================================

// Um bloco com dados inesperados (ex.: imagem limpa a meio, campo antigo)
// nunca pode deitar abaixo a lição inteira do aluno — só esse bloco fica
// de fora (no editor mostra o aviso, para o admin o poder corrigir).
class BlockErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Erro ao desenhar um bloco do conteúdo:", error);
  }

  render() {
    if (this.state.error) {
      return this.props.isEditing ? (
        <div style={{ padding: 12, border: "1px dashed #e5484d", borderRadius: 6, color: "#e5484d", fontSize: 13 }}>
          Este bloco tem um problema e não pode ser mostrado. Verifique as definições ou apague-o.
        </div>
      ) : null;
    }
    return this.props.children;
  }
}

function ElementWrapper({ id, style, layout, target, typography, isEditing, defaultPadding, wrapperDisplay, wrapperTag: Tag = "div", children }) {
  const ref = useRef(null);
  const animation = !isEditing ? layout?.animation : "";
  const [visible, setVisible] = useState(!animation);

  useEffect(() => {
    if (!animation) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animation]);

  useEffect(() => {
    if (typography && style?.fontFamily) ensureFontLoaded(style.fontFamily, ref.current?.ownerDocument);
  }, [typography, style?.fontFamily]);

  const css = buildElementCss({ id, style: style || {}, layout: layout || {}, target, isEditing, typography, defaultPadding });
  const classes = [
    "el-element",
    layout?.className,
    animation ? `el-anim el-anim--${animation}${visible ? " el-anim--visible" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      ref={ref}
      data-style-id={id}
      id={layout?.cssId ? String(layout.cssId).replace(/[^a-zA-Z0-9_-]/g, "") || undefined : undefined}
      className={classes}
      style={wrapperDisplay ? { display: wrapperDisplay } : undefined}
    >
      {css ? <style>{css}</style> : null}
      <BlockErrorBoundary isEditing={isEditing}>{children}</BlockErrorBoundary>
    </Tag>
  );
}

/**
 * Acrescenta a qualquer bloco os separadores "Estilo" e "Avançado"
 * (via withTabs) e o invólucro que gera o CSS.
 *
 * opts:
 *  - typography: mostra a secção Tipografia
 *  - target: sufixo de seletor do elemento que recebe o estilo visual (ex.
 *    " .el-button") — a margem/dimensões ficam sempre no invólucro
 *  - exclude: chaves de "Estilo" a esconder
 *  - hover: false para esconder a secção hover
 *  - defaultPadding: (props) => padding por omissão (em vez dos 20px); undefined = os 20px
 *  - inline: invólucro inline-block (blocos do tamanho do conteúdo)
 */
export function withStyle(componentConfig, opts = {}) {
  const styleFields = buildStyleFields(opts);
  const innerResolveFields = componentConfig.resolveFields;
  const Inner = componentConfig.render;
  const wrapperDisplay = opts.inline ? "inline-block" : undefined;

  const buildFields = (baseFields, parentType) => ({
    ...baseFields,
    style: { type: "object", label: "Estilo", objectFields: styleFields },
    layout: { type: "object", label: "Avançado", objectFields: buildAdvancedFields(parentType) },
  });

  return {
    ...componentConfig,
    fields: buildFields(componentConfig.fields || {}, null),
    resolveFields: async (data, params) => {
      const resolved = innerResolveFields ? await innerResolveFields(data, params) : componentConfig.fields || {};
      // eslint-disable-next-line no-unused-vars
      const { style, layout, ...rest } = resolved || {};
      // `showIf` também nos campos de conteúdo (fora dos separadores):
      // recebe as props atuais do bloco (no DesignPanel recebe os valores
      // irmãos do mesmo separador — em ambos os casos, os "irmãos").
      const visible = {};
      Object.entries(rest).forEach(([key, def]) => {
        // Os campos que withTabs move para Layout/Estilo guardam o valor em
      // __design.container — juntam-se aqui para o showIf ver todos os irmãos.
      const siblings = { ...(data?.props || {}), ...(data?.props?.__design?.container || {}) };
      if (typeof def?.showIf === "function" && !def.showIf(siblings)) return;
        visible[key] = def;
      });
      return buildFields(visible, params?.parent?.type);
    },
    render: (props) => (
      <ElementWrapper
        id={props.id}
        style={props.style}
        layout={props.layout}
        target={opts.target}
        typography={opts.typography}
        defaultPadding={opts.defaultPadding?.(props)}
        isEditing={props.puck?.isEditing}
        wrapperDisplay={wrapperDisplay}
      >
        <Inner {...props} />
      </ElementWrapper>
    ),
  };
}

export const styleField = { type: "object", label: "Estilo", objectFields: buildStyleFields() };
