import React, { useContext, useEffect, useMemo, useState } from "react";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import { Badge, Button, ConfigProvider, Divider, Drawer, Layout, Menu, Tooltip } from "antd";
import { adminTheme } from "../theme/antdTheme";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AiOutlineGlobal } from "react-icons/ai";

import { Context } from "../utils/context";
import { ADMIN_PATH_RESOURCES } from "../utils/permissions";
import LanguageSelector from "../utils/languageSelector";
import UserAvatar from "../utils/userAvatar";
import Logout from "../components/logout";

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

// Botão de ícone do rodapé do menu lateral (36x36, sobre o fundo azul)
const SIDER_ICON_BUTTON = "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[18px] text-white! transition-colors hover:bg-white/10";

const Main = () => {
  const {
    user,
    logout,
    isLoggedIn,
    languages,
    setIsLoadingLanguage,
    windowDimension,
    selectedLanguage,
    setSelectedLanguage,
    unreadTicketsCount,
    permissions,
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
          { key: "/admin/users", label: t("Users"), icon: <LuUsers /> },
          { key: "/admin/user-groups", label: t("User groups"), icon: <LuUsersRound /> },
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
            label: t("Answers"),
            icon: <LuMessageSquareText />,
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
          { key: "/admin/communications", label: t("Communications"), icon: <LuSend /> },
          {
            key: "/admin/templates",
            label: t("Templates"),
            icon: <LuLayoutTemplate />,
          },
          { key: "/admin/smtp", label: t("SMTP"), icon: <LuServer /> },
        ],
      },
    ],
    [t],
  );

  // O Admin vê tudo; as outras funções só as secções em que podem ver. "Permissões" é só do Admin
  const isAdmin = user.id_role === 1;
  function canAccess(path) {
    if (isAdmin || path === "/admin/perfil" || path === `/admin/users/${user.id}`) return true; // o próprio perfil é sempre acessível
    const segment = path.split("/")[2];
    if (segment === "permissions") return false;
    const resource = ADMIN_PATH_RESOURCES[segment];
    const accepted = [].concat(resource || []);
    return accepted.length === 0 || permissions.some((p) => accepted.includes(p.resource) && p.can_read);
  }
  const items = useMemo(
    () =>
      allItems
        .map((group) => ({ ...group, children: group.children.filter((item) => canAccess(item.key)) }))
        .filter((group) => group.children.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, permissions, isAdmin],
  );

  const selectLanguage = (lang) => {
    localStorage.setItem("id_lang", lang.id);
    i18n.changeLanguage(lang.code);
    setSelectedLanguage(lang);
  };

  const navigate = useNavigate();
  const isProfileActive = location.pathname.replace(/\/$/, "") === "/admin/perfil";

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
    <ConfigProvider theme={adminTheme}>
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
          <Sider width={250} collapsedWidth={80} collapsed={isSiderCollapsed} trigger={null} className="bg-[#163986]!" style={{ height: "100vh" }}>
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
                    isSiderCollapsed ? "pointer-events-none scale-75 opacity-0" : "scale-100 opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[10px] bg-white transition-all duration-300 ease-out ${
                    isSiderCollapsed ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0"
                  }`}>
                  <img src="/FAVICON.png" alt="" className="h-6 w-6 object-contain" />
                </span>
              </Link>

              <div className={`min-h-0 flex-1 menu-scroll-div ${isSiderCollapsed ? "px-0 menu-scroll-div--collapsed" : "px-4"}`}>
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
              <div className={`shrink-0 flex flex-col gap-3 border-0 border-t border-solid border-white/15 px-4 py-5 ${isSiderCollapsed ? "items-center" : ""}`}>
                <Tooltip title={isSiderCollapsed ? user.name : undefined} placement="right">
                  <Link
                    to="/admin/perfil"
                    aria-label={t("My profile")}
                    // Na página de perfil fica selecionado, como um item do menu (fundo branco e texto azul)
                    className={`flex min-w-0 items-center gap-2 rounded-[10px] p-1 transition-colors ${isProfileActive ? "" : "hover:bg-white/10"} ${isSiderCollapsed ? "justify-center" : ""}`}
                    style={isProfileActive ? { backgroundColor: "#fff" } : undefined}>
                    <UserAvatar user={user} size={35} className="shrink-0" />
                    {!isSiderCollapsed && <p className={`mb-0! truncate text-[13px] font-medium ${isProfileActive ? "" : "text-white"}`} style={isProfileActive ? { color: "#163986" } : undefined}>{user.name}</p>}
                  </Link>
                </Tooltip>

                <div className={isSiderCollapsed ? "flex flex-col items-center gap-1" : "flex items-center justify-between gap-1"}>
                  <Tooltip title={t("Go to website")} placement={isSiderCollapsed ? "right" : "top"}>
                    <Link to={`/${i18n.language}`} aria-label={t("Go to website")} className={SIDER_ICON_BUTTON}>
                      <AiOutlineGlobal />
                    </Link>
                  </Tooltip>
                  <LanguageSelector languages={languages} selectedLanguage={selectedLanguage} onSelect={selectLanguage} placement={isSiderCollapsed ? "rightBottom" : "topLeft"}>
                    <button type="button" aria-label={t("Language")} className={`${SIDER_ICON_BUTTON} cursor-pointer border-0 bg-transparent ${isSiderCollapsed ? "" : "w-auto gap-1.5 px-2"}`}>
                      <span className="h-5 w-5 shrink-0 rounded-full bg-cover bg-center ring-1 ring-white/60" style={{ backgroundImage: `url(${selectedLanguage?.flag})` }} />
                      {!isSiderCollapsed && <span className="text-[11px] font-medium leading-none">{selectedLanguage?.code?.toUpperCase()}</span>}
                    </button>
                  </LanguageSelector>
                  {canAccess("/admin/tickets") && (
                    <Tooltip title={t("Tickets")} placement={isSiderCollapsed ? "right" : "top"}>
                      <Link to="/admin/tickets" aria-label={t("Tickets")} className={SIDER_ICON_BUTTON}>
                        <Badge count={unreadTicketsCount} size="small" color="#00B9D6" offset={[2, -2]}>
                          <LuTicket className="text-[18px] text-white!" />
                        </Badge>
                      </Link>
                    </Tooltip>
                  )}
                  <Tooltip title={isSiderCollapsed ? t("Expand menu") : t("Collapse menu")} placement={isSiderCollapsed ? "right" : "top"}>
                    <button
                      type="button"
                      onClick={toggleSider}
                      aria-label={isSiderCollapsed ? t("Expand menu") : t("Collapse menu")}
                      className={`${SIDER_ICON_BUTTON} cursor-pointer border-0 bg-transparent`}>
                      {isSiderCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
                    </button>
                  </Tooltip>
                </div>

                <Tooltip title={isSiderCollapsed ? t("Logout") : undefined} placement="right">
                  <button
                    type="button"
                    onClick={() => setIsOpenLogout(true)}
                    aria-label={t("Logout")}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-white/10 text-[13px] text-white transition-colors hover:bg-white/20 ${
                      isSiderCollapsed ? "h-9 w-9 text-[18px]" : "h-9 w-full"
                    }`}>
                    <LuLogOut className="text-[18px]" />
                    {!isSiderCollapsed && <span>{t("Logout")}</span>}
                  </button>
                </Tooltip>
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
                <LanguageSelector languages={languages} selectedLanguage={selectedLanguage} onSelect={selectLanguage} className="mr-4" />
                <MenuOutlined onClick={() => setIsOpenDrawerMenu(true)} style={{ color: "#163986" }} />
              </div>
            </Header>
          )}
          <div className={`relative flex flex-col ${windowDimension.width > 1080 ? "h-screen" : "h-[calc(100vh-64px)]"}`}>
            <div className="p-6 flex-1 min-h-0 overflow-auto">
              {canAccess(location.pathname.replace(/\/$/, "") || "/admin") ? <Outlet /> : <Navigate to="/admin/" replace />}
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
