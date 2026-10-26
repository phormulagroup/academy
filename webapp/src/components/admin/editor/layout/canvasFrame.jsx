// Moldura do canvas do editor. Na Academy o conteúdo de um tópico aparece sozinho (sem cabeçalho nem rodapé do site, ao contrário do CPR):
// só uma folga à volta e o fundo claro que o aluno vê.
export default function CanvasFrame({ children }) {
  return <div className="ed-canvas-frame">{children}</div>;
}
