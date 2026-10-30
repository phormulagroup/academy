import { useContext, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuCheck, LuInfo } from "react-icons/lu";

import { Context } from "../../utils/context";
import useChangeLanguage from "../../utils/useChangeLanguage";

/**
 * @component LanguageCarousel
 * @description Seleção de idioma nos formulários de autenticação (login e registo), com bandeiras grandes e o nome nativo de cada idioma. Mostra todos os idiomas de uma vez (numa grelha que parte em linhas se não couberem), sem setas nem scroll, e destaca o idioma atual. No registo, o idioma define a região da conta (hint).
 * @param {object} props
 * @param {boolean} [props.disabled] - Idioma bloqueado (ex.: depois de indicado o e-mail no login): mostra o atual e não deixa mudar.
 * @param {string} [props.hint] - Texto de ajuda por baixo (ex.: no registo, a conta fica associada à região do idioma).
 */
export default function LanguageCarousel({ hint, disabled = false }) {
  const { languages } = useContext(Context);
  const { t, i18n } = useTranslation();
  const changeLanguage = useChangeLanguage();

  const labelId = useId();
  const hintId = useId();
  const itemRefs = useRef([]);

  const selectedIndex = Math.max(
    0,
    languages.findIndex((l) => l.code === i18n.language),
  );
  // Roving tabindex: só um idioma recebe o Tab (o atual); as setas do teclado movem o foco entre eles
  // (até haver navegação pelo teclado, segue o idioma atual)
  const [focusedIndex, setFocusIndex] = useState(null);
  const focusIndex = focusedIndex ?? selectedIndex;

  function focusItem(index) {
    const next = (index + languages.length) % languages.length;
    setFocusIndex(next);
    itemRefs.current[next]?.focus({ preventScroll: true });
  }

  function onKeyDown(e) {
    const keys = {
      ArrowRight: focusIndex + 1,
      ArrowDown: focusIndex + 1,
      ArrowLeft: focusIndex - 1,
      ArrowUp: focusIndex - 1,
      Home: 0,
      End: languages.length - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    focusItem(keys[e.key]);
  }

  if (!languages.length) return null;

  return (
    <div className="auth-lang-carousel flex flex-col items-center w-full max-w-90 mx-auto mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-[#E9EDF3]">
      <p
        id={labelId}
        className="font-ryker font-semibold text-[#163986] text-[14px] sm:text-[15px] mb-2.5 sm:mb-3 text-center"
      >
        {t("Choose your language")}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className="auth-lang-track w-full p-1"
        style={{ "--auth-lang-count": languages.length }}
      >
          {languages.map((language, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={language.id}
                ref={(node) => (itemRefs.current[index] = node)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                lang={language.code}
                disabled={disabled && !isSelected}
                tabIndex={index === focusIndex ? 0 : -1}
                onFocus={() => setFocusIndex(index)}
                onClick={() => {
                  if (isSelected || disabled) return;
                  setFocusIndex(null);
                  changeLanguage(language.code);
                }}
                // Não escolhido: discreto (sem fundo nem contorno; bandeira e nome esbatidos), o hover aproxima-o um pouco; escolhido: contorno #163986, fundo a ~14%
                className={`auth-lang-item group flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-[10px] border-2 transition-[background-color,border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#163986] ${
                  isSelected
                    ? "border-[#163986] bg-[#00B9D6]/14 shadow-[0_2px_8px_rgba(22,57,134,0.14)] cursor-default"
                    : disabled
                      ? "border-transparent bg-transparent cursor-not-allowed opacity-50"
                      : "border-transparent bg-transparent cursor-pointer hover:bg-[#00B9D6]/6 hover:border-[#00B9D6]/25 focus-visible:bg-[#00B9D6]/6"
                }`}
              >
                <span className="relative">
                  <span
                    className={`block w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-cover bg-center ring-1 ring-black/10 transition-[transform,opacity,filter] ${
                      isSelected
                        ? ""
                        : disabled
                          ? "opacity-55 grayscale-35"
                          : "opacity-55 grayscale-35 group-hover:opacity-85 group-hover:grayscale-0 group-hover:scale-105 group-focus-visible:opacity-85 group-focus-visible:grayscale-0"
                    }`}
                    style={{ backgroundImage: `url(${language.flag})` }}
                    aria-hidden="true"
                  />
                  {isSelected && (
                    <span
                      className="absolute -right-1 -bottom-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#00B9D6] text-white text-[12px] ring-2 ring-white"
                      aria-hidden="true"
                    >
                      <LuCheck />
                    </span>
                  )}
                </span>
                <span
                  className={`text-[12px] sm:text-[13px] leading-tight whitespace-nowrap transition-colors ${
                    isSelected
                      ? "text-[#163986] font-bold"
                      : "text-[#5F6B7A] font-normal group-hover:text-[#163986] group-focus-visible:text-[#163986]"
                  }`}
                >
                  {language.name}
                </span>
              </button>
            );
          })}
        </div>
      {hint && (
        <p
          id={hintId}
          className="text-center text-[12px] sm:text-[13px] text-[#5F6B7A] leading-snug mt-3 max-w-80"
        >
          <LuInfo
            className="inline-block align-[-2px] mr-1.5 text-[#00B9D6]"
            aria-hidden="true"
          />
          {hint}
        </p>
      )}
    </div>
  );
}
