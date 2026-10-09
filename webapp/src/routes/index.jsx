import {
	Navigate,
	Route,
	Routes,
	useParams,
	useRoutes,
} from "react-router-dom";
import { ConfigProvider } from "antd";
import { Context } from "../utils/context";
import { useContext, useEffect } from "react";

import Loading from "../layout/loading";
import LoadingLanguage from "../layout/loadingLanguage";

import { adminRoutes } from "./routesAdmin";
import { userRoutes } from "./routesUser";
import { publicRoutes } from "./routesPublic";
import LanguageWrapper from "./languageWrapper";
import i18n from "../utils/i18n";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";

export default function AppRoutes() {
	const { isLoggedIn, isLoading, isLoadingLanguage, user, languages, isStaff, isStaffKnown } =
		useContext(Context);
	const { lang } = useParams();

	const finalRoutes = (() => {
		if (isLoading || isLoadingLanguage || !languages || languages.length === 0)
			return null;

		// PUBLIC
		if (!isLoggedIn || !user) {
			return [
				{
					path: "/",
					element: (
						<Navigate to={`/${i18n.language ?? userLang?.code}`} replace />
					),
				},
				{
					path: ":lang",
					element: <LanguageWrapper />,
					children: publicRoutes,
				},
				{
					path: "*",
					element: <Navigate to={`/${lang}`} replace />,
				},
			];
		}

		// BACKOFFICE: Admin ou função com acesso a pelo menos uma secção
		if (isStaff) {
			return [
				...adminRoutes,
				{
					path: ":lang/login",
					element: <Navigate to={`/${i18n.language}`} replace />,
				},
				{
					path: "/",
					element: <Navigate to={`/${i18n.language}`} replace />,
				},
				{
					path: ":lang",
					element: <LanguageWrapper />,
					children: userRoutes,
				},
			];
		} else {
			// USER NORMAL: vai para o idioma da sua conta. Logo depois do login ainda não se sabe se a conta é da equipa (as permissões
			// chegam a seguir): até lá fica no idioma atual, para um Gestor não ser levado para o idioma da conta
			const homeLang = isStaffKnown ? languages.filter((l) => l.id === user.id_lang)[0]?.code || "en" : i18n.language;
			return [
				{
					path: ":lang/login",
					element: (
						<Navigate
							to={`/${homeLang}`}
							replace
						/>
					),
				},
				{
					path: "/",
					element: (
						<Navigate
							to={`/${homeLang}`}
							replace
						/>
					),
				},
				{
					path: ":lang",
					element: <LanguageWrapper />,
					children: userRoutes,
				},
			];
		}
	})();

	// useRoutes é um hook: tem de ser chamado sempre (lista vazia enquanto carrega), senão a ordem dos hooks
	// muda entre renders e a navegação pode ficar num estado errado até recarregar a página
	const element = useRoutes(finalRoutes ?? []);

	return (
		<ConfigProvider
			theme={{
				token: {
					colorPrimary: "#163986",
					// Texto, títulos/labels e placeholders dos componentes antd (front e backoffice)
					colorText: "#163986",
					colorTextHeading: "#163986",
					colorTextPlaceholder: "#8b9cc3",
					fontFamily: "Poppins",
					blue: "#00b9d6",
					controlInteractiveSize: 20,
				},
			}}
		>
			{isLoading ? (
				<Loading />
			) : isLoadingLanguage ? (
				<LoadingLanguage />
			) : (
				element
			)}
		</ConfigProvider>
	);
}
