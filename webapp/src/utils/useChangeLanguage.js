import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Context } from "./context";

/**
 * @function useChangeLanguage
 * @returns {function} changeLanguage(code) - muda o idioma da app e recarrega a página atual nesse idioma.
 * @description Hook compartilhado para mudar idioma globalmente: atualiza i18n, sincroniza selectedLanguage no Context (usado pelo header) e id_lang no localStorage, navega para o mesmo caminho com o novo código de idioma, e exibe animação de carregamento.
 */
export default function useChangeLanguage() {
  const { languages, setSelectedLanguage, setIsLoadingLanguage } =
    useContext(Context);
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  return (lang) => {
    const selectedLang = languages.find((l) => l.code === lang);
    if (!selectedLang) return;
    localStorage.setItem("id_lang", selectedLang.id);
    i18n.changeLanguage(lang);
    setSelectedLanguage(selectedLang);
    navigate(
      `/${lang}/${window.location.pathname.split("/").slice(2).join("/")}`,
    );
    setIsLoadingLanguage(true);
    setTimeout(() => {
      setIsLoadingLanguage(false);
    }, 1500);
  };
}
