import { useEffect, useRef, useState } from "react";

const sectionDomId = (id) => `settings-section-${id}`;

// Contentor que faz scroll (no admin é um contentor do layout, não a janela)
function scrollParent(el) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return window;
}

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
// janela (aqui o scroll é de um contentor do layout do admin), e destaca a secção que está a ser lida, pela posição do
// scroll: a última cujo topo já passou a linha de leitura (perto do topo); no fim da página, a última secção (as do fundo
// nunca chegam ao topo). Depois de um clique fica a escolhida até a pessoa voltar a fazer scroll (roda, toque, teclado ou
// barra), mesmo que a secção não chegue ao topo. `items`: [{ id, label, icon }].
export function SettingsSectionNav({ items, label }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  // Secção escolhida no índice: mantém o destaque até a pessoa fazer scroll por si
  const pinned = useRef(false);

  useEffect(() => {
    const sections = () => items.map((item) => ({ id: item.id, el: document.getElementById(sectionDomId(item.id)) })).filter((s) => s.el);
    const first = sections()[0]?.el;
    if (!first) return;
    const container = scrollParent(first);
    const viewTop = () => (container === window ? 0 : container.getBoundingClientRect().top);
    const atBottom = () =>
      container === window
        ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
        : container.scrollTop + container.clientHeight >= container.scrollHeight - 4;

    function update() {
      if (pinned.current) return;
      const list = sections();
      if (!list.length) return;
      if (atBottom()) return setActiveId(list[list.length - 1].id);
      const line = viewTop() + 96; // linha de leitura: um pouco abaixo do topo da área com scroll
      let current = list[0].id;
      for (const s of list) if (s.el.getBoundingClientRect().top <= line) current = s.id;
      setActiveId(current);
    }

    // Scroll feito pela pessoa (não o scroll suave do clique): o destaque volta a seguir a posição
    const release = () => {
      pinned.current = false;
    };
    const userEvents = ["wheel", "touchstart", "keydown", "mousedown"];
    update();
    container.addEventListener("scroll", update, { passive: true });
    userEvents.forEach((e) => container.addEventListener(e, release, { passive: true }));
    return () => {
      container.removeEventListener("scroll", update);
      userEvents.forEach((e) => container.removeEventListener(e, release));
    };
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
                  pinned.current = true;
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
