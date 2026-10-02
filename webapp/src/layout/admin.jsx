import React, { useContext, useEffect, useMemo, useState } from "react";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import { Button, Divider, Drawer, Dropdown, Layout, Menu, Tooltip } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AiOutlineGlobal } from "react-icons/ai";

import { Context } from "../utils/context";
import LanguageSelector from "../utils/languageSelector";
import UserAvatar from "../utils/userAvatar";
import Logout from "../components/logout";

import logo from "../assets/Backoffice/BIAL-Regional-Academy.svg";
import logoColor from "../assets/BIAL-Regional-Academy.png";
import {
  LuLayoutDashboard,
  LuSquareMenu,
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
  LuShieldCheck,
  LuUserCog,
  LuClipboardList,
  LuMessageSquareText,
  LuLayoutTemplate,
  LuServer,
  LuPlug,
  LuLogOut,
} from "react-icons/lu";
import { Helmet } from "react-helmet";

const { Header, Content, Sider } = Layout;

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
    inbox,
  } = useContext(Context);
  const [current, setCurrent] = useState("/admin/");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const location = useLocation();
  const { t, i18n } = useTranslation();

  const items = useMemo(
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
          { key: "/admin/menus", label: t("Menus"), icon: <LuSquareMenu /> },
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
          {
            key: "/admin/permissions",
            label: t("Permissions"),
            icon: <LuShieldCheck />,
          },
          {
            key: `/admin/users/${user.id}`,
            label: t("My account"),
            icon: <LuUserCog />,
          },
        ],
      },
      {
        key: "grp-forms",
        label: t("Management"),
        type: "group",
        children: [
          { key: "/admin/forms", label: t("Forms"), icon: <LuClipboardList /> },
          {
            key: "/admin/answers",
            label: t("Answers"),
            icon: <LuMessageSquareText />,
          },
        ],
      },
      {
        key: "grp-email",
        label: t("E-mail"),
        type: "group",
        children: [
          {
            key: "/admin/templates",
            label: t("Templates"),
            icon: <LuLayoutTemplate />,
          },
          { key: "/admin/smtp", label: t("SMTP"), icon: <LuServer /> },
        ],
      },
      {
        key: "grp-option",
        label: t("Options"),
        type: "group",
        children: [{ key: "/admin/apis", label: t("APIS"), icon: <LuPlug /> }],
      },
    ],
    [t, user.id],
  );

  const selectLanguage = (lang) => {
    localStorage.setItem("id_lang", lang.id);
    i18n.changeLanguage(lang.code);
    setSelectedLanguage(lang);
  };

  const navigate = useNavigate();

  useEffect(() => {
    let pathname = location.pathname.split("/");
    if (pathname.length > 2) {
      setCurrent(`/${pathname[1]}/${pathname[2]}`);
    } else {
      setCurrent(`/${pathname[pathname.length - 1]}`);
    }
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
          <Sider width={250} className="bg-[#163986]! overflow-auto">
            <div className="flex flex-col justify-between items-start h-full p-4">
              <Link to={`/${i18n.language}`} className="min-h-20">
                <img
                  src={logo}
                  alt="Bial Academy Logo"
                  className="h-full mb-2 pl-4 pr-4"
                />
              </Link>
              <div className="flex flex-col items-center justify-start w-full menu-scroll-div">
                <div className="mt-2.5 w-full">
                  <Menu
                    data-tour-id="menu"
                    className="principal-menu"
                    selectedKeys={[current]}
                    mode="inline"
                    items={items}
                    onClick={handleClickMenu}
                  />
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
            {/* Logo: regressa à home, como no menu lateral em desktop */}
            <Link
              to={`/${i18n.language}`}
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
          <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center">
            <div className="flex justify-end items-center">
              {windowDimension.width > 1080 ? (
                <div className="flex justify-center items-center">
                  {/* Regressar ao website (front) */}
                  <Tooltip title={t("Go to website")}>
                    <Link
                      className="flex items-center mr-4"
                      to={`/${i18n.language}`}
                      aria-label={t("Go to website")}>
                      <AiOutlineGlobal
                        className="text-[20px]"
                        style={{ color: "#163986" }}
                      />
                    </Link>
                  </Tooltip>

                  {/* Seletor de idioma: mesmo estilo do header do front (estados ativo e hover em index.css) */}
                  <LanguageSelector
                    languages={languages}
                    selectedLanguage={selectedLanguage}
                    onSelect={selectLanguage}
                    className="mr-4"
                  />

                  <Link
                    className={`flex items-center mr-4`}
                    to={`/admin/inbox`}>
                    <div className="flex items-center">
                      <div className="w-5 h-5 flex justify-center items-center">
                        {inbox.filter((n) => n.unread_messages > 0).length >
                        0 ? (
                          <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                            <p className="text-white text-[10px]">
                              {inbox.map((n) => n.unread_messages)}
                            </p>
                          </div>
                        ) : (
                          <LuBell
                            className="text-[18px]"
                            style={{ color: "#163986" }}
                          />
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Utilizador: mesmo avatar e cor do nome do header do front */}
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: "logout",
                          label: (
                            <div
                              className="dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]"
                              onClick={() => setIsOpenLogout(true)}>
                              <LuLogOut className="mr-2" />
                              <p>{t("Logout")}</p>
                            </div>
                          ),
                        },
                      ],
                    }}
                    trigger={["click"]}
                    placement="bottomRight">
                    <div className="flex justify-center items-center cursor-pointer">
                      <UserAvatar user={user} />
                      <p className="text-[12px] ml-2 text-[#163986] font-medium">
                        {user.name.split(" ")[0]}{" "}
                        {user.name.split(" ")[user.name.split(" ").length - 1]}
                      </p>
                    </div>
                  </Dropdown>
                </div>
              ) : (
                <div className="flex items-center">
                  {/* Em mobile: seletor de idioma e depois o menu */}
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
              )}
            </div>
          </Header>
          <div className="p-6 h-[calc(100vh-64px)] overflow-auto">
            <Outlet />
          </div>
        </Layout>
      </Layout>
    </Layout>
  );
};
export default Main;
