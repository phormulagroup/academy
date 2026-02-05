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
import { useTranslation } from "react-i18next";
import { TbWorld } from "react-icons/tb";

const { Header, Content, Sider } = Layout;

const Main = () => {
  const { user, logout, isLoggedIn, languages, setIsLoadingLanguage } = useContext(Context);
  const [current, setCurrent] = useState("/admin/");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setIsLoadingLanguage(true);
    setTimeout(() => {
      setIsLoadingLanguage(false);
    }, 1500);
  };

  const navigate = useNavigate();

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
      <div className="h-[calc(100vh-64px)] overflow-auto bg-white">
        <Outlet />
      </div>
    </Layout>
  );
};
export default Main;
