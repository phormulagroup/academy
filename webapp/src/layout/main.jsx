import React, { useContext, useEffect, useState } from "react";
import { CloseOutlined, DashboardOutlined, DashOutlined, DownOutlined, LoginOutlined, LogoutOutlined, MenuOutlined, ProfileOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Divider, Drawer, Dropdown, Layout, Menu } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/BIAL-Regional-Academy.svg";

import endpoints from "../utils/endpoints";
import config from "../utils/config";

import { Context } from "../utils/context";

import Logout from "../components/logout";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { TbWorld } from "react-icons/tb";

const { Header, Content, Sider } = Layout;

const Main = () => {
  const { user, logout, isLoggedIn, languages, setIsLoadingLanguage, windowDimension } = useContext(Context);
  const [current, setCurrent] = useState("");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const location = useLocation();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(user);
  }, [user]);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    navigate(`/${lang}/${window.location.pathname.split("/").slice(2).join("/")}`);
    setIsLoadingLanguage(true);
    setTimeout(() => {
      setIsLoadingLanguage(false);
    }, 1500);
  };

  useEffect(() => {
    let pathname = location.pathname.split("/");
    if (pathname.length > 2) {
      setCurrent(`/${pathname[1]}/${pathname[2]}`);
    } else {
      setCurrent(`/${pathname[pathname.length - 1]}`);
    }
  }, [location]);

  return (
    <Layout>
      <Logout open={isOpenLogout} close={() => setIsOpenLogout(false)} submit={logout} />
      <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center max-h-25 h-full!">
        {windowDimension.width > 1080 ? (
          <div className="flex justify-between items-center w-full container mx-auto pl-6 pr-6">
            <img src={logo} className="max-h-15" />
            <div>
              <Link to={`/${i18n.language}/courses`}>Cursos</Link>
              {user && Object.keys(user).length === 0 && (
                <>
                  <span className="mx-2">|</span>
                  <Link to={`/${i18n.language}/login`}>{t("Login")}</Link>
                </>
              )}
            </div>
            <div className="flex items-center">
              {((user && Object.keys(user).length === 0) || user?.id_role !== 1) && (
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
              )}

              {user && Object.keys(user).length > 0 && (
                <Dropdown
                  menu={{
                    items: [
                      user.id_role === 1 && {
                        key: "backoffice",
                        label: (
                          <Link className={`flex items-center`} to="/admin">
                            <div className="flex items-center">
                              <DashboardOutlined className="mr-2" />
                              <p>{t("Go to backoffice")}</p>
                            </div>
                          </Link>
                        ),
                      },
                      {
                        key: "profile",
                        label: (
                          <Link className={`flex items-center`} to="/profile">
                            <div className="flex items-center">
                              <UserOutlined className="mr-2" />
                              <p>{t("Profile")}</p>
                            </div>
                          </Link>
                        ),
                      },
                      {
                        key: "logout",
                        label: (
                          <div className="flex items-center" onClick={() => setIsOpenLogout(true)}>
                            <LogoutOutlined className="mr-2" />
                            <p>{t("Logout")}</p>
                          </div>
                        ),
                      },
                    ],
                  }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <div className="flex justify-center items-center cursor-pointer">
                    <Avatar icon={<FaRegUser />} />
                    <p className="text-[12px] ml-2">{user.name}</p>
                  </div>
                </Dropdown>
              )}
            </div>
          </div>
        ) : (
          <MenuOutlined onClick={() => setIsOpenDrawerMenu(true)} />
        )}
      </Header>
      <div className="h-[calc(100vh-64px)] overflow-auto bg-white">
        <Outlet />
      </div>
    </Layout>
  );
};
export default Main;
