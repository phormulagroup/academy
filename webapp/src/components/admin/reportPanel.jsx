// Peças comuns dos painéis expandidos dos relatórios (cursos e testes)

// Cartão de um número-resumo do painel
export function Kpi({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-[#ECEEF1] bg-white px-4 py-3">
      <span className="text-[12px] text-[#8A8D98]">{label}</span>
      <span className="text-[22px] font-bold leading-none">{value}</span>
      {hint && <span className="text-[11px] text-[#8A8D98]">{hint}</span>}
    </div>
  );
}

// Rótulo de um filtro com a contagem numa etiqueta (cor da marca quando ativo)
export function FilterLabel({ text, count, active }) {
  return (
    <span className="inline-flex items-center gap-2 px-1">
      {text}
      <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none ${active ? "bg-[#163986] text-white" : "bg-[#ECEEF1] text-[#5B5F6B]"}`}>
        {count}
      </span>
    </span>
  );
}
