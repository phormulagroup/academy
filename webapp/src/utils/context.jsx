import React, { useEffect, useMemo, useRef, useState } from "react";
import { createContext } from "react";
import { LuBellRing } from "react-icons/lu";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

import endpoints from "./endpoints";
import api from "./api";
import { notification, Tour } from "antd";
import i18n from "./i18n";
import { createToastApi, toastRef } from "./notify";
import { useTranslation } from "react-i18next";
import { ADMIN_ROLE_ID, hasFullAccess } from "./roles";
import { ACTIVITY_KEY, touchActivity } from "./useIdleLock";
import { clearLegacyToken, clearStoredSession, getLegacyToken, getStoredSession, saveSession } from "./sessionStore";
import useLanguages from "./useLanguages";
import useMenuBadges from "./useMenuBadges";
import useSessionGuard from "./useSessionGuard";
import useUpdates from "./useUpdates";
import { sanitizeHtml } from "./sanitizeHtml";

export const Context = createContext();

// Primeiro contacto com a API (define o endereço base). Se falhar, o ecrã de "servidor em baixo" (utils/serverStatus.js) trata do aviso:
// o erro não pode ficar por tratar (rejeição sem catch), senão rebenta também quem importa este módulo sem API (testes, CI)
api.init().catch(() => {});

const ContextProvider = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isIdleLocked, setIsIdleLocked] = useState(false); // sessão bloqueada por inatividade (modal para voltar a entrar com a palavra-passe)
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);
	const [user, setUser] = useState({});
	const [roles, setRoles] = useState([]);
	const [permissions, setPermissions] = useState([]); // permissões da função do utilizador (o Admin tem sempre tudo)
	// De quem são as permissões carregadas: até chegarem não se sabe se uma conta (ex.: Gestor) é da equipa
	const [permissionsUserId, setPermissionsUserId] = useState(null);
	const [courses, setCourses] = useState([]);

	const isExpiringRef = useRef(false); // evita várias mensagens quando vários pedidos falham ao mesmo tempo
	const needsFullLoadRef = useRef(false); // a página abriu com a sessão já bloqueada: só se conhece a identidade, falta carregar o resto ao desbloquear

	const [windowDimension, setWindowDimension] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});

	const { t } = useTranslation();

	const [tablesName] = useState({
		user: t("User"),
		course: t("Course"),
		course_certificate: t("Certificate"),
		test: t("Test"),
		language: t("Language"),
		document: t("Document"),
		download: t("Download"),
		personalization: t("Personalization"),
		userGroup: t("User group"),
		faqs: t("FAQ"),
	});

	// stack.threshold 1: a partir do 2.º toast em simultâneo ficam empilhados (só o mais recente visível, os outros por trás)
	const [notificationApi, contextNotificationHolder] = notification.useNotification({ stack: { threshold: 1 } });
	// Único componente de toasts da app (cartões de notificação), ver utils/notify.js
	const toastApi = useMemo(() => createToastApi(notificationApi), [notificationApi]);
	toastRef.current = toastApi;

	const navigate = useNavigate();

	// Idiomas, traduções e texto da página inicial (utils/useLanguages.js)
	const { languages, selectedLanguage, setSelectedLanguage, personalization, getLanguages, loadTranslation, getPersonalization } = useLanguages();

	// Quem tem acesso ao backoffice (Admin ou alguma secção): é a ele que se pedem os sinais do menu
	const isStaff = hasFullAccess(user) || permissions.some((p) => p.can_read);
	const { menuBadges, refreshMenuBadges } = useMenuBadges({ userId: user.id, isStaff });

	// Aviso de notificação nova ou de atividade num ticket: cartão com o sino da marca; clicar leva à página respetiva (`to`)
	function showToast(title, description, to) {
		notificationApi.open({
			type: "info",
			placement: "top",
			icon: <LuBellRing style={{ color: "#00B9D6" }} aria-hidden="true" />,
			className: "platform-toast",
			showProgress: true,
			pauseOnHover: true,
			onClick: to ? () => navigate(to) : undefined,
			style: to ? { cursor: "pointer" } : undefined,
			title: <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }}></div>,
			description: <div className="line-clamp-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}></div>,
		});
	}

	// Notificações e tickets por ler, com polling (utils/useUpdates.js)
	const { notifications, setNotifications, unreadTicketsCount, setUnreadTicketsCount, getNotifications, getTickets, resetUpdates } = useUpdates({
		user,
		locked: isIdleLocked,
		showToast,
		refreshMenuBadges,
		paths: { notifications: isStaff ? null : `/${i18n.language}/notifications`, tickets: isStaff ? "/admin/tickets" : `/${i18n.language}/tickets` },
	});

	useEffect(() => {
		getData();
		// Só no arranque
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const detectSize = () => {
			setWindowDimension({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};
		window.addEventListener("resize", detectSize);

		return () => {
			window.removeEventListener("resize", detectSize);
		};
	}, [windowDimension]);

	// Limpa tudo o que é da sessão (em memória e no browser); o cookie HttpOnly apaga-se na API (POST /auth/logout)
	function clearSessionState() {
		clearStoredSession();
		clearLegacyToken();
		localStorage.removeItem(ACTIVITY_KEY);
		needsFullLoadRef.current = false;
		setIsIdleLocked(false);
		setIsLoggedIn(false);
		setUser({});
		setPermissions([]);
		setPermissionsUserId(null);
	}

	// Sessão inválida/expirada: limpa a sessão, avisa uma única vez e vai para a homepage (não para o login)
	function expireSession() {
		if (isExpiringRef.current) return;
		isExpiringRef.current = true;
		clearSessionState();
		axios.post(endpoints.auth.logout).catch(() => {});
		resetUpdates();
		toastApi.open({
			key: "session-expired",
			type: "warning",
			content: t("Your session has expired. Please log in again."),
			duration: 6,
		});
		navigate(`/${i18n.language}`, { replace: true });
	}

	// Vigia a sessão: fim da sessão, 401 da API e bloqueio por inatividade (utils/useSessionGuard.js)
	useSessionGuard({ userId: user.id, isLocked: isIdleLocked, lock: () => setIsIdleLocked(true), expire: expireSession });

	async function getData() {
		const legacyToken = getLegacyToken();
		if (getStoredSession() || legacyToken) {
			try {
				// A sessão vai no cookie; uma sessão guardada antes dos cookies (token no browser) é trocada uma vez
				const res = await axios.post(endpoints.auth.verifyToken, legacyToken ? { data: legacyToken } : {});
				if (legacyToken) clearLegacyToken();
				if (res.data.idle) {
					// Browser fechado ou computador a dormir mais do que o limite de inatividade: entra bloqueado (pede a palavra-passe)
					saveSession(res.data.session);
					needsFullLoadRef.current = true;
					setUser(res.data.user);
					setIsLoggedIn(true);
					setIsIdleLocked(true);
				} else {
					await login({ user: res.data.user, session: res.data.session });
					getNotifications(res.data.user);
					getTickets();
				}
				setTimeout(() => {
					setIsLoading(false);
				}, 3000);
			} catch (err) {
				console.log(err);
				if (err.response?.status === 401) {
					// A sessão guardada já não é válida
					if (legacyToken) clearLegacyToken();
					expireSession();
				} else {
					setIsLoggedIn(false);
					navigate(`/${i18n.language}/login`);
				}
				setTimeout(() => {
					setIsLoading(false);
				}, 3000);
			}
		} else {
			if (window.location.pathname.includes("admin"))
				navigate(`/${i18n.language}/login`);
			setTimeout(() => {
				setIsLoading(false);
			}, 3000);
		}
	}

	// Permissões da função do utilizador, para mostrar só o que pode usar no backoffice (o servidor volta a validar tudo)
	async function loadPermissions(auxUser) {
		// O Admin tem tudo; as outras funções (incluindo o Gestor) seguem a sua matriz
		if (!auxUser?.id_role || Number(auxUser.id_role) === ADMIN_ROLE_ID) {
			setPermissions([]);
			setPermissionsUserId(auxUser?.id ?? null);
			return;
		}
		try {
			const res = await axios.get(endpoints.permission.read, {
				params: { id_role: auxUser.id_role },
			});
			setPermissions(res.data);
		} catch (err) {
			console.log(err);
			setPermissions([]);
		}
		setPermissionsUserId(auxUser.id);
	}

	async function getInfoData() {
		try {
			const rolesList = await axios.get(endpoints.role.read);
			setRoles(rolesList.data);
		} catch (err) {
			console.log(err);
		}
	}

	async function logout() {
		const auxUser = JSON.parse(JSON.stringify(user));
		clearSessionState();
		setIsLoading(true);
		navigate(`/${i18n.language}/login`);
		// O registo do logout ainda precisa da sessão: só depois se apaga o cookie
		Promise.resolve(
			createLog({
				id_user: auxUser.id,
				action: "logout",
				id_lang:
					!hasFullAccess(auxUser)
						? languages.filter((l) => l.code === i18n.language)[0].id
						: selectedLanguage.id,
			}),
		).finally(() => axios.post(endpoints.auth.logout).catch(() => {}));
		setTimeout(() => {
			setIsLoading(false);
		}, 1000);
	}

	// Voltar a entrar a partir do bloqueio por inatividade: a API já renovou o cookie. Se a página abriu bloqueada, só agora se carrega o resto.
	async function resumeSession(res) {
		isExpiringRef.current = false;
		saveSession(res.session);
		touchActivity();
		if (needsFullLoadRef.current) {
			needsFullLoadRef.current = false;
			await login({ user: res.user, session: res.session });
			getNotifications(res.user);
			getTickets();
		}
		setIsIdleLocked(false);
	}

	function login(res) {
		isExpiringRef.current = false;
		saveSession(res.session);
		touchActivity();
		getInfoData();
		setUser(res.user);
		const loading = loadPermissions(res.user);
		setIsLoggedIn(true);
		return loading;
	}

	async function createLog(obj) {
		try {
			await axios.post(endpoints.logs.create, {
				data: obj,
			});
		} catch (err) {
			console.log(err);
		}
	}

	async function create(obj) {
		try {
			const res = await axios.post(endpoints[obj.table].create, {
				data: obj.data,
			});
			createLog({
				id_user: user.id,
				action: "create",
				table_name: obj.table,
				meta_data: JSON.stringify({ ...obj.data, id: res.insertId }),
				id_lang: selectedLanguage.id,
			});
			toastApi.open({
				type: "success",
				content: `${tablesName[obj.table]} ${t("was successfully created")}.`,
			});
			return res;
		} catch (err) {
			toastApi.open({
				type: "error",
				content: t("Something went wrong, please try again"),
			});
			throw err;
		}
	}

	async function update(obj) {
		try {
			const res = await axios.post(endpoints[obj.table].update, {
				data: obj.data,
			});
			createLog({
				id_user: user.id,
				action: "update",
				table_name: obj.table,
				meta_data: JSON.stringify(obj.data),
				id_lang: selectedLanguage.id,
			});
			toastApi.open({
				type: "success",
				content: `${tablesName[obj.table]} ${t("was successfully updated")}.`,
			});
			return res;
		} catch (err) {
			toastApi.open({
				type: "error",
				content: t("Something went wrong, please try again"),
			});
			throw err;
		}
	}

	return (
		<Context.Provider
			value={{
				isLoggedIn,
				setIsLoggedIn,
				user,
				setUser,
				login,
				logout,
				isLoading,
				setIsLoading,
				toastApi,
				notificationApi,
				createLog,
				update,
				create,
				courses,
				setCourses,
				languages,
				getLanguages,
				loadTranslation,
				isLoadingLanguage,
				setIsLoadingLanguage,
				t,
				roles,
				setRoles,
				permissions,
				isStaff,
				// Já se sabe se o utilizador com sessão é da equipa (as permissões dele foram carregadas)
				isStaffKnown: !!user?.id && permissionsUserId === user.id,
				windowDimension,
				setWindowDimension,
				selectedLanguage,
				setSelectedLanguage,
				notifications,
				setNotifications,
				unreadTicketsCount,
				menuBadges,
				refreshMenuBadges,
				isIdleLocked,
				resumeSession,
				setUnreadTicketsCount,
				personalization,
				getPersonalization,
			}}
		>
			{/* Título por defeito: o react-helmet não repõe o título quando a página que o definiu desmonta (ex.: logout ou páginas
			sem Helmet), por isso fica sempre este como base e as páginas sobrepõem-no */}
			<Helmet defaultTitle="Bial Regional Academy">
				<title>Bial Regional Academy</title>
			</Helmet>
			{contextNotificationHolder}
			{children}
		</Context.Provider>
	);
};

export default ContextProvider;
