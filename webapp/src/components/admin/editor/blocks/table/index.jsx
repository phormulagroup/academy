import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, colorField, switchField, textField } from "../../core/fields";
import { rule } from "../../core/css";
import "./styles.css";

// Uma linha por linha da tabela, células separadas por "|". Aceita também
// o formato Markdown (| a | b | com uma linha |---|---|), que é o que se
// costuma colar de outros sítios.
function parseTable(raw) {
  if (typeof raw !== "string") return [];
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line))
    .map((line) => {
      let l = line;
      if (l.startsWith("|")) l = l.slice(1);
      if (l.endsWith("|")) l = l.slice(0, -1);
      return l.split("|").map((c) => c.trim());
    });
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => (r.length < cols ? [...r, ...Array(cols - r.length).fill("")] : r));
}

function TableView({ id, data, caption, headerRow, firstColumnHeader, striped, bordered, compact, align, headerBackground, headerColor, stripeColor, borderColor, puck }) {
  const rows = parseTable(data);
  if (rows.length === 0) {
    return puck?.isEditing ? <div style={{ padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" }}>Escreva os dados da tabela</div> : null;
  }
  const hasHeader = headerRow !== false && rows.length > 0;
  const head = hasHeader ? rows[0] : null;
  const body = hasHeader ? rows.slice(1) : rows;

  const css = rule(`[data-style-id="${id}"] .el-table-wrap`, {
    "--el-table-head-bg": headerBackground,
    "--el-table-head-color": headerColor,
    "--el-table-stripe": stripeColor,
    "--el-table-border": borderColor,
    "--el-table-align": align,
  });

  const classes = ["el-table", striped ? "el-table--striped" : "", bordered ? "el-table--bordered" : "", compact ? "el-table--compact" : ""].filter(Boolean).join(" ");
  const captionText = typeof caption === "string" ? caption.trim() : "";

  return (
    <>
      {css && <style>{css}</style>}
      {/* Contentor com scroll horizontal focável: em telemóvel, quem usa
          teclado também consegue deslocar uma tabela larga. */}
      <div className="el-table-wrap" role="region" tabIndex={0} aria-label={captionText || "Tabela"}>
        <table className={classes}>
          {captionText && <caption>{captionText}</caption>}
          {head && (
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) =>
                  firstColumnHeader && ci === 0 ? (
                    <th key={ci} scope="row">
                      {c}
                    </th>
                  ) : (
                    <td key={ci}>{c}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const TableInner = {
  label: "Tabela",
  fields: {
    data: textField("Dados", {
      multiline: true,
      monospace: true,
      rows: 6,
      placeholder: "Coluna 1 | Coluna 2 | Coluna 3\nA | B | C",
      help: "Uma linha por linha da tabela; separe as células com |.",
    }),
    caption: textField("Legenda (opcional)"),
    headerRow: switchField("Primeira linha é cabeçalho"),
    firstColumnHeader: switchField("Primeira coluna é cabeçalho"),
    striped: switchField("Linhas alternadas (zebra)"),
    bordered: switchField("Com bordas"),
    compact: switchField("Compacta"),
    align: alignField("Alinhamento do texto"),
    headerBackground: colorField("Fundo do cabeçalho", { section: "Tabela" }),
    headerColor: colorField("Texto do cabeçalho", { section: "Tabela" }),
    stripeColor: colorField("Cor das linhas alternadas", { section: "Tabela" }),
    borderColor: colorField("Cor das bordas", { section: "Tabela" }),
  },
  defaultProps: {
    data: "Indicador | Valor de referência | Observações\nIMC normal | 18,5 – 24,9 kg/m² | Adultos\nExcesso de peso | 25 – 29,9 kg/m² | Avaliar fatores de risco\nObesidade | ≥ 30 kg/m² | Encaminhar para consulta",
    caption: "",
    headerRow: true,
    firstColumnHeader: false,
    striped: true,
    bordered: false,
    compact: false,
    align: "left",
    headerBackground: "var(--brand-primary)",
    headerColor: "#ffffff",
    stripeColor: "#f6f7f9",
    borderColor: "#e5e7eb",
  },
  render: (props) => <TableView {...props} />,
};

const Table = withTabs(withStyle(TableInner, { typography: true }), {
  containerKeys: ["headerRow", "firstColumnHeader", "striped", "bordered", "compact", "align"],
  styleKeys: ["headerBackground", "headerColor", "stripeColor", "borderColor"],
});

export default Table;
