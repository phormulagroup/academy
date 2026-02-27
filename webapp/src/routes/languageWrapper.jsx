// src/routes/languageWrapper.tsx
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useContext, useEffect } from "react";
import i18n from "../utils/i18n"; // ajusta o caminho
import { Context } from "../utils/context";

export default function LanguageWrapper() {
  const { lang } = useParams();
  const { languages, user } = useContext(Context);
  const location = useLocation();

  // 1) valida o idioma do URL
  const isSupported = !!lang && languages.filter((l) => l.code === lang).length > 0;

  // 2) se não for suportado, redireciona preservando o resto do caminho
  if (!isSupported) {
    const fallback = i18n?.options?.fallbackLng?.[0] || "en";
    // reconstruir o resto do caminho sem o primeiro segmento (:lang)
    const segments = location.pathname.split("/").filter(Boolean); // ex.: ['de', 'courses', '123']
    const rest = segments.slice(1).join("/"); // ex.: 'courses/123'
    const to = `/${fallback}${rest ? `/${rest}` : ""}${location.search}${location.hash}`;
    return <Navigate to={to} replace />;
  }

  // 3) sincronizar i18next com o :lang do URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    if (user && Object.keys(user).length > 0) {
      const userLang = languages.filter((l) => l.id === user.id_lang)[0]?.code || "en";
      if (lang !== userLang) {
        const to = `/${userLang}${location.pathname.split("/").slice(2).join("/")}${location.search}${location.hash}`;
        window.history.replaceState(null, "", to); // muda o URL sem recarregar
      }
    }
  }, [lang, user]);

  // 4) ***ESSENCIAL: renderizar as rotas-filhas***
  return <Outlet />;
}
