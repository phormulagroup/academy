import { responsive, unitField } from "../../core/fields";
import { responsiveRules, own, unitToCss } from "../../core/css";

// Sem separadores de estilo — é só um espaço vazio. `size` era o valor
// antigo ("24px"); `direction` deixou de existir (horizontal/ambos numa
// coluna de blocos nunca teve efeito visível).
export const Space = {
  label: "Espaçador",
  fields: {
    height: responsive(unitField("Altura", { units: ["px", "vh"], maxByUnit: { px: 400, vh: 50 } })),
  },
  defaultProps: {
    height: { desktop: { value: 32, unit: "px" } },
  },
  render: ({ id, height, size, puck }) => {
    const sel = `[data-space-id="${id}"]`;
    const css = responsiveRules(sel, (d) => ({ height: unitToCss(own(height, d)) ?? (d === "desktop" && size ? size : undefined) }));
    return (
      <div
        data-space-id={id}
        aria-hidden="true"
        style={{
          height: 32,
          width: "100%",
          background: puck?.isEditing ? "repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.035) 6px 12px)" : undefined,
        }}
      >
        {css && <style>{css}</style>}
      </div>
    );
  },
};
