import React, { useContext, useEffect, useState } from "react";
import { CloseOutlined, LoginOutlined, MenuOutlined } from "@ant-design/icons";
import { Avatar, Button, Divider, Drawer, Dropdown, Layout, Menu } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { TbWorld } from "react-icons/tb";

import { Context } from "../utils/context";
import Logout from "../components/logout";

import logo from "../assets/BIAL-Regional-Academy.svg";
import PagesIcon from "../assets/Backoffice/Menu/Paginas.svg?react";
import ArticlesIcon from "../assets/Backoffice/Menu/Artigos.svg?react";
import MenusIcon from "../assets/Backoffice/Menu/Menus.svg?react";
import MediaIcon from "../assets/Backoffice/Menu/Multimedia.svg?react";
import PersonalizationIcon from "../assets/Backoffice/Menu/Personalizacao.svg?react";
import LangIcon from "../assets/Backoffice/Menu/Traducoes.svg?react";
import SettingsIcon from "../assets/Backoffice/Menu/Definicoes.svg?react";
import CourseIcon from "../assets/Backoffice/Menu/Cursos.svg?react";
import TestsIcon from "../assets/Backoffice/Menu/Testes.svg?react";
import CertificatesIcon from "../assets/Backoffice/Menu/Certificados.svg?react";
import ReportsIcon from "../assets/Backoffice/Menu/Relatorios.svg?react";
import OrdersIcon from "../assets/Backoffice/Menu/Encomendas.svg?react";
import UsersIcon from "../assets/Backoffice/Menu/Utilizadores.svg?react";
import PermissionsIcon from "../assets/Backoffice/Menu/Permissoes.svg?react";
import AccountIcon from "../assets/Backoffice/Menu/Conta.svg?react";
import FormsIcon from "../assets/Backoffice/Menu/Formularios.svg?react";
import AnswersIcon from "../assets/Backoffice/Menu/Respostas.svg?react";
import TemplatesIcon from "../assets/Backoffice/Menu/Templates.svg?react";
import SMTPIcon from "../assets/Backoffice/Menu/SMTP.svg?react";
import APIsIcon from "../assets/Backoffice/Menu/APIS.svg?react";
import { RxFile } from "react-icons/rx";

const { Header, Content, Sider } = Layout;

const Main = () => {
  const { user, logout, isLoggedIn, languages, setIsLoadingLanguage, windowDimension } = useContext(Context);
  const [current, setCurrent] = useState("/admin/");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState([
    {
      key: "grp-web",
      label: "Website",
      type: "group",
      children: [
        { key: "/admin/pages", label: t("Pages"), icon: <PagesIcon /> },
        { key: "/admin/articles", label: t("Articles"), icon: <ArticlesIcon /> },
        { key: "/admin/menus", label: t("Menus"), icon: <MenusIcon /> },
        { key: "/admin/media", label: t("Multimedia"), icon: <MediaIcon /> },
        { key: "/admin/personalization", label: t("Personalization"), icon: <PersonalizationIcon /> },
        { key: "/admin/languages", label: t("Languages"), icon: <LangIcon /> },
        { key: "/admin/settings", label: t("Settings"), icon: <SettingsIcon /> },
      ],
    },
    {
      key: "grp-learning",
      label: "e-Learning",
      type: "group",
      children: [
        { key: "/admin/courses", label: t("Courses"), icon: <CourseIcon /> },
        { key: "/admin/quizzes", label: t("Quizzes"), icon: <TestsIcon /> },
        { key: "/admin/certificates", label: t("Certificates"), icon: <CertificatesIcon /> },
        { key: "/admin/reports", label: t("Reports"), icon: <ReportsIcon /> },
        { key: "/admin/orders", label: t("Orders"), icon: <OrdersIcon /> },
      ],
    },
    {
      key: "grp-manage",
      label: "Gestão",
      type: "group",
      children: [
        { key: "/admin/users", label: t("Users"), icon: <UsersIcon /> },
        { key: "/admin/permissions", label: t("Permissions"), icon: <PermissionsIcon /> },
        { key: "/admin/account", label: t("My Account"), icon: <AccountIcon /> },
      ],
    },
    {
      key: "grp-forms",
      label: "Gestão",
      type: "group",
      children: [
        { key: "/admin/forms", label: t("Forms"), icon: <FormsIcon /> },
        { key: "/admin/answers", label: t("Answers"), icon: <AnswersIcon /> },
      ],
    },
    {
      key: "grp-email",
      label: "E-mail",
      type: "group",
      children: [
        { key: "/admin/templates", label: t("Templates"), icon: <TemplatesIcon /> },
        { key: "/admin/smtp", label: t("SMTP"), icon: <SMTPIcon /> },
      ],
    },
    {
      key: "grp-option",
      label: "Opções",
      type: "group",
      children: [{ key: "/admin/apis", label: t("APIS"), icon: <APIsIcon /> }],
    },
  ]);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setIsLoadingLanguage(true);
    setTimeout(() => {
      setIsLoadingLanguage(false);
    }, 1500);
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
    <Layout>
      <Logout open={isOpenLogout} close={() => setIsOpenLogout(false)} submit={logout} />
      <Layout>
        {windowDimension.width > 1080 ? (
          <Sider width={250} className="bg-[#010202]! overflow-auto">
            <div className="flex flex-col justify-between items-start h-full p-4">
              <Link to="/">
                <img src={logo} alt="Bial Academy Logo" className="max-h-17.5 mb-2 pl-4" style={{ filter: "brightness(0) invert(1)" }} />
              </Link>
              <div className="flex flex-col items-center justify-start w-full menu-scroll-div">
                <div className="mt-2.5 w-full">
                  <Menu data-tour-id="menu" className="principal-menu" selectedKeys={[current]} mode="inline" items={items} onClick={handleClickMenu} />
                </div>
              </div>
            </div>
          </Sider>
        ) : (
          <Drawer className="menu-drawer" size={400} open={isOpenDrawerMenu} onClose={() => setIsOpenDrawerMenu(false)} maskClosable={true} closable={false}>
            <Button type="text" className="absolute right-5 top-5 font-bold" onClick={() => setIsOpenDrawerMenu(false)}>
              <CloseOutlined className="text-[#0c3c61]" />
            </Button>
            <div className="flex p-[60px_20px_20px_20px] cursor-pointer" onClick={() => handleClickMenu({ key: "/admin/perfil" })}>
              <Avatar className="w-12.5 h-12.5" icon={<FaRegUser />} />
              <div className="flex flex-col">
                <p className="text-[#0c3c61]">Olá,</p>
                <p className="text-[#0c3c61]">{user.name}</p>
              </div>
            </div>
            <div className="flex flex-col justify-start items-center p-5">
              <Menu className="principal-menu" selectedKeys={[current]} mode="inline" items={items} onClick={handleClickMenu} />
              <Divider />
              <a className={`dropdown-item flex items-center w-full min-h-11.25 pl-6`} onClick={() => setIsOpenLogout(true)}>
                <LoginOutlined className="mr-2" /> Logout
              </a>
            </div>
          </Drawer>
        )}

        <Layout>
          <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center">
            <div className="flex justify-end items-center">
              {windowDimension.width > 1080 ? (
                <div className="flex justify-center items-center">
                  <Dropdown
                    menu={{
                      items: languages.map((item) => ({
                        key: item.code,
                        label: (
                          <div className={`flex items-center ${i18n.language === item.code ? "text-[#00B9D6]" : ""}`} onClick={() => changeLanguage(item.code)}>
                            <img src={item.flag} className="max-w-5 mr-2" alt={item.name} />
                            <p>{item.name}</p>
                          </div>
                        ),
                      })),
                    }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <div className="flex justify-center items-center cursor-pointer">
                      <TbWorld className="w-5 h-5 mr-4" />
                    </div>
                  </Dropdown>
                  <Avatar icon={<FaRegUser />} />
                  <p className="text-[12px] ml-2">{user.name}</p>
                </div>
              ) : (
                <MenuOutlined onClick={() => setIsOpenDrawerMenu(true)} />
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
