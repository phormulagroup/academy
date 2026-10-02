import { useEffect, useState } from "react";

const sectionDomId = (id) => `settings-section-${id}`;

// Cartão de uma secção de uma página de definições (ícone, título, descrição e uma ação opcional à direita).
// Usado nas Definições do curso e nos detalhes do certificado, para as páginas longas terem a mesma organização.
export function SettingsSection({ id, icon, title, description, extra, children }) {
  return (
    <section id={id ? sectionDomId(id) : undefined} className="rounded-[15px] border border-solid border-[#E5E7EB] bg-white mb-5 scroll-mt-4">
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-0 border-b border-solid border-[#F0F0F0]">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#163986]/10 text-[18px] text-[#163986]">{icon}</span>
          <div className="min-w-0">
            <p className="text-[16px] font-bold mb-0!">{title}</p>
            {description && <p className="text-[12px] text-[#8A8D98] mb-0!">{description}</p>}
          </div>
        </div>
        {extra}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// Índice lateral (só em ecrãs largos). Salta para a secção com scrollIntoView em vez do antd Anchor, que assume scroll da
// janela (aqui o scroll é de um contentor do layout do admin), e destaca a secção que está à vista (IntersectionObserver,
// que funciona com qualquer contentor de scroll). `items`: [{ id, label, icon }].
export function SettingsSectionNav({ items, label }) {
  const [activeId, setActiveId] = useState(items[0]?.id);

  useEffect(() => {
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.dataset.sectionId;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        // A 1.ª secção (pela ordem do índice) que cruza a faixa de leitura; se nenhuma cruzar (ex.: no espaço entre
        // cartões), mantém a anterior
        const first = items.find((item) => visible.has(item.id));
        if (first) setActiveId(first.id);
      },
      // Faixa fina perto do topo do ecrã: conta como "a ler" a secção que a atravessa, não a que só aparece ao fundo
      { rootMargin: "-15% 0px -70% 0px" },
    );
    items.forEach((item) => {
      const el = document.getElementById(sectionDomId(item.id));
      if (el) {
        el.dataset.sectionId = item.id;
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className="hidden lg:block sticky top-4 self-start">
      <ul className="list-none! m-0! p-0! flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id} className="list-none">
              <button
                type="button"
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  setActiveId(item.id);
                  document.getElementById(sectionDomId(item.id))?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex w-full items-center gap-2 rounded-[10px] border-0 px-3 py-2 text-left text-[13px] cursor-pointer transition-colors ${
                  isActive ? "bg-[#163986]/10 text-[#163986] font-medium" : "bg-transparent text-[#707070] hover:bg-[#F6F7F9] hover:text-[#163986]"
                }`}>
                <span className="text-[16px]">{item.icon}</span>
                <span className="leading-snug">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
