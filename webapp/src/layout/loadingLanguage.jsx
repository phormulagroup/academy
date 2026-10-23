import { useContext } from "react";

import BialSpin from "../components/bialSpin";
import { Context } from "../utils/context";
import logo from "../assets/BIAL-Regional-Academy.png";
import "../components/app/courseLoading.css";

import { useTranslation } from "react-i18next";
import i18n from "../utils/i18n";

// Mudança de idioma: ecrã inteiro com o mesmo fundo do carregamento da plataforma, a bandeira do novo idioma em destaque
// e o spinner da Bial por baixo (sem o cartão branco sobre a arte de antes).
const LoadingLanguage = () => {
  const { languages } = useContext(Context);
  const { t } = useTranslation();
  const language = languages.find((l) => l.code === i18n.language);

  return (
    <div
      className="app-loader flex min-h-screen w-full flex-col items-center justify-center gap-6 px-6 text-center"
      role="status"
      aria-live="polite">
      <img src={logo} alt="BIAL Regional Academy" className="w-60 max-w-full h-auto mb-2" />
      {language && (
        <div className="flex flex-col items-center gap-3 animate-[language-loader-in_0.35s_ease-out_both]">
          <span
            className="block h-20 w-20 rounded-full bg-cover bg-center ring-4 ring-white shadow-[0_6px_20px_rgba(22,57,134,0.2)]"
            style={{ backgroundImage: `url(${language.flag})` }}
            aria-hidden="true"
          />
          <p lang={language.code} className="font-ryker text-lg font-semibold text-[#163986]">
            {language.name}
          </p>
        </div>
      )}
      <BialSpin size={56} label={t("Loading the selected language")} />
      <p className="text-sm text-[#5F6B7A]">{t("Loading the selected language")}...</p>
    </div>
  );
};
export default LoadingLanguage;
