import { useContext } from "react";
import dayjs from "dayjs";
import { Link, useLocation } from "react-router-dom";
import { LuBookOpen, LuMail, LuMapPin, LuUser } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import i18n from "../../../utils/i18n";
import UserAvatarEditor from "../../userAvatarEditor";

// Cabeçalho da conta do utilizador (A minha conta e Resultados): avatar (editável na conta), dados principais e a navegação
// entre as duas páginas.
export default function UserHero({ editable = false }) {
  const { user, setUser } = useContext(Context);
  const { t } = useTranslation();
  const location = useLocation();
  const tabs = [
    { path: "account", label: t("My account"), icon: <LuUser /> },
    { path: "result", label: t("Results"), icon: <LuBookOpen /> },
  ];

  return (
    // Telemóvel/ecrãs estreitos: em coluna (avatar, dados, separadores); a partir de md, em linha
    <div className="flex flex-col items-center gap-5 rounded-[16px] bg-white p-5 shadow-[0px_3px_6px_#00000029] sm:p-6 md:flex-row md:justify-between lg:p-8">
      <div className="flex w-full min-w-0 flex-col items-center gap-4 text-center md:w-auto md:flex-row md:gap-6 md:text-left">
        {/* Avatar em destaque com as ações (carregar / mudar / remover) no próprio avatar */}
        <UserAvatarEditor user={user} canEdit={editable} onChange={setUser} />
        <div className="w-full min-w-0 md:w-auto">
          <p className="mb-1! truncate font-ryker text-[20px] font-bold leading-tight sm:text-[24px]">{user.name}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-[#5B5F6B] md:justify-start">
            {user.email && (
              <span className="flex items-center gap-1.5">
                <LuMail className="shrink-0" /> <span className="truncate">{user.email}</span>
              </span>
            )}
            {user.country && (
              <span className="flex items-center gap-1.5">
                <LuMapPin className="shrink-0" /> {t(user.country)}
              </span>
            )}
          </div>
          {user.created_at && (
            <p className="mb-0! mt-2 text-[12px] text-[#8A8D98]">
              {t("Registered on")} {dayjs(user.created_at).format("DD/MM/YYYY")}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full justify-center rounded-[12px] bg-[#F2F3F5] p-1 sm:w-auto">
        {tabs.map((tab) => {
          const active = location.pathname.includes(tab.path);
          return (
            <Link
              key={tab.path}
              to={`/${i18n.language}/${tab.path}`}
              style={active ? { backgroundColor: "#163986", color: "#fff" } : { color: "#5B5F6B" }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[9px] px-4 py-2 text-[14px] font-medium transition-colors sm:flex-none ${active ? "" : "hover:bg-white"}`}>
              {/* Cor no próprio conteúdo: o estilo global das ligações (a) sobrepõe-se à cor do <Link> */}
              <span className="flex items-center gap-2" style={{ color: active ? "#fff" : "#5B5F6B" }}>
                {tab.icon}
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
