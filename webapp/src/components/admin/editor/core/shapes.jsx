// Separadores de forma (topo/fundo de um contentor), como os "Shape
// Dividers" do Elementor. Desenhados num viewBox 1000×100 e esticados.
const PATHS = {
  wave: "M0,60 C150,100 350,0 500,40 C650,80 850,10 1000,50 L1000,100 L0,100 Z",
  waves: "M0,50 C100,80 200,20 300,50 C400,80 500,20 600,50 C700,80 800,20 900,50 C950,65 975,60 1000,50 L1000,100 L0,100 Z",
  curve: "M0,100 C250,0 750,0 1000,100 Z",
  curveAsym: "M0,100 C200,10 600,0 1000,80 L1000,100 Z",
  triangle: "M0,100 L500,0 L1000,100 Z",
  tilt: "M0,100 L1000,0 L1000,100 Z",
  arrow: "M0,100 L0,85 L460,85 L500,40 L540,85 L1000,85 L1000,100 Z",
  zigzag: "M0,100 L0,60 L50,20 L100,60 L150,20 L200,60 L250,20 L300,60 L350,20 L400,60 L450,20 L500,60 L550,20 L600,60 L650,20 L700,60 L750,20 L800,60 L850,20 L900,60 L950,20 L1000,60 L1000,100 Z",
  mountains: "M0,100 L150,40 L300,80 L450,10 L600,70 L750,30 L900,75 L1000,45 L1000,100 Z",
};

export const SHAPE_OPTIONS = [
  { label: "Nenhum", value: "" },
  { label: "Onda", value: "wave" },
  { label: "Ondas", value: "waves" },
  { label: "Curva", value: "curve" },
  { label: "Curva assimétrica", value: "curveAsym" },
  { label: "Triângulo", value: "triangle" },
  { label: "Inclinado", value: "tilt" },
  { label: "Seta", value: "arrow" },
  { label: "Ziguezague", value: "zigzag" },
  { label: "Montanhas", value: "mountains" },
];

export function ShapeDivider({ position = "bottom", shape, color = "#ffffff", height = 60, flip, front }) {
  const d = PATHS[shape];
  if (!d) return null;
  const isTop = position === "top";
  const transforms = [isTop ? "rotate(180deg)" : "", flip ? "scaleX(-1)" : ""].filter(Boolean).join(" ");
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [isTop ? "top" : "bottom"]: -1,
        height,
        lineHeight: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: front ? 2 : 0,
        transform: transforms || undefined,
      }}
    >
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
        <path d={d} fill={color} />
      </svg>
    </div>
  );
}
