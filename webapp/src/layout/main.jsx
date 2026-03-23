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
import { Footer } from "antd/es/layout/layout";

import bialLogo from "../assets/BIAL-logo-footer.svg";
import NotificationIcon from "../assets/Notifications-off.svg?react";

const { Header, Content, Sider } = Layout;

const Main = () => {
  const { user, logout, languages, setIsLoadingLanguage, windowDimension, notifications, inbox } = useContext(Context);
  const [current, setCurrent] = useState("");
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const location = useLocation();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  console.log(notifications);

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
    <Layout className="min-h-100vh">
      <Logout open={isOpenLogout} close={() => setIsOpenLogout(false)} submit={logout} />
      <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center max-h-25 h-full!">
        {windowDimension.width > 1080 ? (
          <div className="grid grid-cols-6 w-full container mx-auto">
            <Link to={`/${i18n.language}`}>
              <img src={logo} className="max-h-15" />
            </Link>
            <div className="col-span-4 flex justify-center items-center">
              <Link to={`/${i18n.language}/courses`}>Cursos</Link>
              {user && Object.keys(user).length === 0 && (
                <>
                  <span className="mx-2">|</span>
                  <Link to={`/${i18n.language}/login`}>{t("Login")}</Link>
                </>
              )}
            </div>
            <div className="flex justify-end items-center">
              {((user && Object.keys(user).length === 0) || user?.id_role === 1) && (
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
                  <div className="flex justify-center items-center cursor-pointer mr-4 border leading-1 p-2 rounded-full">
                    <div
                      className={`w-5 h-5 rounded-full bg-cover bg-center mr-2`}
                      style={{ backgroundImage: `url(${languages?.filter((l) => l.code === i18n.language)[0]?.flag})` }}
                    ></div>
                    <p>{i18n.language.toUpperCase()}</p>
                  </div>
                </Dropdown>
              )}

              {user && Object.keys(user).length > 0 && (
                <div className="flex">
                  <Dropdown
                    menu={{
                      items: [
                        user.id_role === 1 && {
                          key: "backoffice",
                          label: (
                            <Link className={`flex items-center`} to="/admin">
                              <div className="flex items-center">
                                <div className="w-5 mr-2"></div>
                                <p>{t("Go to backoffice")}</p>
                              </div>
                            </Link>
                          ),
                        },
                        {
                          key: "profile",
                          label: (
                            <Link className={`flex items-center`} to={`/${i18n.language}/account`}>
                              <div className="flex items-center">
                                <div className="w-5 mr-2"></div>
                                <p>{t("My account")}</p>
                              </div>
                            </Link>
                          ),
                        },
                        {
                          key: "result",
                          label: (
                            <Link className={`flex items-center`} to={`/${i18n.language}/result`}>
                              <div className="flex items-center">
                                <div className="w-5 mr-2"></div>
                                <p>{t("Results")}</p>
                              </div>
                            </Link>
                          ),
                        },
                        {
                          key: "inbox",
                          label: (
                            <Link className={`flex items-center`} to={`/${i18n.language}/inbox`}>
                              <div className="flex items-center">
                                <div className="w-5 h-5 mr-2 flex justify-center items-center">
                                  {inbox.filter((n) => n.is_read === 0).length > 0 ? (
                                    <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                      <p className="text-white text-[10px]">{inbox.filter((n) => n.is_read === 0).length}</p>
                                    </div>
                                  ) : (
                                    <NotificationIcon className="mr-2" />
                                  )}
                                </div>
                                <p>{t("Inbox")}</p>
                              </div>
                            </Link>
                          ),
                        },
                        {
                          key: "notification",
                          label: (
                            <Link className={`flex items-center`} to={`/${i18n.language}/notifications`}>
                              <div className="flex items-center">
                                <div className="w-5 h-5 mr-2 flex justify-center items-center">
                                  {notifications.filter((n) => n.is_read === 0).length > 0 ? (
                                    <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                      <p className="text-white text-[10px]">{notifications.filter((n) => n.is_read === 0).length}</p>
                                    </div>
                                  ) : (
                                    <NotificationIcon className="mr-2" />
                                  )}
                                </div>
                                <p>{t("Notifications")}</p>
                              </div>
                            </Link>
                          ),
                        },
                      ],
                    }}
                    trigger={["click"]}
                    placement="bottomLeft"
                  >
                    <div className="flex justify-center items-center cursor-pointer">
                      <Avatar icon={<FaRegUser />} />
                      <p className="text-[12px] ml-2">
                        {user.name.split(" ")[0]} {user.name.split(" ")[1]}
                      </p>
                    </div>
                  </Dropdown>
                  <div className="flex items-center ml-6 cursor-pointer" onClick={() => setIsOpenLogout(true)}>
                    <LogoutOutlined />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center w-full container mx-auto">
            <img src={logo} className="max-h-15" />
            <MenuOutlined onClick={() => setIsOpenDrawerMenu(true)} />
          </div>
        )}
      </Header>
      <Content className="bg-white min-h-[unset]!">
        <Outlet />
      </Content>
      <Footer className="bg-[#163986]!">
        <div className="container flex flex-col md:flex-row justify-between items-end m-auto pt-4 pb-4 gap-8">
          <div className="w-full">
            <div className="mb-4 flex flex-col items-center md:items-start">
              <p className="text-white">{t("Follow us")}</p>
            </div>
            <div className="flex justify-center md:justify-start items-center gap-4">
              <p className="text-white text-sm underline text-center md:text-left">Formulário de contacto</p>
              <p className="text-white">|</p>
              <p className="text-white text-sm underline text-center md:text-left">Termos e condições</p>
              <p className="text-white">|</p>
              <p className="text-white text-sm underline text-center md:text-left">Política de Privacidade</p>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center md:items-end w-full">
            <img src={bialLogo} className="max-h-10 invert-[1] brightness-[0]" />
            <p className="text-white text-sm mt-6!">© 2024 BIAL. All rights reserved.</p>
          </div>
        </div>
      </Footer>
    </Layout>
  );
};
export default Main;
