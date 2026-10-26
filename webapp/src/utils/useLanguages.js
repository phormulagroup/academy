import { useEffect, useRef, useState } from "react";
import axios from "axios";

import endpoints from "./endpoints";
import i18n from "./i18n";

/**
 * @function useLanguages
 * @description Idiomas da plataforma: a lista (sem traduções), as traduções de cada língua (com cache do browser), o idioma escolhido
 * e o texto de personalização da página inicial. Recarrega-se ao voltar ao separador (no máximo uma vez a cada 30 s), para apanhar
 * idiomas alterados noutro separador (ex.: backoffice aberto numa nova aba).
 */
export default function useLanguages() {
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [personalization, setPersonalization] = useState({});

  // Traduções por língua, com cache do browser (o URL leva a versão, por isso só se volta a descarregar quando mudam)
  const loadedTranslationsRef = useRef({}); // código → versão já carregada
  async function loadTranslation(language) {
    if (!language?.has_translation || loadedTranslationsRef.current[language.code] === language.version) return;
    const res = await axios.get(endpoints.language.translation, { params: { code: language.code, v: language.version } });
    const translation = (res.data || []).reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    i18n.removeResourceBundle(language.code, "translation");
    i18n.addResourceBundle(language.code, "translation", translation, true, true);
    loadedTranslationsRef.current[language.code] = language.version;
  }

  async function getPersonalization(languagesData) {
    if (languagesData.length === 0) return;
    try {
      const langStorage = localStorage.getItem("i18nextLng");
      // i18nextLng pode ainda ter o código do browser (ex.: "pt-PT"): usa o idioma por defeito
      const auxLanguage = languagesData.find((_l) => _l.code === langStorage) ?? languagesData.find((_l) => _l.is_default === 1) ?? languagesData[0];

      const res = await axios.get(endpoints.personalization.readByLang, {
        params: { id_lang: auxLanguage.id },
      });
      setPersonalization(res.data.filter((s) => s.name === "homepage_text")[0] ?? {});
    } catch (err) {
      console.log(err);
    }
  }

  async function getLanguages() {
    try {
      // Só a lista (sem as traduções): as traduções vêm a seguir, a da língua em uso primeiro
      const res = await axios.get(endpoints.language.read, { params: { light: 1 } });
      setLanguages(res.data);
      getPersonalization(res.data);

      const auxLanguages = res.data;
      // Idioma escolhido: fonte única. No backoffice manda o id_lang guardado (escolha da equipa); no site manda o idioma em uso
      // (vem do :lang do URL, que o LanguageWrapper sincroniza com o id_lang). Antes o id_lang era aplicado ao header sem mudar o
      // i18n, e como isto volta a correr ao regressar ao separador o header/idioma pareciam mudar sozinhos
      const idLangStorage = localStorage.getItem("id_lang");
      const stored = auxLanguages.find((l) => l.id === parseInt(idLangStorage));
      const byCode = auxLanguages.find((l) => l.code === i18n.language);
      const fallback = auxLanguages.find((l) => l.is_default === 1);
      const isAdminPath = window.location.pathname.startsWith("/admin");
      const current = (isAdminPath ? (stored ?? byCode) : (byCode ?? stored)) ?? fallback;
      await loadTranslation(current).catch((err) => console.log(err));

      if (current) {
        setSelectedLanguage(current);
        if (localStorage.getItem("id_lang") !== String(current.id)) localStorage.setItem("id_lang", current.id);
      }

      // Garante que o i18n fica no mesmo idioma do header (também refresca as traduções carregadas). No backoffice o idioma do
      // seletor só filtra os dados: os textos ficam no idioma da conta (layout/admin.jsx), por isso aqui não se muda o i18n
      await i18n.changeLanguage(isAdminPath ? i18n.language : (current?.code ?? i18n.language));

      // As restantes línguas carregam em segundo plano (ficam em cache; trocar de língua é então imediato)
      Promise.all(auxLanguages.filter((l) => l !== current).map((l) => loadTranslation(l).catch(() => {}))).then(() => i18n.changeLanguage(i18n.language));
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    getLanguages();
    // Só no arranque; as funções fecham sobre estado estável
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let lastLoad = Date.now();
    const onFocus = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastLoad < 30000) return;
      lastLoad = Date.now();
      getLanguages();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getPersonalization(languages);
    // O texto da página inicial acompanha o idioma em uso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  return { languages, selectedLanguage, setSelectedLanguage, personalization, getLanguages, loadTranslation, getPersonalization };
}
