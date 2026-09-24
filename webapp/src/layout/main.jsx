import React, { useContext, useMemo, useState } from "react";
import { LogoutOutlined, MenuOutlined } from "@ant-design/icons";
import { Avatar, Divider, Drawer, Dropdown, Layout } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/BIAL-Regional-Academy.png";

import { Context } from "../utils/context";

import Logout from "../components/logout";
import { FaRegUser } from "react-icons/fa";
import {
  FaFacebook,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa6";
import { MdNotificationsNone } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Footer } from "antd/es/layout/layout";

import bialLogo from "../assets/BIAL-logo-footer.svg";
import { AiFillCloseCircle } from "react-icons/ai";
import dayjs from "dayjs";

const { Header, Content } = Layout;

const MENU_ITEMS = [
  { label: "About", section: "about", loggedIn: false, hideOnLoggedIn: false },
  { label: "Login", section: "login", loggedIn: false, hideOnLoggedIn: true },
  {
    label: "Register",
    section: "register",
    loggedIn: false,
    hideOnLoggedIn: true,
  },
  { label: "Courses", section: "", loggedIn: true, hideOnLoggedIn: false },
  {
    label: "Documents",
    section: "documents",
    loggedIn: true,
    hideOnLoggedIn: false,
  },
  {
    label: "Downloads",
    section: "downloads",
    loggedIn: true,
    hideOnLoggedIn: false,
  },
  { label: "FAQs", section: "faqs", loggedIn: false, hideOnLoggedIn: false },
];

const Main = () => {
  const {
    user,
    logout,
    languages,
    setIsLoadingLanguage,
    windowDimension,
    notifications,
    inbox,
    isLoggedIn,
    selectedLanguage,
    setSelectedLanguage,
  } = useContext(Context);
  const { t, i18n } = useTranslation();

  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Paths are derived from the current language so they stay in sync after changeLanguage
  const menuItems = useMemo(
    () =>
      MENU_ITEMS.map((item) => ({
        ...item,
        path: item.section
          ? `/${i18n.language}/${item.section}`
          : `/${i18n.language}`,
      })),
    [i18n.language],
  );

  // Section of the current URL (/:lang/:section/...), independent of the language prefix
  const currentSection = location.pathname.split("/")[2] || "";

  const isActiveItem = (item) =>
    item.section === currentSection ||
    (item.section === "" && currentSection === "courses") ||
    (item.section === "about" && currentSection === "" && !isLoggedIn) ||
    (item.section === "faqs" && currentSection === "faqs");

  const changeLanguage = (lang) => {
    const selectedLang = languages.find((l) => l.code === lang);
    localStorage.setItem("id_lang", selectedLang.id);
    i18n.changeLanguage(lang);
    setSelectedLanguage(selectedLang);
    navigate(
      `/${lang}/${window.location.pathname.split("/").slice(2).join("/")}`,
    );
    setIsLoadingLanguage(true);
    setTimeout(() => {
      setIsLoadingLanguage(false);
    }, 1500);
  };

  function closeDrawer() {
    setIsOpenDrawerMenu(false);
  }

  return (
    <div className="main-container">
      <Layout className="h-auto! min-h-screen!">
        <Logout
          open={isOpenLogout}
          close={() => setIsOpenLogout(false)}
          submit={logout}
        />
        <Header
          className={`sticky top-0 z-100! shrink-0 bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center max-h-25 h-25! ${windowDimension.width < 550 ? "px-[24px]!" : ""}`}>
          <Drawer
            open={isOpenDrawerMenu}
            size={"80%"}
            onClose={closeDrawer}
            maskClosable={false}
            extra={[]}
            className="drawer-learning">
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col h-full">
                <div className="absolute top-5 right-5 flex justify-end">
                  <AiFillCloseCircle
                    className="text-3xl cursor-pointer"
                    style={{ color: "#FFFFFF" }}
                    onClick={closeDrawer}
                  />
                </div>
                <div>
                  {user && Object.keys(user).length === 0 ? (
                    <div className="bg-[#163986] p-6 pt-10">
                      <div className="flex justify-start items-center cursor-pointer">
                        <Link
                          to={`/${i18n.language}/login`}
                          className="flex justify-center items-center"
                          onClick={() => closeDrawer()}>
                          <Avatar
                            className="w-8 sm:w-9 md:w-10 lg:w-11"
                            icon={<FaRegUser />}
                            style={{
                              color: "#163986",
                              backgroundColor: "#FFFFFF",
                            }}
                          />
                          <p className="text-[12px] sm:text-[13px] md:text-[14px] lg:text-[16px] ml-2 text-[#FFFFFF] font-medium drawer-label-text">
                            Login
                          </p>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#163F90] p-6 pt-16">
                      <div className="flex justify-start items-center cursor-pointer">
                        <Link
                          to={`/${i18n.language}/account`}
                          className="flex justify-center items-center"
                          onClick={() => closeDrawer()}>
                          <Avatar
                            className="w-8 sm:w-9 md:w-10 lg:w-11"
                            icon={<FaRegUser />}
                            style={{
                              color: "#163986",
                              backgroundColor: "#FFFFFF",
                            }}
                          />
                          <p className="text-[12px] sm:text-[13px] md:text-[14px] lg:text-[16px] ml-2 text-[#FFFFFF] font-medium drawer-label-text">
                            {user.name.split(" ")[0]}{" "}
                            {
                              user.name.split(" ")[
                                user.name.split(" ").length - 1
                              ]
                            }
                          </p>
                        </Link>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col mt-2 p-4 pb-0">
                    {menuItems.map((item) =>
                      isLoggedIn
                        ? !item.hideOnLoggedIn && (
                            <Link
                              key={item.path}
                              className={`m-2 text-center text-[16px] ${
                                isActiveItem(item) ? "active" : ""
                              }`}
                              to={item.path}
                              onClick={() => closeDrawer()}>
                              {t(item.label)}
                            </Link>
                          )
                        : !item.loggedIn && (
                            <Link
                              key={item.path}
                              className={`m-2 text-center text-[16px] ${
                                isActiveItem(item) ? "active" : ""
                              }`}
                              to={item.path}
                              onClick={() => closeDrawer()}>
                              {t(item.label)}
                            </Link>
                          ),
                    )}
                  </div>
                  {isLoggedIn && (
                    <div className="flex flex-col p-4 pt-0">
                      <Divider />
                      {user.id_role === 1 && (
                        <Link
                          className={`m-2 text-center text-[16px] ${
                            currentSection === "admin" ? "active" : ""
                          }`}
                          to="/admin"
                          onClick={() => closeDrawer()}>
                          {t("Go to backoffice")}
                        </Link>
                      )}
                      <Link
                        className={`m-2 text-center text-[16px] ${
                          currentSection === "account" ? "active" : ""
                        }`}
                        to={`/${i18n.language}/account`}
                        onClick={() => closeDrawer()}>
                        {t("My Account")}
                      </Link>
                      <Link
                        className={`m-2 text-center text-[16px] ${
                          currentSection === "result" ? "active" : ""
                        }`}
                        to={`/${i18n.language}/result`}
                        onClick={() => closeDrawer()}>
                        {t("Results")}
                      </Link>
                      <Link
                        className={`m-2 text-center text-[16px] ${
                          currentSection === "notifications" ? "active" : ""
                        }`}
                        to={`/${i18n.language}/notifications`}
                        onClick={() => closeDrawer()}>
                        <div className="flex justify-center items-center">
                          {notifications.filter((n) => n.is_read === 0).length >
                          0 ? (
                            <div className="w-5 h-5 mr-2 flex justify-center items-center">
                              <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                <p className="text-white">
                                  {
                                    notifications.filter((n) => n.is_read === 0)
                                      .length
                                  }
                                </p>
                              </div>
                            </div>
                          ) : null}
                          <p>{t("Notifications")}</p>
                        </div>
                      </Link>
                      <Link
                        className={`m-2 text-center text-[16px] ${
                          currentSection === "inbox" ? "active" : ""
                        }`}
                        to={
                          user.id_role === 1
                            ? "/admin/inbox"
                            : `/${i18n.language}/inbox`
                        }
                        onClick={() => closeDrawer()}>
                        <div className="flex justify-center items-center">
                          {inbox.filter((n) => n.unread_messages > 0).length >
                          0 ? (
                            <div className="w-5 h-5 mr-2 flex justify-center items-center">
                              <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                <p className="text-white text-[10px]">
                                  {inbox.map((n) => n.unread_messages)}
                                </p>
                              </div>
                            </div>
                          ) : null}
                          <p>{t("Inbox")}</p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              {isLoggedIn && (
                <div className="p-4 pb-10">
                  <div
                    className="flex justify-center items-center cursor-pointer m-2 text-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[16px]"
                    onClick={() => setIsOpenLogout(true)}>
                    <p className="text-center">{t("Logout")}</p>
                  </div>
                </div>
              )}
            </div>
          </Drawer>
          {windowDimension.width > 1334 ? (
            <div className="grid grid-cols-5 w-full container mx-auto pl-6 pr-6">
              <div
                onClick={() => navigate(`/${i18n.language}`)}
                className="cursor-pointer">
                <img src={logo} className="max-h-15" />
              </div>
              <div className="col-span-3 flex justify-center items-center">
                {menuItems.map((item) =>
                  isLoggedIn
                    ? !item.hideOnLoggedIn && (
                        <Link
                          key={item.path}
                          className={`nav-link ${isActiveItem(item) ? "active" : ""}`}
                          to={item.path}
                          onClick={() => closeDrawer()}>
                          {t(item.label)}
                        </Link>
                      )
                    : !item.loggedIn && (
                        <Link
                          key={item.path}
                          className={`nav-link ${isActiveItem(item) ? "active" : ""}`}
                          to={item.path}
                          onClick={() => closeDrawer()}>
                          {t(item.label)}
                        </Link>
                      ),
                )}
              </div>
              <div className="flex justify-end items-center">
                {((user && Object.keys(user).length === 0) ||
                  user?.id_role === 1) && (
                  <Dropdown
                    menu={{
                      items: languages.map((item) => ({
                        key: item.code,
                        label: (
                          <div
                            className={`dropdown-language-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${
                              selectedLanguage?.id === item.id
                                ? "text-[#00B9D6]"
                                : "text-[#163986]"
                            }`}
                            onClick={() => changeLanguage(item.code)}>
                            <img
                              src={item.flag}
                              className="max-w-5 mr-2"
                              alt={item.name}
                            />
                            <p>{item.name}</p>
                          </div>
                        ),
                      })),
                    }}
                    trigger={["click"]}
                    placement="bottomRight">
                    <div className="flex justify-center items-center cursor-pointer mr-4 border border-[#163986] leading-1 p-2 rounded-full">
                      <div
                        className={`w-5 h-5 rounded-full bg-cover bg-center mr-2`}
                        style={{
                          backgroundImage: `url(${selectedLanguage?.flag})`,
                        }}></div>
                      <p className="text-[#163986] text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] font-medium">
                        {selectedLanguage?.code?.toUpperCase()}
                      </p>
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
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]`}
                                to="/admin">
                                <div className="flex items-center">
                                  <div className="w-5 mr-2"></div>
                                  <p
                                    className={`text-[${
                                      currentSection === "admin"
                                        ? "#00B9D6"
                                        : "#163F90"
                                    }]`}>
                                    {t("Go to backoffice")}
                                  </p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "account",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]`}
                                to={`/${i18n.language}/account`}>
                                <div className="flex items-center">
                                  <div className="w-5 mr-2"></div>
                                  <p
                                    className={`text-[${
                                      currentSection === "account"
                                        ? "#00B9D6"
                                        : "#163F90"
                                    }]`}>
                                    {t("My account")}
                                  </p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "result",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]`}
                                to={`/${i18n.language}/result`}>
                                <div className="flex items-center">
                                  <div className="w-5 mr-2"></div>
                                  <p
                                    className={`text-[${
                                      currentSection === "result"
                                        ? "#00B9D6"
                                        : "#163F90"
                                    }]`}>
                                    {t("Results")}
                                  </p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "inbox",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]`}
                                to={
                                  user.id_role === 1
                                    ? "/admin/inbox"
                                    : `/${i18n.language}/inbox`
                                }>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 mr-2 flex justify-center items-center">
                                    {inbox.filter((n) => n.unread_messages > 0)
                                      .length > 0 ? (
                                      <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                        <p className="text-white text-[10px]">
                                          {inbox.map((n) => n.unread_messages)}
                                        </p>
                                      </div>
                                    ) : (
                                      <MdNotificationsNone
                                        className={`text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] text-[${
                                          currentSection === "inbox"
                                            ? "#00B9D6"
                                            : "#163F90"
                                        }]`}
                                      />
                                    )}
                                  </div>
                                  <p
                                    className={`text-[${
                                      currentSection === "inbox"
                                        ? "#00B9D6"
                                        : "#163F90"
                                    }]`}>
                                    {t("Inbox")}
                                  </p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "notification",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]`}
                                to={`/${i18n.language}/notifications`}>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 mr-2 flex justify-center items-center">
                                    {notifications.filter(
                                      (n) => n.is_read === 0,
                                    ).length > 0 ? (
                                      <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                        <p className="text-white text-[10px]">
                                          {
                                            notifications.filter(
                                              (n) => n.is_read === 0,
                                            ).length
                                          }
                                        </p>
                                      </div>
                                    ) : (
                                      <MdNotificationsNone
                                        className={`text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] text-[${
                                          currentSection === "notifications"
                                            ? "#00B9D6"
                                            : "#163F90"
                                        }]`}
                                      />
                                    )}
                                  </div>
                                  <p
                                    className={`text-[${
                                      currentSection === "notifications"
                                        ? "#00B9D6"
                                        : "#163F90"
                                    }]`}>
                                    {t("Notifications")}
                                  </p>
                                </div>
                              </Link>
                            ),
                          },
                        ],
                      }}
                      trigger={["click"]}
                      placement="bottomLeft">
                      <div className="flex justify-center items-center cursor-pointer">
                        <Avatar
                          icon={<FaRegUser />}
                          style={{
                            color: "#FFFFFF",
                            backgroundColor: "#00B9D6",
                          }}
                        />
                        <p className="text-[12px] ml-2 text-[#163986] font-medium">
                          {user.name.split(" ")[0]}{" "}
                          {
                            user.name.split(" ")[
                              user.name.split(" ").length - 1
                            ]
                          }
                        </p>
                      </div>
                    </Dropdown>
                    <div
                      className="flex items-center ml-6 cursor-pointer"
                      onClick={() => setIsOpenLogout(true)}>
                      <LogoutOutlined style={{ color: "#163986" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center w-full container mx-auto">
              <div
                onClick={() => navigate(`/${i18n.language}`)}
                className="cursor-pointer">
                <img src={logo} className="max-h-15" />
              </div>
              <div className="flex items-center">
                {user && user.id_role === 1 && (
                  <Dropdown
                    menu={{
                      items: languages.map((item) => ({
                        key: item.code,
                        label: (
                          <div
                            className={`dropdown-language-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${
                              selectedLanguage?.id === item.id
                                ? "text-[#00B9D6] font-medium"
                                : "text-[#163986] font-medium"
                            }`}
                            onClick={() => changeLanguage(item.code)}>
                            <img
                              src={item.flag}
                              className="max-w-5 mr-2"
                              alt={item.name}
                            />
                            <p>{item.name}</p>
                          </div>
                        ),
                      })),
                    }}
                    trigger={["click"]}
                    placement="bottomRight">
                    <div className="flex justify-center items-center cursor-pointer mr-4 border border-[#163986] leading-1 p-2 rounded-full">
                      <div
                        className={`w-5 h-5 rounded-full bg-cover bg-center mr-2`}
                        style={{
                          backgroundImage: `url(${selectedLanguage?.flag})`,
                        }}></div>
                      <p className="text-[#163986] text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]">
                        {selectedLanguage?.code?.toUpperCase()}
                      </p>
                    </div>
                  </Dropdown>
                )}
                <MenuOutlined
                  onClick={() => setIsOpenDrawerMenu(true)}
                  style={{ color: "#163986" }}
                />
              </div>
            </div>
          )}
        </Header>
        <Content className="bg-white min-h-[unset]!">
          <Outlet />
        </Content>
        <Footer
          style={{
            backgroundColor: "#163986",
            paddingLeft: windowDimension.width < 550 ? "24px" : undefined,
            paddingRight: windowDimension.width < 550 ? "24px" : undefined,
          }}>
          <div className="container flex flex-col md:flex-row justify-between items-end m-auto gap-8">
            <div className="w-full">
              <div className="mb-8 flex justify-center md:justify-start items-center">
                <p className="text-white text-[13px] md:text-[14px] lg:text-[15px] mr-4">
                  {t("Follow us")}
                </p>
                <Link
                  to={"https://www.facebook.com/bial.farmaceutica/"}
                  target="_blank"
                  className="mr-4">
                  <FaFacebook className="text-white text-[18px] sm:text-[19px] md:text-[20px] lg:text-[22px]" />
                </Link>
                <Link
                  to={"https://www.linkedin.com/company/bial/home/"}
                  target="_blank"
                  className="mr-4">
                  <FaLinkedin className="text-white text-[18px] sm:text-[19px] md:text-[20px] lg:text-[22px]" />
                </Link>
                <Link
                  to={"https://www.instagram.com/bialpharmaceutical/"}
                  target="_blank"
                  className="mr-4">
                  <FaInstagram className="text-white text-[18px] sm:text-[19px] md:text-[20px] lg:text-[22px]" />
                </Link>
                <Link
                  to={
                    "https://www.youtube.com/channel/UCcoeRBF4Ivdm4aCwTDZdYIA"
                  }
                  target="_blank">
                  <FaYoutube className="text-white text-[18px] sm:text-[19px] md:text-[20px] lg:text-[22px]" />
                </Link>
              </div>
              <div className="flex justify-center md:justify-start items-center gap-4">
                <Link to={`/${i18n.language}/contact`}>
                  <p className="text-white text-[12px] md:text-[13px] lg:text-[13-5px] underline text-center md:text-left">
                    {t("Contact Form")}
                  </p>
                </Link>
                <p className="text-white">|</p>
                <Link
                  to={`https://www.bial.com/en/terms-and-conditions`}
                  target="_blank">
                  <p className="text-white text-[12px] md:text-[13px] lg:text-[13-5px] underline text-center md:text-left">
                    {t("Terms and conditions")}
                  </p>
                </Link>
                <p className="text-white">|</p>
                <Link
                  to={"https://www.bial.com/en/privacy-policy"}
                  target="_blank">
                  <p className="text-white text-[12px] md:text-[13px] lg:text-[13-5px] underline text-center md:text-left">
                    {t("Privacy policy")}
                  </p>
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center md:items-end w-full mt-2">
              <Link to={"https://www.bial.com/en"} target="_blank">
                <img
                  src={bialLogo}
                  className="max-h-10 invert-[1] brightness-[0] cursor-pointer"
                />
              </Link>
              <p className="text-white text-[11px] md:text-[12px] lg:text-[13px] mt-6!">
                © {dayjs().year()} Bial. {t("All rights reserved.")}
              </p>
            </div>
          </div>
        </Footer>
      </Layout>
    </div>
  );
};
export default Main;
