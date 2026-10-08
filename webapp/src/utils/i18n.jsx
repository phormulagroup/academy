import i18n from "i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import axios from "axios";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    // O React já escapa o que mostra: sem isto os valores das traduções saem escapados (por exemplo 03/10/2026 → 03&#x2F;10&#x2F;2026)
    interpolation: { escapeValue: false },
    ns: ["translation"],
    resources: {},
  });

// Idioma ativo da app (seletor do header ou do formulário) em todos os pedidos: a API usa-o nos e-mails que a equipa recebe pelas suas
// próprias ações (o aluno recebe sempre no idioma da sua conta)
const setRequestLanguage = (lng) => {
  if (lng) axios.defaults.headers.common["X-Lang"] = lng;
};
setRequestLanguage(i18n.language);
i18n.on("languageChanged", setRequestLanguage);

export default i18n;
