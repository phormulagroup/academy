import { useTranslation } from "react-i18next";
import { RxChevronUp } from "react-icons/rx";

import useScrollToTop from "../../utils/scrollToTop";

// Botão "voltar ao topo" do footer do site: fica no fluxo da página (não flutua por cima do conteúdo) e funciona quer o scroll seja
// da janela quer de um contentor interno (o hook guarda o último elemento onde houve scroll)
export default function ScrollToTopButton() {
  const { t } = useTranslation();
  const { scrollToTop } = useScrollToTop();

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={t("Scroll to top")}
      title={t("Scroll to top")}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-[#FFC600] text-black shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      <RxChevronUp className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
