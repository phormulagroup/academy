import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, colorField, mediaField, selectField } from "../../core/fields";
import { rule } from "../../core/css";
import { mediaAlt, mediaSrc } from "../../core/helpers";
import "./styles.css";

const VARIANTS = [
  { label: "Clássica (aspas grandes)", value: "classic" },
  { label: "Barra lateral", value: "sidebar" },
  { label: "Cartão centrado", value: "card" },
];

function QuoteView({ id, text, author, role, image, variant, align, quoteMarkColor, accentColor, cardBackground, authorColor }) {
  const v = VARIANTS.some((o) => o.value === variant) ? variant : "classic";
  const src = mediaSrc(image);
  const css = rule(`[data-style-id="${id}"] .el-quote`, {
    "--el-quote-mark": quoteMarkColor,
    "--el-quote-accent": accentColor,
    "--el-quote-card": cardBackground,
    "--el-quote-author": authorColor,
    "--el-quote-align": v === "card" ? undefined : align,
  });

  return (
    <>
      {css && <style>{css}</style>}
      <figure className={`el-quote el-quote--${v}`}>
        {v !== "sidebar" && (
          <span className="el-quote__mark" aria-hidden="true">
            “
          </span>
        )}
        <blockquote className="el-quote__text">
          <p>{text}</p>
        </blockquote>
        {(author || role || src) && (
          <figcaption className="el-quote__author">
            {/* O nome já está no texto ao lado — a foto é decorativa salvo
                se o autor lhe tiver dado um texto alternativo. */}
            {src && <img className="el-quote__avatar" src={src} alt={mediaAlt(image)} loading="lazy" />}
            <span className="el-quote__who">
              {author && <span className="el-quote__name">{author}</span>}
              {role && <cite className="el-quote__role">{role}</cite>}
            </span>
          </figcaption>
        )}
      </figure>
    </>
  );
}

const QuoteInner = {
  label: "Citação",
  fields: {
    text: { type: "textarea", label: "Citação", contentEditable: true },
    author: { type: "text", label: "Autor", contentEditable: true },
    role: { type: "text", label: "Cargo / função", contentEditable: true },
    image: mediaField("Fotografia do autor", { withAlt: true }),
    variant: selectField("Estilo", VARIANTS),
    align: alignField("Alinhamento", { showIf: (p) => p.variant !== "card" }),
    quoteMarkColor: colorField("Cor das aspas", { section: "Citação" }),
    accentColor: colorField("Cor da barra / destaque", { section: "Citação" }),
    cardBackground: colorField("Fundo do cartão", { section: "Citação" }),
    authorColor: colorField("Cor do autor", { section: "Citação" }),
  },
  defaultProps: {
    text: "A educação é a arma mais poderosa que pode usar para mudar o mundo.",
    author: "Nelson Mandela",
    role: "Ex-Presidente da África do Sul",
    image: null,
    variant: "classic",
    align: "left",
    quoteMarkColor: "var(--brand-primary)",
  },
  render: (props) => <QuoteView {...props} />,
};

const Quote = withTabs(withStyle(QuoteInner, { typography: true }), {
  styleKeys: ["quoteMarkColor", "accentColor", "cardBackground", "authorColor"],
});

export default Quote;
