// Spinner de carregamento com a identidade da Bial: um rasto de 5 pontos que gira em torno do centro, do azul da marca ao
// amarelo do laço do logótipo, com pontos quase do mesmo tamanho (réplica, em CSS, da animação Trail-loading). Substitui o Lottie nos carregamentos de página.
// O tamanho vem de `size` (px) ou de uma classe (ex.: "w-24 h-24") em `className`.
const DOTS = [
  { color: "#163986", size: 0.15 }, // cabeça do rasto
  { color: "#0A8FC4", size: 0.14 },
  { color: "#00B9D6", size: 0.13 },
  { color: "#F58F6F", size: 0.12 },
  { color: "#FFC600", size: 0.11 }, // cauda: quase do mesmo tamanho, só a cor muda
];

export default function BialSpin({ size = 96, className = "", label }) {
  return (
    <span className={`bial-spin ${className}`} style={{ width: size, height: size }} role="status" aria-label={label ?? "Loading"}>
      {DOTS.map((dot, i) => (
        <span key={i} className="bial-spin-orbit" style={{ animationDelay: `${-i * 0.085}s` }}>
          <span className="bial-spin-dot" style={{ backgroundColor: dot.color, width: `${dot.size * 100}%`, height: `${dot.size * 100}%` }} />
        </span>
      ))}
    </span>
  );
}
