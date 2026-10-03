import i18n from "i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

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

export default i18n;
