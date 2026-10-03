import { LuPlus } from "react-icons/lu";

// Cartão de "adicionar" das listas dos formulários (adicionar um ficheiro, um material...): o mesmo estilo do campo de ficheiros vazio
// (borda tracejada, cantos arredondados e convite). `compact` é a versão baixa, para listas longas.
export default function AddTile({ label, onClick, icon, compact = false, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group w-full ${compact ? "h-20" : "h-37.5"} rounded-xl border-2 border-dashed border-[#D0D4DC] bg-[#FAFAFB] text-[#8A8D98] cursor-pointer transition-colors hover:border-[#163986] hover:text-[#163986] disabled:cursor-not-allowed disabled:opacity-50 flex ${compact ? "flex-row gap-2.5" : "flex-col gap-1.5"} items-center justify-center`}>
      <span className={compact ? "text-[20px]" : "text-[28px]"}>{icon || <LuPlus />}</span>
      <span className="text-[12px] leading-snug">{label}</span>
    </button>
  );
}
