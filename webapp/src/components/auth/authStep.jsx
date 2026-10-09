import BialSpin from "../bialSpin";

/**
 * Peças visuais partilhadas pelos passos dos formulários de autenticação (verificação em dois passos do login e
 * recuperação de password): cabeçalho com ícone, ecrã de carregamento e ecrã de sucesso, todos com a transição .auth-step.
 */

// Cabeçalho de um passo: ícone num círculo Bial, título (Ryker) e descrição. tone: "warning" (laranja) ou "danger" (vermelho)
// para passos de estado (ex.: conta pendente ou não aprovada)
export function AuthStepHeader({ icon, title, tone, children }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 sm:gap-4 mb-7 sm:mb-8">
      <div className={`auth-otp-icon${tone ? ` auth-otp-icon--${tone}` : ""}`}>{icon}</div>
      <p className="font-ryker font-bold text-[#163986] text-[17px] sm:text-[19px] mt-1 sm:mt-2">{title}</p>
      {children && <div className="text-[13px] sm:text-sm text-[#707070] max-w-80 leading-relaxed sm:leading-[1.75]">{children}</div>}
    </div>
  );
}

// Transição entre passos: carregamento com a identidade Bial (ex.: "A enviar o código")
export function AuthStepLoading({ title, subtitle }) {
  return (
    <div className="auth-step flex flex-col items-center justify-center text-center py-8">
      <BialSpin size={76} label={title} />
      <p className="font-ryker font-bold text-[#163986] text-[17px] sm:text-[19px] mt-7">{title}</p>
      {subtitle && <p className="text-[#707070] text-[13px] sm:text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

// Sucesso: círculo e visto desenhados (traço animado) com a mensagem
export function AuthStepSuccess({ title, subtitle }) {
  return (
    <div className="auth-step auth-otp-success" role="status" aria-live="polite">
      <svg className="auth-otp-check" viewBox="0 0 52 52" aria-hidden="true">
        <circle className="auth-otp-check-circle" cx="26" cy="26" r="24" fill="none" />
        <path className="auth-otp-check-mark" fill="none" d="M15 27l7 7 15-16" />
      </svg>
      <p className="font-ryker font-bold text-[#163986] text-[18px] sm:text-[20px] mt-6">{title}</p>
      {subtitle && <p className="text-[#707070] text-[13px] sm:text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

// Link de ação dos passos (reenviar, outra conta...): azul Bial, amarelo no hover, como os links do formulário de login
export const authLinkClass =
  "inline-flex items-center gap-1 text-[#163986] font-semibold underline hover:text-[#FFC600] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default";
