import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  ConfigProvider,
  Divider,
  Drawer,
  Layout,
  Menu,
  Tooltip,
} from "antd";
import { adminTheme } from "../theme/antdTheme";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AiOutlineGlobal } from "react-icons/ai";
import dayjs from "dayjs";
import "dayjs/locale/pt";
import "dayjs/locale/es";
import "dayjs/locale/fr";
import enUS from "antd/locale/en_US";
import ptPT from "antd/locale/pt_PT";
import esES from "antd/locale/es_ES";
import frFR from "antd/locale/fr_FR";

import { Context } from "../utils/context";
import { ADMIN_PATH_RESOURCES } from "../utils/permissions";
import { ADMIN_ROLE_ID, GESTOR_ROLE_ID } from "../utils/roles";
import LanguageSelector from "../utils/languageSelector";
import UserAvatar from "../utils/userAvatar";
import Logout from "../components/logout";
import BialSpin from "../components/bialSpin";

import logo from "../assets/Backoffice/BIAL-Regional-Academy.svg";
import logoColor from "../assets/BIAL-Regional-Academy.png";
import {
  LuLayoutDashboard,
  LuImages,
  LuQrCode,
  LuPalette,
  LuLanguages,
  LuBell,
  LuCircleHelp,
  LuGraduationCap,
  LuAward,
  LuChartColumn,
  LuFileText,
  LuDownload,
  LuPill,
  LuUsers,
  LuUsersRound,
  LuShieldCheck,
  LuTicket,
  LuCheck,
  LuActivity,
  LuSend,
  LuMessageSquareText,
  LuLayoutTemplate,
  LuServer,
  LuLogOut,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from "react-icons/lu";
import { Helmet } from "react-helmet";

const { Header, Content, Sider } = Layout;

// Textos dos componentes antd (datas, paginação, etc.) no idioma da conta; os restantes idiomas ficam em inglês
const ANTD_LOCALES = { en: enUS, pt: ptPT, es: esES, fr: frFR };

// Botão de ícone do rodapé do menu lateral (36x36, sobre o fundo azul)
const SIDER_ICON_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[18px] text-white! transition-colors hover:bg-white/10";

const Main = () => {
  const {
    user,
    logout,
    languages,
    windowDimension,
    selectedLanguage,
    setSelectedLanguage,
    unreadTicketsCount,
    menuBadges,
    permissions,
    loadTranslation,
  } = useContext(Context);
  const [current, setCurrent] = useState("/admin/");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);
  // Menu lateral recolhido (só favicon e ícones): lembrado entre visitas
  const [isSiderCollapsed, setIsSiderCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sider_collapsed") === "1";
    } catch {
      return false;
    }
  });

  function toggleSider() {
    setIsSiderCollapsed((prev) => {
      try {
        localStorage.setItem("admin_sider_collapsed", prev ? "0" : "1");
      } catch {
        // sem localStorage: só não se lembra da escolha
      }
      return !prev;
    });
  }

  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Contador à direita do texto do item, centrado na vertical; com o menu recolhido (só ícones) passa a um ponto sobre o ícone (ver .menu-badge-dot)
  const menuItemBadge = (text, icon, count, title) => ({
    label: (
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0 truncate">{text}</span>
        {count > 0 && (
          <span
            title={title}
            className="ml-auto inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-[#00B9D6] px-1.5 pt-[1px] text-[11px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
    ),
    icon: (
      <Badge dot={count > 0} color="#00B9D6" offset={[2, -2]} className="menu-badge-dot">
        {icon}
      </Badge>
    ),
  });

  const allItems = useMemo(
    () => [
      {
        key: "grp-admin",
        label: t("Admin"),
        type: "group",
        children: [
          {
            key: "/admin/",
            label: t("Dashboard"),
            icon: <LuLayoutDashboard />,
          },
        ],
      },
      {
        key: "grp-web",
        label: t("Website"),
        type: "group",
        children: [
          { key: "/admin/media", label: t("Multimedia"), icon: <LuImages /> },
          { key: "/admin/iec", label: t("IECs"), icon: <LuQrCode /> },
          {
            key: "/admin/personalization",
            label: t("Personalization"),
            icon: <LuPalette />,
          },
          {
            key: "/admin/languages",
            label: t("Languages"),
            icon: <LuLanguages />,
          },
          {
            key: "/admin/notification",
            label: t("Notification"),
            icon: <LuBell />,
          },
          { key: "/admin/faqs", label: t("FAQs"), icon: <LuCircleHelp /> },
        ],
      },
      {
        key: "grp-learning",
        label: t("e-Learning"),
        type: "group",
        children: [
          {
            key: "/admin/courses",
            label: t("Courses"),
            icon: <LuGraduationCap />,
          },
          {
            key: "/admin/certificate",
            label: t("Certificates"),
            icon: <LuAward />,
          },
          {
            key: "/admin/reports",
            label: t("Reports"),
            icon: <LuChartColumn />,
          },
          {
            key: "/admin/documents",
            label: t("Documents"),
            icon: <LuFileText />,
          },
          {
            key: "/admin/downloads",
            label: t("Downloads"),
            icon: <LuDownload />,
          },
          {
            key: "/admin/products",
            label: t("Products"),
            icon: <LuPill />,
          },
        ],
      },
      {
        key: "grp-manage",
        label: t("Management"),
        type: "group",
        children: [
          {
            key: "/admin/users",
            // Registos à espera de aprovação
            ...menuItemBadge(t("Users"), <LuUsers />, menuBadges.users, t("{{count}} registrations waiting for approval", { count: menuBadges.users })),
          },
          {
            key: "/admin/user-groups",
            label: t("User groups"),
            icon: <LuUsersRound />,
          },
          {
            key: "/admin/permissions",
            label: t("Permissions"),
            icon: <LuShieldCheck />,
          },
          {
            key: "/admin/tickets",
            label: t("Tickets"),
            icon: <LuTicket />,
          },
          {
            key: "/admin/answers",
            // Mensagens do formulário de contacto por responder
            ...menuItemBadge(t("Answers"), <LuMessageSquareText />, menuBadges.answers, t("{{count}} messages waiting for a reply", { count: menuBadges.answers })),
          },
          {
            key: "/admin/monitoring",
            label: t("System monitoring"),
            icon: <LuActivity />,
          },
        ],
      },
      {
        key: "grp-email",
        label: t("E-mail"),
        type: "group",
        children: [
          {
            key: "/admin/communications",
            label: t("Communications"),
            icon: <LuSend />,
          },
          {
            key: "/admin/templates",
            label: t("Templates"),
            icon: <LuLayoutTemplate />,
          },
          { key: "/admin/smtp", label: t("SMTP"), icon: <LuServer /> },
        ],
      },
    ],
    [t, menuBadges],
  );

  // O Admin vê tudo; as outras funções (incluindo o Gestor) só as secções em que podem ver. "Permissões": o Admin edita, o Gestor só vê
  const isAdmin = Number(user.id_role) === ADMIN_ROLE_ID;
  const isGestor = Number(user.id_role) === GESTOR_ROLE_ID;
  function canAccess(path) {
    if (
      isAdmin ||
      path === "/admin/perfil" ||
      path === `/admin/users/${user.id}`
    )
      return true; // o próprio perfil é sempre acessível
    const segment = path.split("/")[2];
    if (segment === "permissions") return isGestor;
    const resource = ADMIN_PATH_RESOURCES[segment];
    const accepted = [].concat(resource || []);
    return (
      accepted.length === 0 ||
      permissions.some((p) => accepted.includes(p.resource) && p.can_read)
    );
  }
  const items = useMemo(
    () =>
      allItems
        .map((group) => ({
          ...group,
          children: group.children.filter((item) => canAccess(item.key)),
        }))
        .filter((group) => group.children.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, permissions, isAdmin, isGestor],
  );

  // No backoffice o seletor escolhe só a região cujos dados se veem/editam (selectedLanguage): os textos ficam no idioma da conta
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
  const switchTimer = useRef(null);
  const selectLanguage = (lang) => {
    if (lang.id === selectedLanguage?.id) return;
    localStorage.setItem("id_lang", lang.id);
    setSelectedLanguage(lang);
    // Aviso simples sobre o conteúdo para se perceber que a região mudou (as páginas voltam sozinhas a pedir os dados dessa região)
    setIsSwitchingLanguage(true);
    clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setIsSwitchingLanguage(false), 700);
  };

  // Idioma da interface do backoffice: sempre da região do Admin
  const adminLanguage = useMemo(
    () => languages.find((l) => l.id === user.id_lang),
    [languages, user.id_lang],
  );
  const adminCode = adminLanguage?.code;
  useEffect(() => {
    if (!adminCode) return;
    let active = true;
    const keepAdminLanguage = (lng) => {
      if (active && lng !== adminCode) i18n.changeLanguage(adminCode);
    };
    i18n.on("languageChanged", keepAdminLanguage);
    dayjs.locale(adminCode);
    // changeLanguage mesmo que já esteja neste idioma: volta a desenhar os textos com as traduções acabadas de carregar
    Promise.resolve(loadTranslation?.(adminLanguage))
      .catch(() => {})
      .then(() => active && i18n.changeLanguage(adminCode));
    return () => {
      active = false;
      i18n.off("languageChanged", keepAdminLanguage);
      dayjs.locale("en");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminCode, adminLanguage?.version]);
  const antdLocale = ANTD_LOCALES[adminCode] ?? enUS;

  const navigate = useNavigate();
  const isProfileActive =
    location.pathname.replace(/\/$/, "") === "/admin/perfil";

  useEffect(() => {
    const pathname = location.pathname.split("/");
    // "/admin" e "/admin/" são o mesmo sítio (Painel): o item do menu é "/admin/"
    setCurrent(pathname[2] ? `/${pathname[1]}/${pathname[2]}` : "/admin/");
  }, [location]);

  function handleClickMenu(e) {
    if (e.key === "logout") {
      logout();
    } else {
      navigate(e.key);
      setIsOpenDrawerMenu(false);
    }
  }

  return (
    <ConfigProvider theme={adminTheme} locale={antdLocale}>
      <Layout className="admin-layout">
        <Helmet>
          <title>{t("Admin Dashboard")} | BIAL Regional Academy</title>
        </Helmet>
        <Logout
          open={isOpenLogout}
          close={() => setIsOpenLogout(false)}
          submit={logout}
        />
        <Layout>
          {windowDimension.width > 1080 ? (
            <Sider
              width={250}
              collapsedWidth={80}
              collapsed={isSiderCollapsed}
              trigger={null}
              className="bg-[#163986]!"
              style={{ height: "100vh" }}>
              <div className="flex h-full flex-col">
                {/* Topo: logótipo completo ou, recolhido, o favicon: os dois sobrepostos, com uma transição suave entre eles */}
                <Link
                  to="/admin/"
                  aria-label="Bial Academy"
                  className="relative mx-auto mt-4 mb-2 block h-[64px] w-full shrink-0">
                  <img
                    src={logo}
                    alt="Bial Academy Logo"
                    className={`absolute left-1/2 top-1/2 h-[52px] w-auto max-w-[210px] -translate-x-1/2 -translate-y-1/2 object-contain transition-all duration-300 ease-out ${
                      isSiderCollapsed
                        ? "pointer-events-none scale-75 opacity-0"
                        : "scale-100 opacity-100"
                    }`}
                  />
                  <span
                    className={`absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[10px] bg-white transition-all duration-300 ease-out ${
                      isSiderCollapsed
                        ? "scale-100 opacity-100"
                        : "pointer-events-none scale-50 opacity-0"
                    }`}>
                    <img
                      src="/FAVICON.png"
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  </span>
                </Link>

                <div
                  className={`min-h-0 flex-1 menu-scroll-div ${isSiderCollapsed ? "px-0 menu-scroll-div--collapsed" : "px-4"}`}>
                  <Menu
                    data-tour-id="menu"
                    className="principal-menu"
                    selectedKeys={[current]}
                    mode="inline"
                    inlineCollapsed={isSiderCollapsed}
                    items={items}
                    onClick={handleClickMenu}
                  />
                </div>

                {/* Rodapé: o que estava no cabeçalho (utilizador, idioma, mensagens, website e terminar sessão) e o botão de recolher */}
                <div
                  className={`shrink-0 flex flex-col gap-3 border-0 border-t border-solid border-white/15 px-4 py-5 ${isSiderCollapsed ? "items-center" : ""}`}>
                  {/* Idioma: as bandeiras como no login e no registo, por cima do utilizador (recolhido, fica o seletor no grupo de ícones) */}
                  {!isSiderCollapsed && (
                    <div role="radiogroup" aria-label={t("Language")} className="flex items-start justify-between gap-1">
                      {languages.map((language) => {
                        const isSelected = language.id === selectedLanguage?.id;
                        return (
                          <button
                            key={language.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            lang={language.code}
                            title={language.name}
                            onClick={() => !isSelected && selectLanguage(language)}
                            className={`group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[10px] border border-solid py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B9D6] ${
                              isSelected ? "cursor-default border-white/70 bg-white/15" : "cursor-pointer border-transparent bg-transparent hover:bg-white/10"
                            }`}>
                            <span className="relative">
                              <span
                                className={`block h-7 w-7 rounded-full bg-cover bg-center ring-1 ring-white/40 transition-opacity ${isSelected ? "" : "opacity-60 group-hover:opacity-100"}`}
                                style={{ backgroundImage: `url(${language.flag})` }}
                                aria-hidden="true"
                              />
                              {isSelected && (
                                <span className="absolute -bottom-0.5 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00B9D6] text-[9px] text-white ring-2 ring-[#163986]" aria-hidden="true">
                                  <LuCheck />
                                </span>
                              )}
                            </span>
                            <span className={`text-[10px] font-semibold leading-none ${isSelected ? "text-white" : "text-white/70"}`}>{language.code.toUpperCase()}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <Tooltip
                    title={isSiderCollapsed ? user.name : undefined}
                    placement="right">
                    <Link
                      to="/admin/perfil"
                      aria-label={t("My profile")}
                      // Na página de perfil fica selecionado, como um item do menu (fundo branco e texto azul)
                      className={`flex min-w-0 items-center gap-2 rounded-[10px] p-1 transition-colors ${isProfileActive ? "" : "hover:bg-white/10"} ${isSiderCollapsed ? "justify-center" : ""}`}
                      style={
                        isProfileActive
                          ? { backgroundColor: "#fff" }
                          : undefined
                      }>
                      <UserAvatar user={user} size={35} className="shrink-0" />
                      {!isSiderCollapsed && (
                        <p
                          className={`mb-0! truncate text-[13px] font-medium ${isProfileActive ? "" : "text-white"}`}
                          style={
                            isProfileActive ? { color: "#163986" } : undefined
                          }>
                          {user.name}
                        </p>
                      )}
                    </Link>
                  </Tooltip>

                  <div
                    className={
                      isSiderCollapsed
                        ? "flex flex-col items-center gap-1"
                        : "flex items-center justify-between gap-1"
                    }>
                    <Tooltip
                      title={t("Go to website")}
                      placement={isSiderCollapsed ? "right" : "top"}>
                      <Link
                        to={`/${selectedLanguage?.code ?? i18n.language}`}
                        aria-label={t("Go to website")}
                        className={SIDER_ICON_BUTTON}>
                        <AiOutlineGlobal />
                      </Link>
                    </Tooltip>
                    {isSiderCollapsed && (
                    <LanguageSelector
                      languages={languages}
                      selectedLanguage={selectedLanguage}
                      onSelect={selectLanguage}
                      placement={isSiderCollapsed ? "rightBottom" : "topLeft"}>
                      <button
                        type="button"
                        aria-label={t("Language")}
                        className={`${SIDER_ICON_BUTTON} cursor-pointer border-0 bg-transparent ${isSiderCollapsed ? "" : "w-auto gap-1.5 px-2"}`}>
                        <span
                          className="h-5 w-5 shrink-0 rounded-full bg-cover bg-center ring-1 ring-white/60"
                          style={{
                            backgroundImage: `url(${selectedLanguage?.flag})`,
                          }}
                        />
                        {!isSiderCollapsed && (
                          <span className="text-[11px] font-medium leading-none">
                            {selectedLanguage?.code?.toUpperCase()}
                          </span>
                        )}
                      </button>
                    </LanguageSelector>
                    )}
                    {canAccess("/admin/tickets") && (
                      <Tooltip
                        title={t("Tickets")}
                        placement={isSiderCollapsed ? "right" : "top"}>
                        <Link
                          to="/admin/tickets"
                          aria-label={t("Tickets")}
                          className={SIDER_ICON_BUTTON}>
                          <Badge
                            count={unreadTicketsCount}
                            size="small"
                            color="#00B9D6"
                            offset={[2, -2]}>
                            <LuTicket className="text-[18px] text-white!" />
                          </Badge>
                        </Link>
                      </Tooltip>
                    )}
                    <Tooltip
                      title={t("Logout")}
                      placement={isSiderCollapsed ? "right" : "top"}>
                      <button
                        type="button"
                        onClick={() => setIsOpenLogout(true)}
                        aria-label={t("Logout")}
                        className={`${SIDER_ICON_BUTTON} cursor-pointer border-0 bg-transparent`}>
                        <LuLogOut />
                      </button>
                    </Tooltip>
                    <Tooltip
                      title={
                        isSiderCollapsed ? t("Expand menu") : t("Collapse menu")
                      }
                      placement={isSiderCollapsed ? "right" : "top"}>
                      <button
                        type="button"
                        onClick={toggleSider}
                        aria-label={
                          isSiderCollapsed
                            ? t("Expand menu")
                            : t("Collapse menu")
                        }
                        className={`${SIDER_ICON_BUTTON} cursor-pointer border-0 bg-transparent`}>
                        {isSiderCollapsed ? (
                          <LuPanelLeftOpen />
                        ) : (
                          <LuPanelLeftClose />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Sider>
          ) : (
            <Drawer
              className="menu-drawer"
              size={400}
              open={isOpenDrawerMenu}
              onClose={() => setIsOpenDrawerMenu(false)}
              maskClosable={true}
              closable={false}>
              <Button
                type="text"
                className="absolute right-5 top-5 font-bold"
                onClick={() => setIsOpenDrawerMenu(false)}>
                <CloseOutlined className="text-[#163986]" />
              </Button>
              {/* Logo: vai para o Painel, como no menu lateral em desktop */}
              <Link
                to="/admin/"
                className="block px-5 pt-5"
                onClick={() => setIsOpenDrawerMenu(false)}>
                <img
                  src={logoColor}
                  alt="Bial Academy Logo"
                  className="max-h-12 w-auto"
                />
              </Link>
              <div
                className="flex p-[24px_20px_20px_20px] cursor-pointer"
                onClick={() => handleClickMenu({ key: "/admin/perfil" })}>
                <UserAvatar user={user} className="w-12.5 h-12.5" />
                <div className="flex flex-col">
                  <p className="text-[#163986]">{t("Hello")},</p>
                  <p className="text-[#163986]">{user.name}</p>
                </div>
              </div>
              <div className="flex flex-col justify-start items-center p-5">
                <Menu
                  className="principal-menu"
                  selectedKeys={[current]}
                  mode="inline"
                  items={items}
                  onClick={handleClickMenu}
                />
                <Divider />
                <a
                  className={`dropdown-item flex items-center w-full min-h-11.25 pl-6`}
                  onClick={() => setIsOpenLogout(true)}>
                  <LuLogOut className="mr-2 text-[18px]" /> {t("Logout")}
                </a>
              </div>
            </Drawer>
          )}

          <Layout>
            {/* Em desktop não há cabeçalho (tudo vive no menu lateral); em mobile fica o idioma e o botão do menu */}
            {windowDimension.width <= 1080 && (
              <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center">
                <div className="flex items-center">
                  <LanguageSelector
                    languages={languages}
                    selectedLanguage={selectedLanguage}
                    onSelect={selectLanguage}
                    className="mr-4"
                  />
                  <MenuOutlined
                    onClick={() => setIsOpenDrawerMenu(true)}
                    style={{ color: "#163986" }}
                  />
                </div>
              </Header>
            )}
            <div
              className={`relative flex flex-col ${windowDimension.width > 1080 ? "h-screen" : "h-[calc(100vh-64px)]"}`}>
              {isSwitchingLanguage && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/90" role="status" aria-live="polite">
                  {/* A região escolhida: bandeira e nome, como no ecrã de mudança de idioma do site */}
                  {selectedLanguage && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="block h-16 w-16 rounded-full bg-cover bg-center ring-4 ring-white shadow-[0_6px_20px_rgba(22,57,134,0.2)]" style={{ backgroundImage: `url(${selectedLanguage.flag})` }} aria-hidden="true" />
                      <p lang={selectedLanguage.code} className="font-ryker m-0 text-base font-semibold text-[#163986]">
                        {selectedLanguage.name}
                      </p>
                    </div>
                  )}
                  <BialSpin size={40} label={t("Loading the selected language")} />
                  <p className="m-0 text-[13px] text-[#5F6B7A]">{t("Loading the selected language")}...</p>
                </div>
              )}
              <div className="p-6 flex-1 min-h-0 overflow-auto">
                {canAccess(location.pathname.replace(/\/$/, "") || "/admin") ? (
                  <Outlet />
                ) : (
                  <Navigate to="/admin/" replace />
                )}
              </div>
              {/* Espaço para um rodapé de página (ex.: o "Guardar" das configurações do curso), por BAIXO da área que faz
                scroll e não por cima dela, senão o conteúdo aparecia a passar por trás dele por causa do padding. As
                páginas apresentam lá o rodapé com um portal (components/admin/pageFooter.jsx); vazio, não ocupa nada. */}
              <div id="admin-page-footer" className="shrink-0 empty:hidden" />
            </div>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};
export default Main;
