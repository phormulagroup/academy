import { Link, useLocation } from "react-router";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import LanguageCarousel from "../components/auth/languageCarousel";

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
 * @param {boolean} [props.languageLocked=false] - Bloqueia a mudança de idioma (ex.: login depois de indicado o e-mail): o carrossel fica à esquerda
 * na mesma, mas só mostra o idioma atual.
 * @param {string} [props.languageHint] - Help text below the carousel (e.g. on register, the account region follows the language).
 */

export default function AuthLayout({
  children,
  cardClassName = "max-w-112.5",
  languageLocked = false,
  languageHint,
}) {
  const { t, i18n } = useTranslation();
  // Título da tab do browser pela página (sem isto ficava o da página anterior, ex.: «Downloads»)
  const { pathname } = useLocation();
  const pageTitle = /\/register/.test(pathname)
    ? t("Register")
    : /\/recover/.test(pathname)
      ? t("Recover password")
      : t("Login");

  const footerLink =
    "text-[12.5px] sm:text-[13px] md:text-[14px] text-center text-[#163986] hover:text-[#00B9D6]";

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-full bg-white">
      <Helmet>
        <title>{pageTitle} - Bial Regional Academy</title>
      </Helmet>
      {/* Ecrã dividido: à esquerda (fundo branco) o logo, a escolha de idioma e o logo Bial no rodapé; à direita a arte da Bial
          com o formulário e os links do rodapé. Abaixo de lg empilha, sem arte */}
      <aside className="flex flex-col items-center justify-between w-full lg:w-2/5 lg:min-h-screen bg-white">
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-112.5 px-4 pt-8 pb-2 sm:px-6 lg:p-10">
          <Link
            to={`/${i18n.language}`}
            className="w-full max-w-50 sm:max-w-62.5 md:max-w-75 h-auto mx-auto mb-4 lg:mb-10 lg:max-w-85"
          >
            <img src={logo} alt="BIAL Regional Academy Logo" />
          </Link>
          <div className="w-full [&_.auth-lang-carousel]:lg:border-b-0 [&_.auth-lang-carousel]:lg:pb-0 [&_.auth-lang-carousel]:lg:mb-0">
            <LanguageCarousel
              hint={
                languageLocked
                  ? t("The language can't be changed at this step")
                  : languageHint
              }
              disabled={languageLocked}
            />
          </div>
        </div>
        <div className="hidden lg:flex p-6 justify-center items-center">
          <a
            href="https://www.bial.com/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={logoBialFooter}
              className="max-w-30 sm:max-w-36 md:max-w-40 lg:max-w-45"
              alt="Bial"
            />
          </a>
        </div>
      </aside>

      <main
        className="flex flex-col justify-between w-full lg:w-3/5 min-h-full bg-white lg:bg-[#F7F7F7] lg:bg-cover lg:bg-center lg:bg-no-repeat"
        style={{ backgroundImage: `url(${bgLogin})` }}
      >
        <div className="flex flex-col justify-center items-center min-h-125 w-full flex-1 p-4 sm:p-6">
          <div className={`relative w-full ${cardClassName}`}>
            <div className="w-full bg-white rounded-xl sm:border sm:border-white/60 sm:shadow-[0_12px_40px_rgba(22,57,134,0.15)]">
              <div className="flex flex-col p-4 sm:p-6">
                {children}

                <p className="text-center text-[11px] sm:text-xs mt-6 text-[#707070]">
                  {t(
                    "If you have trouble accessing your account, please contact our support team at",
                  )}{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-[#163986]! underline! break-all"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-4 gap-3 lg:gap-2 lg:mx-auto lg:mb-6 lg:px-6 lg:py-3 lg:rounded-full lg:bg-white/85 lg:backdrop-blur-sm lg:shadow-[0_2px_12px_rgba(22,57,134,0.12)]">
          <div className="lg:hidden">
            <a
              href="https://www.bial.com/en"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={logoBialFooter}
                className="max-w-30 sm:max-w-36 md:max-w-40 lg:max-w-45"
                alt="Bial"
              />
            </a>
          </div>
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
                rel="noopener noreferrer"
              >
                <p className={footerLink}>{t("Terms and conditions")}</p>
              </a>
            </div>
            <div className="pl-3">
              <a
                href="https://www.bial.com/en/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                <p className={footerLink}>{t("Privacy policy")}</p>
              </a>
            </div>
          </div>
          <p className="text-[11px] sm:text-[12px] md:text-[13px] lg:text-sm text-[#163986]">
            © {dayjs().format("YYYY")} Bial. {t("All rights reserved.")}
          </p>
        </div>
      </main>
    </div>
  );
}
