import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, mediaField, responsive, sliderField, switchField, textField } from "../../core/fields";
import { responsiveRules, own, resolveForDevice, rule } from "../../core/css";
import { clamp, mediaAlt, mediaSrc } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import { Stars } from "../starRating";
import "../starRating/styles.css";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const initials = (name) =>
  typeof name === "string"
    ? name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : "";

function TestimonialCard({ item, showQuoteIcon, showRating }) {
  const src = mediaSrc(item?.image);
  const rating = clamp(item?.rating ?? 0, 0, 5);
  return (
    <figure className="el-testimonial">
      {showQuoteIcon && (
        <span className="el-testimonial__quote-icon" aria-hidden="true">
          <ElementIcon name="quote" size="1em" />
        </span>
      )}
      {showRating && rating > 0 && <Stars value={rating} className="el-testimonial__stars" />}
      {item?.quote && <blockquote className="el-testimonial__quote">{item.quote}</blockquote>}
      {(item?.name || item?.role || src) && (
        <figcaption className="el-testimonial__author">
          {src ? (
            <img className="el-testimonial__avatar" src={src} alt={mediaAlt(item.image)} loading="lazy" />
          ) : item?.name ? (
            <span className="el-testimonial__avatar el-testimonial__avatar--initials" aria-hidden="true">
              {initials(item.name)}
            </span>
          ) : null}
          <span className="el-testimonial__who">
            {item?.name && <span className="el-testimonial__name">{item.name}</span>}
            {item?.role && <span className="el-testimonial__role">{item.role}</span>}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

const TestimonialsInner = {
  label: "Testemunhos",
  fields: {
    items: {
      type: "array",
      label: "Testemunhos",
      getItemSummary: (item, i) => item?.name || `Testemunho ${(i ?? 0) + 1}`,
      defaultItemProps: {
        quote: "Um curso muito bem organizado e com conteúdos úteis para o dia a dia.",
        name: "Nome da pessoa",
        role: "Cargo, instituição",
        rating: 5,
      },
      arrayFields: {
        quote: textField("Testemunho", { multiline: true, rows: 4 }),
        name: textField("Nome"),
        role: textField("Cargo / instituição"),
        image: mediaField("Fotografia (opcional)", { withAlt: true }),
        rating: sliderField("Classificação", { min: 0, max: 5, step: 0.5 }),
      },
    },
    showRating: switchField("Mostrar classificação"),
    showQuoteIcon: switchField("Mostrar aspas"),

    // Não pode chamar-se `layout`: é a prop do separador Avançado.
    display: buttonsField("Apresentação", [
      { label: "Grelha", value: "grid" },
      { label: "Carrossel", value: "slider" },
    ]),
    columns: responsive(sliderField("Colunas / testemunhos visíveis", { min: 1, max: 4 })),
    gap: sliderField("Espaço entre testemunhos", { min: 0, max: 80, suffix: "px" }),
    autoplay: switchField("Avançar sozinho", { showIf: (p) => get(p, "display") === "slider" }),
    autoplayDelay: sliderField("Tempo por slide", { min: 2000, max: 15000, step: 500, suffix: "ms", showIf: (p) => get(p, "display") === "slider" && !!get(p, "autoplay") }),
    textAlign: buttonsField("Alinhamento", [
      { label: "Esquerda", value: "left" },
      { label: "Centro", value: "center" },
    ]),

    cardStyle: buttonsField("Estilo do cartão", [
      { label: "Cartão", value: "card" },
      { label: "Contorno", value: "bordered" },
      { label: "Simples", value: "plain" },
    ]),
    cardBackground: colorField("Fundo do cartão", { showIf: (p) => get(p, "cardStyle") !== "plain" }),
    starColor: colorField("Cor das estrelas"),
    quoteColor: colorField("Cor do texto"),
    nameColor: colorField("Cor do nome"),
    roleColor: colorField("Cor do cargo"),
    accentColor: colorField("Cor das aspas"),
    avatarSize: sliderField("Tamanho da fotografia", { min: 24, max: 120, suffix: "px" }),
  },
  defaultProps: {
    items: [
      { quote: "Conteúdos claros e muito práticos. Recomendo a todos os colegas.", name: "Ana Silva", role: "Médica de Medicina Geral e Familiar", rating: 5 },
      { quote: "A plataforma é simples de usar e os módulos têm a duração certa.", name: "Rui Costa", role: "Enfermeiro", rating: 4.5 },
      { quote: "Aprendi imenso com os casos clínicos apresentados.", name: "Marta Lopes", role: "Farmacêutica", rating: 5 },
    ],
    showRating: true,
    showQuoteIcon: true,
    display: "grid",
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    gap: 24,
    autoplay: false,
    autoplayDelay: 6000,
    textAlign: "left",
    cardStyle: "card",
    avatarSize: 48,
  },
  render: ({ id, items, showRating, showQuoteIcon, display, columns, gap, autoplay, autoplayDelay, textAlign, cardStyle, cardBackground, starColor, quoteColor, nameColor, roleColor, accentColor, avatarSize, puck }) => {
    const list = Array.isArray(items) ? items : [];
    const isEditing = puck?.isEditing;
    const S = `[data-style-id="${id}"]`;
    const g = typeof gap === "number" ? gap : 24;
    const isSlider = display === "slider";

    const css = [
      !isSlider
        ? responsiveRules(`${S} .el-testimonials__grid`, (d) => {
            const c = own(columns, d);
            return { gridTemplateColumns: typeof c === "number" ? `repeat(${clamp(c, 1, 4)}, minmax(0, 1fr))` : undefined };
          })
        : "",
      rule(`${S} .el-testimonials__grid`, { gap: `${g}px` }),
      cardBackground && cardStyle !== "plain" ? rule(`${S} .el-testimonial`, { backgroundColor: cardBackground }) : "",
      starColor ? rule(`${S} .el-stars`, { "--el-star-filled": starColor }) : "",
      quoteColor ? rule(`${S} .el-testimonial__quote`, { color: `${quoteColor} !important` }) : "",
      nameColor ? rule(`${S} .el-testimonial__name`, { color: `${nameColor} !important` }) : "",
      roleColor ? rule(`${S} .el-testimonial__role`, { color: `${roleColor} !important`, opacity: "1" }) : "",
      accentColor ? rule(`${S} .el-testimonial__quote-icon`, { color: accentColor }) : "",
      typeof avatarSize === "number" ? rule(`${S} .el-testimonial__avatar`, { width: `${avatarSize}px`, height: `${avatarSize}px` }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const cls = `el-testimonials el-testimonials--${["bordered", "plain"].includes(cardStyle) ? cardStyle : "card"} el-testimonials--${textAlign === "center" ? "center" : "left"}`;

    if (list.length === 0) {
      return isEditing ? <div className="el-testimonials-hint">Adicione testemunhos no painel lateral.</div> : null;
    }

    const cards = list.map((item, i) => <TestimonialCard key={i} item={item} showQuoteIcon={showQuoteIcon} showRating={showRating} />);

    if (!isSlider) {
      return (
        <div className={cls}>
          {css && <style>{css}</style>}
          <div className="el-testimonials__grid">{cards}</div>
        </div>
      );
    }

    // `breakpointsBase: "container"`: os breakpoints seguem a largura do
    // próprio carrossel — no editor o canvas é um iframe redimensionado
    // pelo seletor de dispositivo, e a largura da janela não mudava.
    const per = (d) => clamp(resolveForDevice(columns, d) ?? 1, 1, 4);
    return (
      <div className={cls}>
        {css && <style>{css}</style>}
        <Swiper
          key={`${per("desktop")}-${per("tablet")}-${per("mobile")}-${g}-${autoplay ? 1 : 0}-${isEditing ? 1 : 0}`}
          className="el-testimonials__swiper"
          modules={[Pagination, Autoplay, A11y]}
          breakpointsBase="container"
          slidesPerView={per("mobile")}
          spaceBetween={g}
          breakpoints={{ 768: { slidesPerView: per("tablet") }, 1025: { slidesPerView: per("desktop") } }}
          pagination={{ clickable: true }}
          autoplay={autoplay && !isEditing ? { delay: autoplayDelay || 6000, pauseOnMouseEnter: true, disableOnInteraction: false } : false}
          a11y={{ prevSlideMessage: "Testemunho anterior", nextSlideMessage: "Testemunho seguinte", paginationBulletMessage: "Ir para o testemunho {{index}}" }}
          // Sem arrastar no editor (o arrasto do Puck é para mover blocos).
          allowTouchMove={!isEditing}
        >
          {cards.map((c, i) => (
            <SwiperSlide key={i} className="el-testimonials__slide">
              {c}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    );
  },
};

const CONTAINER_KEYS = ["display", "columns", "gap", "autoplay", "autoplayDelay", "textAlign"];
const STYLE_KEYS = ["cardStyle", "cardBackground", "starColor", "quoteColor", "nameColor", "roleColor", "accentColor", "avatarSize"];

const Testimonials = withTabs(withStyle(TestimonialsInner, { typography: true }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default Testimonials;
