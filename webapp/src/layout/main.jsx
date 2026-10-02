import React, { useContext, useMemo, useState } from "react";
import { LogoutOutlined, MenuOutlined } from "@ant-design/icons";
import { Button, Drawer, Dropdown, Layout } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/BIAL-Regional-Academy.png";

import { Context } from "../utils/context";
import { usePermission } from "../utils/usePermission";

import Logout from "../components/logout";
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
import {
  MdChevronRight,
  MdClose,
  MdInfoOutline,
  MdLogin,
  MdLogout,
  MdOutlineAdminPanelSettings,
  MdOutlineAssessment,
  MdOutlineDescription,
  MdOutlineFileDownload,
  MdOutlineHelpOutline,
  MdOutlineConfirmationNumber,
  MdOutlinePersonOutline,
  MdOutlineSchool,
  MdPersonAddAlt,
} from "react-icons/md";
import dayjs from "dayjs";
import useChangeLanguage from "../utils/useChangeLanguage";
import LanguageSelector from "../utils/languageSelector";
import UserAvatar from "../utils/userAvatar";

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

const DRAWER_ICONS = {
  about: MdInfoOutline,
  "": MdOutlineSchool,
  documents: MdOutlineDescription,
  downloads: MdOutlineFileDownload,
  faqs: MdOutlineHelpOutline,
};

// Link do drawer mobile: ícone, label e (opcional) contador de não lidos
const DrawerLink = ({ to, icon: Icon, active, badge, children, onClick, ...rest }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`dm-link ${active ? "dm-link-active" : ""}`}
    {...rest}>
    {React.createElement(Icon, { className: "dm-link-icon" })}
    <span className="dm-link-label">{children}</span>
    {badge > 0 && <span className="dm-badge">{badge}</span>}
  </Link>
);

const Main = () => {
  const {
    user,
    logout,
    languages,
    windowDimension,
    notifications,
    unreadTicketsCount,
    isLoggedIn,
    selectedLanguage,
    isStaff,
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

  // Mesma mudança de idioma do header: mantém o header sincronizado e mostra a animação de carregamento
  const changeLanguage = useChangeLanguage();

  const nameParts = user?.name?.split(" ") ?? [];
  const userShortName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : (nameParts[0] ?? "");
  const unreadNotifications = (notifications ?? []).filter(
    (n) => n.is_read === 0,
  ).length;
  // Quem pode gerir tickets vai para o backoffice; os restantes veem os seus tickets no site
  const { canRead: canManageTickets } = usePermission("ticket");
  const ticketsPath = canManageTickets ? "/admin/tickets" : `/${i18n.language}/tickets`;

  function closeDrawer() {
    setIsOpenDrawerMenu(false);
  }

  return (
    <>
      <Layout className="h-auto! min-h-screen!">
        <Logout
          open={isOpenLogout}
          close={() => setIsOpenLogout(false)}
          submit={logout}
        />
        <Header className="sticky top-0 z-100! shrink-0 bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center px-0! h-16! sm:h-20! lg:h-25! max-h-25">
          <Drawer
            open={isOpenDrawerMenu}
            size={"85%"}
            onClose={closeDrawer}
            maskClosable={true}
            extra={[]}
            className="drawer-learning drawer-main">
            <div className="dm-root">
              <div className="dm-header">
                <button
                  type="button"
                  aria-label={t("Close")}
                  className="dm-close"
                  onClick={closeDrawer}>
                  <MdClose />
                </button>
                {isLoggedIn ? (
                  <Link
                    to={`/${i18n.language}/account`}
                    className="dm-user"
                    onClick={closeDrawer}>
                    <UserAvatar
                      user={user}
                      size={44}
                      style={{ color: "#163986", backgroundColor: "#FFFFFF" }}
                    />
                    <div className="dm-user-text">
                      <span className="dm-user-name">
                        {userShortName}
                      </span>
                      {user.email && (
                        <span className="dm-user-email">{user.email}</span>
                      )}
                    </div>
                    <MdChevronRight className="dm-user-arrow" />
                  </Link>
                ) : (
                  <div className="dm-guest">
                    <Link
                      to={`/${i18n.language}/login`}
                      className="dm-btn dm-btn-solid"
                      onClick={closeDrawer}>
                      <MdLogin />
                      {t("Login")}
                    </Link>
                    <Link
                      to={`/${i18n.language}/register`}
                      className="dm-btn dm-btn-outline"
                      onClick={closeDrawer}>
                      <MdPersonAddAlt />
                      {t("Register")}
                    </Link>
                  </div>
                )}
              </div>

              <nav className="dm-body">
                <div className="dm-nav">
                  {menuItems
                    .filter((item) =>
                      isLoggedIn
                        ? !item.hideOnLoggedIn
                        : !item.loggedIn && !item.hideOnLoggedIn,
                    )
                    .map((item) => (
                      <DrawerLink
                        key={item.path}
                        to={item.path}
                        icon={DRAWER_ICONS[item.section ?? ""] ?? MdOutlineSchool}
                        active={isActiveItem(item)}
                        onClick={closeDrawer}>
                        {t(item.label)}
                      </DrawerLink>
                    ))}
                </div>

                {isLoggedIn && (
                  <>
                    <p className="dm-section-title">{t("My account")}</p>
                    <div className="dm-nav">
                      {isStaff && (
                        <DrawerLink
                          to="/admin"
                          icon={MdOutlineAdminPanelSettings}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={closeDrawer}>
                          {t("Go to backoffice")}
                        </DrawerLink>
                      )}
                      <DrawerLink
                        to={`/${i18n.language}/account`}
                        icon={MdOutlinePersonOutline}
                        active={currentSection === "account"}
                        onClick={closeDrawer}>
                        {t("My account")}
                      </DrawerLink>
                      <DrawerLink
                        to={`/${i18n.language}/result`}
                        icon={MdOutlineAssessment}
                        active={currentSection === "result"}
                        onClick={closeDrawer}>
                        {t("Results")}
                      </DrawerLink>
                      <DrawerLink
                        to={`/${i18n.language}/notifications`}
                        icon={MdNotificationsNone}
                        active={currentSection === "notifications"}
                        badge={unreadNotifications}
                        onClick={closeDrawer}>
                        {t("Notifications")}
                      </DrawerLink>
                      <DrawerLink
                        to={ticketsPath}
                        icon={MdOutlineConfirmationNumber}
                        active={currentSection === "tickets"}
                        badge={unreadTicketsCount}
                        onClick={closeDrawer}>
                        {t("Tickets")}
                      </DrawerLink>
                    </div>
                  </>
                )}
              </nav>

              {isLoggedIn && (
                <div className="dm-footer">
                  <button
                    type="button"
                    className="dm-logout"
                    onClick={() => {
                      closeDrawer();
                      setIsOpenLogout(true);
                    }}>
                    <MdLogout />
                    {t("Logout")}
                  </button>
                </div>
              )}
            </div>
          </Drawer>
          {windowDimension.width > 1334 ? (
            <div className="grid grid-cols-5 page-frame">
              <div
                onClick={() => navigate(`/${i18n.language}`)}
                className="cursor-pointer">
                <img src={logo} className="max-h-10 sm:max-h-12 lg:max-h-15" />
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
                    : // Visitantes: no centro só About e FAQs (Login e Register ficam à direita)
                      !item.loggedIn &&
                      !item.hideOnLoggedIn && (
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
                  <LanguageSelector
                    languages={languages}
                    selectedLanguage={selectedLanguage}
                    onSelect={(item) => changeLanguage(item.code)}
                    className="mr-4"
                  />
                )}

                {/* Visitantes: Login e Register ao lado do seletor de idioma */}
                {!isLoggedIn && (
                  <div className="flex items-center gap-2">
                    <Link to={`/${i18n.language}/login`}>
                      <Button className="main-secondary-cta-button">{t("Login")}</Button>
                    </Link>
                    <Link to={`/${i18n.language}/register`}>
                      <Button type="primary" className="main-cta-button">
                        {t("Register")}
                      </Button>
                    </Link>
                  </div>
                )}

                {user && Object.keys(user).length > 0 && (
                  <div className="flex">
                    <Dropdown
                      menu={{
                        items: [
                          isStaff && {
                            key: "backoffice",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${currentSection === "admin" ? "active" : ""}`}
                                to="/admin"
                                target="_blank"
                                rel="noopener noreferrer">
                                <div className="flex items-center">
                                  <div className="w-5 h-5 mr-2 flex justify-center items-center"><MdOutlineAdminPanelSettings className="text-[16px]" /></div>
                                  <p>{t("Go to backoffice")}</p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "account",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${currentSection === "account" ? "active" : ""}`}
                                to={`/${i18n.language}/account`}>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 mr-2 flex justify-center items-center"><MdOutlinePersonOutline className="text-[16px]" /></div>
                                  <p>{t("My account")}</p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "result",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${currentSection === "result" ? "active" : ""}`}
                                to={`/${i18n.language}/result`}>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 mr-2 flex justify-center items-center"><MdOutlineAssessment className="text-[16px]" /></div>
                                  <p>{t("Results")}</p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "tickets",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${currentSection === "tickets" ? "active" : ""}`}
                                to={ticketsPath}>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 mr-2 flex justify-center items-center">
                                    {unreadTicketsCount > 0 ? (
                                      <div className="w-5 h-5 bg-[#00B9D6] flex justify-center items-center">
                                        <p className="text-white text-[10px]">{unreadTicketsCount}</p>
                                      </div>
                                    ) : (
                                      <MdOutlineConfirmationNumber className="text-[16px]" />
                                    )}
                                  </div>
                                  <p>{t("Tickets")}</p>
                                </div>
                              </Link>
                            ),
                          },
                          {
                            key: "notification",
                            label: (
                              <Link
                                className={`dropdown-user-menu-item flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px] ${currentSection === "notifications" ? "active" : ""}`}
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
                                      <MdNotificationsNone className="text-[16px]" />
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
                      placement="bottomLeft">
                      <div className="flex justify-center items-center cursor-pointer">
                        <UserAvatar user={user} />
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
            <div className="flex justify-between items-center page-frame">
              <div
                onClick={() => navigate(`/${i18n.language}`)}
                className="cursor-pointer">
                <img src={logo} className="max-h-10 sm:max-h-12 lg:max-h-15" />
              </div>
              <div className="flex items-center">
                {((user && Object.keys(user).length === 0) ||
                  user?.id_role === 1) && (
                  <LanguageSelector
                    languages={languages}
                    selectedLanguage={selectedLanguage}
                    onSelect={(item) => changeLanguage(item.code)}
                    className="mr-4"
                  />
                )}
                <MenuOutlined
                  onClick={() => setIsOpenDrawerMenu(true)}
                  style={{ color: "#163986" }}
                />
              </div>
            </div>
          )}
        </Header>
        {/* Coluna flex: permite às páginas ocuparem a altura disponível (ex.: About centrada no eixo Y) */}
        <Content className="bg-white min-h-[unset]! flex flex-col">
          <Outlet />
        </Content>
        <Footer
          className="px-0! py-6! md:py-8!"
          style={{ backgroundColor: "#163986" }}>
          {/* Mesma moldura (.page-frame) do header e do conteúdo */}
          <div className="page-frame flex flex-col md:flex-row justify-between items-center md:items-end gap-6 md:gap-8">
            <div className="w-full">
              {/* Redes sociais: ícones discretos e alinhados com o label */}
              <div className="mb-4 md:mb-6 flex justify-center md:justify-start items-center gap-3 md:gap-4">
                <p className="text-white text-[12px] md:text-[13px] leading-none">
                  {t("Follow us")}
                </p>
                <div className="flex items-center gap-3 md:gap-3.5">
                  {[
                    {
                      Icon: FaFacebook,
                      url: "https://www.facebook.com/bial.farmaceutica/",
                      label: "Facebook",
                    },
                    {
                      Icon: FaLinkedin,
                      url: "https://www.linkedin.com/company/bial/home/",
                      label: "LinkedIn",
                    },
                    {
                      Icon: FaInstagram,
                      url: "https://www.instagram.com/bialpharmaceutical/",
                      label: "Instagram",
                    },
                    {
                      Icon: FaYoutube,
                      url: "https://www.youtube.com/channel/UCcoeRBF4Ivdm4aCwTDZdYIA",
                      label: "YouTube",
                    },
                  ].map((social) => (
                    <Link
                      key={social.label}
                      to={social.url}
                      target="_blank"
                      aria-label={social.label}
                      className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
                      <social.Icon className="text-white text-[16px] md:text-[18px] xl:text-[19px]" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1.5 sm:gap-x-3 md:gap-x-4">
                <Link to={`/${i18n.language}/contact`}>
                  <p className="text-white text-[11.5px] sm:text-[12px] md:text-[12.5px] underline text-center md:text-left">
                    {t("Contact Form")}
                  </p>
                </Link>
                <p className="hidden sm:block text-white/70 text-[12px]">|</p>
                <Link
                  to={`https://www.bial.com/en/terms-and-conditions`}
                  target="_blank">
                  <p className="text-white text-[11.5px] sm:text-[12px] md:text-[12.5px] underline text-center md:text-left">
                    {t("Terms and conditions")}
                  </p>
                </Link>
                <p className="hidden sm:block text-white/70 text-[12px]">|</p>
                <Link
                  to={"https://www.bial.com/en/privacy-policy"}
                  target="_blank">
                  <p className="text-white text-[11.5px] sm:text-[12px] md:text-[12.5px] underline text-center md:text-left">
                    {t("Privacy policy")}
                  </p>
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center md:items-end w-full mt-2">
              <Link to={"https://www.bial.com/en"} target="_blank">
                <img
                  src={bialLogo}
                  className="max-h-8 sm:max-h-9 md:max-h-10 invert-[1] brightness-[0] cursor-pointer"
                />
              </Link>
              <p className="text-white text-[11px] sm:text-[11.5px] md:text-[12px] mt-4! md:mt-6!">
                © {dayjs().year()} Bial. {t("All rights reserved.")}
              </p>
            </div>
          </div>
        </Footer>
      </Layout>
    </>
  );
};
export default Main;
