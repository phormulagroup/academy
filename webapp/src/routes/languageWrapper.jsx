// src/routes/languageWrapper.tsx
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useContext, useEffect } from "react";
import i18n from "../utils/i18n"; // ajusta o caminho
import { Context } from "../utils/context";

export default function LanguageWrapper() {
	const { lang } = useParams();
	const { languages, user, selectedLanguage, setSelectedLanguage } =
		useContext(Context);
	const location = useLocation();

	// 1) valida o idioma do URL
	const isSupported =
		!!lang && languages.filter((l) => l.code === lang).length > 0;

	// Mantém o i18n, o idioma do header (selectedLanguage) e o id_lang guardado iguais ao idioma indicado,
	// também quando o idioma muda à mão no URL (ex.: /pt → /fr) e não pelo seletor
	function syncLanguage(code) {
		const language = languages.find((l) => l.code === code);
		if (!language) return;
		if (i18n.language !== code) i18n.changeLanguage(code);
		if (selectedLanguage?.id !== language.id) setSelectedLanguage(language);
		if (localStorage.getItem("id_lang") !== String(language.id))
			localStorage.setItem("id_lang", language.id);
	}

	// 3) sincronizar com o :lang do URL (antes de qualquer return: regra dos hooks)
	useEffect(() => {
		if (!isSupported) return;

		// Aluno: o idioma é sempre o do seu registo
		if (user && Object.keys(user).length > 0 && user.id_role !== 1) {
			const userLang =
				languages.filter((l) => l.id === user.id_lang)[0]?.code || "en";
			if (lang !== userLang) {
				const to = `/${userLang}/${location.pathname.split("/").slice(2).join("/")}${location.search}${location.hash}`;
				syncLanguage(userLang);
				window.history.replaceState(null, "", to); // muda o URL sem recarregar
				return;
			}
		}

		syncLanguage(lang);
	}, [lang, user, languages, isSupported]);

	// 2) se não for suportado, redireciona preservando o resto do caminho
	if (!isSupported) {
		const browserLang = navigator.language || navigator.userLanguage;
		const shortLang = browserLang.split("-")[0];
		const userLang =
			languages.filter((l) => l.code === shortLang)[0]?.code ?? "en";

		const fallback = userLang
			? userLang
			: i18n?.options?.fallbackLng?.[0] || "en";
		// reconstruir o resto do caminho sem o primeiro segmento (:lang)
		const segments = location.pathname.split("/").filter(Boolean); // ex.: ['de', 'courses', '123']
		const rest = segments.slice(1).join("/"); // ex.: 'courses/123'
		const to = `/${fallback}${rest ? `/${rest}` : ""}${location.search}${location.hash}`;
		return <Navigate to={to} replace />;
	}

	// 4) ***ESSENCIAL: renderizar as rotas-filhas***
	return <Outlet />;
}
