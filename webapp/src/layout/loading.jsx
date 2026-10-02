import LottieAnim from "../components/lottieAnimations";
import "../components/app/courseLoading.css";

// Carregamento principal da app: o logótipo animado e, por baixo, a barra a deslizar (a mesma do ecrã de entrada no e-Learning),
// sobre o azul claro que a Bial usa como fundo no resto do site.
const Loading = () => {
  return (
    <div className="app-loader flex min-h-screen w-full flex-col items-center justify-center px-6" role="status" aria-live="polite">
      {/* multiply: o fundo branco do Lottie funde-se com o azul claro da página, mantendo as cores do logótipo */}
      <div className="mb-6 w-[600px] max-w-full" style={{ mixBlendMode: "multiply" }}>
        <LottieAnim />
      </div>
      <div className="app-loader-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
};
export default Loading;
