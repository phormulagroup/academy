import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import endpoints from "./endpoints";
import api from "./api";
import { notification, Tour } from "antd";
import i18n from "./i18n";
import { createToastApi, toastRef } from "./notify";
import { useTranslation } from "react-i18next";

export const Context = createContext();

api.init();

// Segundos entre cada consulta de novas notificações/mensagens (VITE_POLL_INTERVAL)
const POLL_INTERVAL = (Number(import.meta.env.VITE_POLL_INTERVAL) || 30) * 1000;

const ContextProvider = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);
	const [user, setUser] = useState({});
	const [roles, setRoles] = useState([]);
	const [permissions, setPermissions] = useState([]); // permissões da função do utilizador (o Admin tem sempre tudo)
	const [courses, setCourses] = useState([]);
	const [languages, setLanguages] = useState([]);
	const [selectedLanguage, setSelectedLanguage] = useState(null);
	const [notifications, setNotifications] = useState([]);
	const [unreadTicketsCount, setUnreadTicketsCount] = useState(0); // tickets com novidades por ler (ver /ticket/unreadCount)
	const [personalization, setPersonalization] = useState({});

	const unreadTicketsRef = useRef(0);
	const knownNotificationsRef = useRef(null); // ids já conhecidos (null até à 1ª leitura, para não avisar das antigas)
	const ticketsLoadedRef = useRef(false);
	const isExpiringRef = useRef(false); // evita várias mensagens quando vários pedidos falham ao mesmo tempo

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
	});

	// stack.threshold 1: a partir do 2.º toast em simultâneo ficam empilhados (só o mais recente visível, os outros por trás)
	const [notificationApi, contextNotificationHolder] = notification.useNotification({ stack: { threshold: 1 } });
	// Único componente de toasts da app (cartões de notificação), ver utils/notify.js
	const toastApi = useMemo(() => createToastApi(notificationApi), [notificationApi]);
	toastRef.current = toastApi;

	const navigate = useNavigate();

	useEffect(() => {
		getData();
		getLanguages();
	}, []);

	// Idiomas (países e traduções) alterados noutro separador, ex.: backoffice aberto em nova aba:
	// ao voltar a este separador recarrega-os (no máximo uma vez a cada 30s)
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
	}, []);

	useEffect(() => {
		getPersonalization(languages);
	}, [i18n.language]);

	// Polling: de X em X segundos procura notificações e mensagens novas (em vez de socket)
	useEffect(() => {
		if (!user.id) return;
		const timer = setInterval(() => {
			if (!document.hidden) pollUpdates(user);
		}, POLL_INTERVAL);
		const onVisible = () => !document.hidden && pollUpdates(user);
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [user.id]);

	useEffect(() => {
		unreadTicketsRef.current = unreadTicketsCount;
	}, [unreadTicketsCount]);

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

	function showToast(title, description) {
		notificationApi.open({
			type: "info",
			placement: "top",
			title: <div dangerouslySetInnerHTML={{ __html: title }}></div>,
			description: <div dangerouslySetInnerHTML={{ __html: description }}></div>,
		});
	}

	async function pollUpdates(auxUser) {
		const [notificationsRes, ticketsRes] = await Promise.allSettled([
			axios.get(endpoints.notification.readByUser, { params: { id_user: auxUser.id } }),
			axios.get(endpoints.ticket.unreadCount),
		]);

		// Notificações: avisa das que ainda não tinham aparecido e não foram lidas
		if (notificationsRes.status === "fulfilled") {
			const rows = notificationsRes.value.data;
			if (knownNotificationsRef.current) {
				rows
					.filter((n) => !knownNotificationsRef.current.has(n.id) && !n.is_read)
					.forEach((n) => showToast(n.title, n.description));
			}
			knownNotificationsRef.current = new Set(rows.map((n) => n.id));
			setNotifications(rows);
		}

		// Tickets: avisa quando há mais por ler do que na última leitura
		if (ticketsRes.status === "fulfilled") {
			const count = ticketsRes.value.data.count || 0;
			if (ticketsLoadedRef.current && count > unreadTicketsRef.current) {
				showToast(t("New ticket activity"), t("There is a new ticket or reply, go check it out!"));
			}
			ticketsLoadedRef.current = true;
			setUnreadTicketsCount(count);
		}
	}

	async function getLanguages() {
		try {
			const res = await axios.get(endpoints.language.read);
			setLanguages(res.data);
			getPersonalization(res.data);

			const auxLanguages = res.data;
			for (let i = 0; i < auxLanguages.length; i++) {
				if (auxLanguages[i].translation) {
					const translation = JSON.parse(auxLanguages[i].translation).reduce(
						(acc, item) => {
							acc[item.key] = item.value;
							return acc;
						},
						{},
					);

					// Remove old resource and add fresh translations
					i18n.removeResourceBundle(auxLanguages[i].code, "translation");
					i18n.addResourceBundle(auxLanguages[i].code, "translation", translation, true, true);
				}
			}

			const idLangStorage = localStorage.getItem("id_lang");

			setSelectedLanguage(
				res.data.filter((_l) =>
					idLangStorage
						? _l.id === parseInt(idLangStorage)
						: _l.is_default === 1,
				)[0],
			);

			// Refresh i18n to trigger re-render with updated translations
			await i18n.changeLanguage(i18n.language);
		} catch (err) {
			console.log(err);
		}
	}

	async function getCourses(auxUser) {
		try {
			const res = await axios.get(endpoints.course.read, {
				params: { id_user: auxUser ? auxUser.id : user.id },
			});
			setCourses(res.data.courses);
		} catch (err) {
			console.log(err);
		}
	}

	async function getNotifications(auxUser) {
		try {
			const res = await axios.get(endpoints.notification.readByUser, {
				params: { id_user: auxUser ? auxUser.id : user.id },
			});
			knownNotificationsRef.current = new Set(res.data.map((n) => n.id));
			setNotifications(res.data);
		} catch (err) {
			console.log(err);
		}
	}

	async function getTickets() {
		try {
			const res = await axios.get(endpoints.ticket.unreadCount);
			ticketsLoadedRef.current = true;
			setUnreadTicketsCount(res.data.count || 0);
		} catch (err) {
			console.log(err);
		}
	}

	// Token inválido/expirado: limpa a sessão, avisa uma única vez e vai para a homepage (não para o login)
	function expireSession() {
		if (isExpiringRef.current) return;
		isExpiringRef.current = true;
		localStorage.removeItem("token");
		delete axios.defaults.headers.common["Authorization"];
		setIsLoggedIn(false);
		setUser({});
		setPermissions([]);
		setNotifications([]);
		setUnreadTicketsCount(0);
		toastApi.open({
			key: "session-expired",
			type: "warning",
			content: t("Your session has expired. Please log in again."),
			duration: 6,
		});
		navigate(`/${i18n.language}`, { replace: true });
	}

	// A meio da sessão: qualquer pedido da API recusado com 401 (token expirou ou deixou de ser válido).
	// Os pedidos de /auth (login, recuperar palavra-passe, verificar token) têm tratamento próprio.
	const expireSessionRef = useRef(expireSession);
	expireSessionRef.current = expireSession;
	useEffect(() => {
		const id = axios.interceptors.response.use(
			(res) => res,
			(err) => {
				const url = err.config?.url || "";
				if (err.response?.status === 401 && !url.includes("/auth/") && localStorage.getItem("token")) expireSessionRef.current();
				return Promise.reject(err);
			},
		);
		return () => axios.interceptors.response.eject(id);
	}, []);

	async function getData() {
		let token = localStorage.getItem("token");
		if (token) {
			try {
				const res = await axios.post(endpoints.auth.verifyToken, {
					data: token,
				});
				await login({ user: res.data.user, token: token });
				getNotifications(res.data.user);
				getTickets();
				getCourses(res.data.user);
				setTimeout(() => {
					setIsLoading(false);
				}, 3000);
			} catch (err) {
				console.log(err);
				if (err.response?.status === 401) {
					// O token guardado já não é válido
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
	async function loadPermissions(auxUser, token) {
		if (!auxUser?.id_role || auxUser.id_role === 1) return setPermissions([]);
		try {
			const res = await axios.get(endpoints.permission.read, {
				params: { id_role: auxUser.id_role },
				headers: { Authorization: token },
			});
			setPermissions(res.data);
		} catch (err) {
			console.log(err);
			setPermissions([]);
		}
	}

	async function getInfoData(token) {
		try {
			const coursesList = await axios.get(endpoints.user.read, {
				headers: { Authorization: token },
			});
			setCourses(coursesList.data);
			const rolesList = await axios.get(endpoints.role.read, {
				headers: { Authorization: token },
			});
			setRoles(rolesList.data);
		} catch (err) {
			console.log(err);
		}
	}

	async function getPersonalization(languagesData) {
		if (languagesData.length === 0) return;
		try {
			const langStorage = localStorage.getItem("i18nextLng");
			// i18nextLng pode ainda ter o código do browser (ex.: "pt-PT"): usa o idioma por defeito
			const auxLanguage =
				languagesData.find((_l) => _l.code === langStorage) ??
				languagesData.find((_l) => _l.is_default === 1) ??
				languagesData[0];

			const res = await axios.get(endpoints.personalization.readByLang, {
				params: { id_lang: auxLanguage.id },
			});
			setPersonalization(
				res.data.filter((s) => s.name === "homepage_text")[0] ?? {},
			);
		} catch (err) {
			console.log(err);
		}
	}

	async function logout() {
		localStorage.removeItem("token");
		const auxUser = JSON.parse(JSON.stringify(user));
		setIsLoggedIn(false);
		setIsLoading(true);
		setUser({});
		setPermissions([]);
		navigate(`/${i18n.language}/login`);
		createLog({
			id_user: auxUser.id,
			action: "logout",
			id_lang:
				auxUser.id_role !== 1
					? languages.filter((l) => l.code === i18n.language)[0].id
					: selectedLanguage.id,
		});
		setTimeout(() => {
			setIsLoading(false);
		}, 1000);
	}

	function login(res) {
		isExpiringRef.current = false;
		localStorage.setItem("token", res.token);
		api.token(res.token);
		getInfoData(res.token);
		setUser(res.user);
		const loading = loadPermissions(res.user, res.token);

		console.log(window.location.pathname);

		setIsLoggedIn(true);
		return loading;
	}

	async function createLog(obj) {
		try {
			const res = await axios.post(endpoints.logs.create, {
				data: obj,
			});
		} catch (err) {
			console.log(err);
		}
	}

	function create(obj) {
		return new Promise(async (resolve, reject) => {
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
				resolve(res);
			} catch (err) {
				toastApi.open({
					type: "error",
					content: t("Something went wrong, please try again"),
				});
				reject(err);
			}
		});
	}

	function update(obj) {
		return new Promise(async (resolve, reject) => {
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
				resolve(res);
			} catch (err) {
				toastApi.open({
					type: "error",
					content: t("Something went wrong, please try again"),
				});
				reject(err);
			}
		});
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
				isLoadingLanguage,
				setIsLoadingLanguage,
				t,
				roles,
				setRoles,
				permissions,
				isStaff: user?.id_role === 1 || permissions.some((p) => p.can_read),
				windowDimension,
				setWindowDimension,
				selectedLanguage,
				setSelectedLanguage,
				notifications,
				setNotifications,
				unreadTicketsCount,
				setUnreadTicketsCount,
				personalization, 
				getPersonalization
			}}
		>
			{contextNotificationHolder}
			{children}
		</Context.Provider>
	);
};

export default ContextProvider;
