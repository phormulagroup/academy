import { useContext, useRef, useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";
import { Link, useLocation } from "react-router-dom";
import { TbCameraPlus } from "react-icons/tb";
import { LuBookOpen, LuMail, LuMapPin, LuUser } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import i18n from "../../../utils/i18n";
import UserAvatar from "../../../utils/userAvatar";
import { AVATAR_ACCEPT, avatarFileError, uploadUserAvatar } from "../../../utils/avatar";

// Cabeçalho da conta do utilizador (A minha conta e Resultados): avatar (editável na conta), dados principais e a navegação
// entre as duas páginas.
export default function UserHero({ editable = false }) {
  const { user, setUser, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const location = useLocation();
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = avatarFileError(file);
    if (error) {
      toastApi.error(t(error));
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadUserAvatar(file, user);
      // Só muda a imagem (img): a sessão atual continua válida, não é preciso guardar outro token
      setUser(res.user);
      toastApi.success(t("Avatar updated successfully"));
    } catch (err) {
      console.log(err);
      toastApi.error(t("Could not update the avatar, please try again"));
    } finally {
      setIsUploading(false);
    }
  }

  const tabs = [
    { path: "account", label: t("My account"), icon: <LuUser /> },
    { path: "result", label: t("Results"), icon: <LuBookOpen /> },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 rounded-[16px] bg-white p-4 shadow-[0px_3px_6px_#00000029] sm:p-6 lg:p-8">
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <div className="group relative shrink-0">
          {editable ? (
            <>
              <button type="button" aria-label={t("Change avatar")} title={t("Change avatar")} disabled={isUploading} onClick={() => inputRef.current?.click()} className="block cursor-pointer rounded-full border-0 bg-transparent p-0">
                <UserAvatar user={user} size={{ xs: 72, sm: 88, md: 96, lg: 104, xl: 104, xxl: 104 }} />
              </button>
              <Button
                shape="circle"
                aria-label={t("Change avatar")}
                loading={isUploading}
                icon={<TbCameraPlus className="text-[16px]" />}
                onClick={() => inputRef.current?.click()}
                className="absolute! right-0 bottom-0 border-2! border-white! bg-[#163986]! text-white! shadow-md hover:bg-[#00B9D6]! w-8! h-8! min-w-8!"
              />
              <input ref={inputRef} type="file" accept={AVATAR_ACCEPT} hidden onChange={handleAvatarChange} />
            </>
          ) : (
            <UserAvatar user={user} size={{ xs: 72, sm: 88, md: 96, lg: 104, xl: 104, xxl: 104 }} />
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-1! truncate font-ryker text-[20px] font-bold leading-tight sm:text-[24px]">{user.name}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#5B5F6B]">
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

      <div className="flex rounded-[12px] bg-[#F2F3F5] p-1">
        {tabs.map((tab) => {
          const active = location.pathname.includes(tab.path);
          return (
            <Link
              key={tab.path}
              to={`/${i18n.language}/${tab.path}`}
              style={active ? { backgroundColor: "#163986", color: "#fff" } : { color: "#5B5F6B" }}
              className={`flex items-center gap-2 rounded-[9px] px-4 py-2 text-[14px] font-medium transition-colors ${active ? "" : "hover:bg-white"}`}>
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
