import { useContext } from "react";
import { Link, useLocation } from "react-router";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import { Context } from "../utils/context";
import useChangeLanguage from "../utils/useChangeLanguage";
import LanguageSelector from "../utils/languageSelector";
import LanguageCarousel from "../components/auth/languageCarousel";
import { LuChevronDown } from "react-icons/lu";

import logo from "../assets/BIAL-Regional-Academy.png";
import logoBialFooter from "../assets/BIAL-logo-footer-Login.svg";
import bgLogin from "../assets/Background-login.png";

const SUPPORT_EMAIL = "info@academyweb.bial.com";

/**
 * @function AuthLayout
 * @description Layout component for authentication pages, including login, registration, and password recovery.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to be rendered inside the layout.
 * @param {string} [props.cardClassName="max-w-112.5"] - Additional class names for the card container.
 * @param {"dropdown"|"carousel"} [props.languagePicker="dropdown"] - Language choice: "carousel" (login and register forms: flags
 * below the logo, in evidence) or "dropdown" (other steps: selector on the top corner of the card).
 * @param {string} [props.languageHint] - Help text below the carousel (e.g. on register, the account region follows the language).
 */

export default function AuthLayout({
  children,
  cardClassName = "max-w-112.5",
  languagePicker = "dropdown",
  languageHint,
}) {
  const { languages } = useContext(Context);
  const { t, i18n } = useTranslation();
  const changeLanguage = useChangeLanguage();
  // Título da tab do browser pela página (sem isto ficava o da página anterior, ex.: «Downloads»)
  const { pathname } = useLocation();
  const pageTitle = /\/register/.test(pathname)
    ? t("Register")
    : /\/recover/.test(pathname)
      ? t("Recover password")
      : t("Login");

  const selectedLanguage = languages.find((l) => l.code === i18n.language);
  const isCarousel = languagePicker === "carousel";

  const footerLink =
    "text-[12.5px] sm:text-[13px] md:text-[14px] text-center text-[#163986] hover:text-[#00B9D6]";

  return (
    <div
      className="flex flex-col justify-between w-full min-h-full bg-[#F7F7F7] bg-contain bg-right bg-no-repeat"
      style={{ backgroundImage: `url(${bgLogin})` }}>
      <Helmet>
        <title>{pageTitle} - Bial Regional Academy</title>
      </Helmet>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full p-4 sm:p-6">
        <div className={`relative w-full ${cardClassName} sm:mt-15`}>
          {/* Seletor nos passos sem o carrossel (recuperar password, código...): mobile acima do cartão (não tapa o logo), a partir de sm
              no canto superior do cartão. Pastilha maior, com o nome do idioma e a seta do menu, para se ver que se pode mudar */}
          {!isCarousel && (
            <div className="flex justify-end mb-3 sm:mb-0 sm:absolute sm:-right-8 sm:-top-5.5 z-10">
              <LanguageSelector
                languages={languages}
                selectedLanguage={selectedLanguage}
                onSelect={(item) => changeLanguage(item.code)}
                keyboardSelect>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-label={`${t("Language")}: ${selectedLanguage?.name ?? ""}`}
                  title={t("Language")}
                  className="inline-flex items-center gap-2 h-11 pl-1.5 pr-3 rounded-full border border-[#163986] text-[#163986] font-semibold text-[13px] sm:text-sm shadow-[0_2px_8px_rgba(22,57,134,0.18)] cursor-pointer transition-colors bg-[#E6F8FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B9D6]">
                  <span
                    className="w-7 h-7 rounded-full bg-cover bg-center ring-1 ring-black/10"
                    style={{
                      backgroundImage: `url(${selectedLanguage?.flag})`,
                    }}
                    aria-hidden="true"
                  />
                  <span lang={selectedLanguage?.code}>
                    {selectedLanguage?.name}
                  </span>
                  <LuChevronDown className="text-base" aria-hidden="true" />
                </button>
              </LanguageSelector>
            </div>
          )}
          <div className="w-full bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)]">
            <div className="flex flex-col p-4 sm:p-6">
              <Link
                to={`/${i18n.language}`}
                className="w-full max-w-50 sm:max-w-62.5 md:max-w-75 h-auto mx-auto mb-4 sm:mb-6">
                <img src={logo} alt="BIAL Regional Academy Logo" />
              </Link>

              {/* Login e registo: escolha do idioma em destaque (no registo define a região da conta) */}
              {isCarousel && <LanguageCarousel hint={languageHint} />}

              {children}

              <p className="text-center text-[11px] sm:text-xs mt-6 text-[#707070]">
                {t(
                  "If you have trouble accessing your account, please contact our support team at",
                )}{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-[#163986]! underline! break-all">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="col-span-3 md:col-span-1 p-4 flex justify-center items-center">
          <a
            href="https://www.bial.com/en"
            target="_blank"
            rel="noopener noreferrer">
            <img
              src={logoBialFooter}
              className="max-w-30 sm:max-w-36 md:max-w-40 lg:max-w-45"
              alt="Bial"
            />
          </a>
        </div>
        <div className="col-span-3 md:col-span-1 flex flex-col justify-center items-center p-4">
          <div className="flex">
            <div className="pr-3">
              <Link to={`/${i18n.language}/contact`}>
                <p className={footerLink}>{t("Contact Form")}</p>
              </Link>
            </div>
            <div className="border-r border-l border-[#163986] pl-3 pr-3">
              <a
                href="https://www.bial.com/en/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer">
                <p className={footerLink}>{t("Terms and conditions")}</p>
              </a>
            </div>
            <div className="pl-3">
              <a
                href="https://www.bial.com/en/privacy-policy"
                target="_blank"
                rel="noopener noreferrer">
                <p className={footerLink}>{t("Privacy policy")}</p>
              </a>
            </div>
          </div>
          <p className="text-[11px] sm:text-[12px] md:text-[13px] lg:text-sm mt-4 text-[#163986]">
            © {dayjs().format("YYYY")} Bial. {t("All rights reserved.")}
          </p>
        </div>
      </div>
    </div>
  );
}
