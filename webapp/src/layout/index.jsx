import React, { useContext, useEffect, useState } from "react";
import { CloseOutlined, DownOutlined, LoginOutlined, MenuOutlined, ProfileOutlined } from "@ant-design/icons";
import { Avatar, Button, Divider, Drawer, Dropdown, Layout, Menu } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import logoPhormula from "../assets/logo-phormula.svg";

import endpoints from "../utils/endpoints";
import config from "../utils/config";

import { Context } from "../utils/context";

import Logout from "../components/logout";
import { FaRegUser } from "react-icons/fa";

const { Header, Content, Sider } = Layout;

const Main = () => {
  const { user, logout, isLoggedIn, allowTour, setAllowTour, isOpenTour, setIsOpenTour } = useContext(Context);
  const location = useLocation();
  const [current, setCurrent] = useState("/app/");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [items, setItems] = useState([
    {
      key: "grp-web",
      label: "Website",
      type: "group",
      children: [
        { key: "/admin/pages", label: "Páginas" },
        { key: "/admin/articles", label: "Artigos" },
        { key: "/admin/menus", label: "Menus" },
        { key: "/admin/media", label: "Multimédia" },
        { key: "/admin/personalization", label: "Personalização" },
        { key: "/admin/languages", label: "Traduções" },
        { key: "/admin/settings", label: "Definições" },
      ],
    },
    {
      key: "grp-learning",
      label: "e-Learning",
      type: "group",
      children: [
        { key: "/admin/courses", label: "Cursos" },
        { key: "/admin/quizzes", label: "Testes" },
        { key: "/admin/certificates", label: "Certificados" },
        { key: "/admin/reports", label: "Relatórios" },
        { key: "/admin/orders", label: "Encomendas" },
      ],
    },
    {
      key: "grp-manage",
      label: "Gestão",
      type: "group",
      children: [
        { key: "/admin/users", label: "Utilizadores" },
        { key: "/admin/permissions", label: "Permissões" },
        { key: "/admin/account", label: "A minha conta" },
      ],
    },
    {
      key: "grp-forms",
      label: "Gestão",
      type: "group",
      children: [
        { key: "/admin/forms", label: "Formulários" },
        { key: "/admin/answers", label: "Respostas" },
      ],
    },
    {
      key: "grp-email",
      label: "E-mail",
      type: "group",
      children: [
        { key: "/admin/templates", label: "Templates" },
        { key: "/admin/smtp", label: "SMTP" },
      ],
    },
    {
      key: "grp-option",
      label: "Opções",
      type: "group",
      children: [{ key: "/admin/apis", label: "APIS" }],
    },
  ]);

  const navigate = useNavigate();

  function getItem(label, key, type, icon, children, extra) {
    return {
      key,
      icon,
      children,
      label,
      extra,
      type,
    };
  }

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    let pathname = location.pathname.split("/");
    if (pathname.length > 2) {
      setCurrent(`/${pathname[1]}/${pathname[2]}`);
    } else {
      setCurrent(`/${pathname[pathname.length - 1]}`);
    }
  }, [location]);

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
          <Sider width={250} className="bg-[#163986]! overflow-auto">
            <div className="flex flex-col justify-between h-full p-4">
              <div className="flex flex-col items-center w-full">
                <img src={logoPhormula} alt="PhormulaShare Logo" className="w-45 mb-2" style={{ filter: "brightness(0) invert(1)" }} />
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
            <div className="flex p-[60px_20px_20px_20px] cursor-pointer" onClick={() => handleClickMenu({ key: "/app/perfil" })}>
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
                  {allowTour && (
                    <div>
                      <Button className="mr-2" onClick={() => setIsOpenTour(true)}>
                        Começar tour
                      </Button>
                    </div>
                  )}
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
