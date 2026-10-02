import { useEffect, useRef, useState } from "react";
import { Button, Divider } from "antd";
import { useContext } from "react";

import { Context } from "../../../utils/context";

import { Link, useLocation } from "react-router-dom";
import { TbCameraPlus } from "react-icons/tb";
import { useTranslation } from "react-i18next";
import i18n from "../../../utils/i18n";
import UserAvatar from "../../../utils/userAvatar";
import {
  AVATAR_ACCEPT,
  avatarFileError,
  uploadUserAvatar,
} from "../../../utils/avatar";

// Tamanho do avatar por breakpoint (o ícone acompanha: metade do tamanho)
const AVATAR_SIZE = { xs: 80, sm: 112, md: 112, lg: 160, xl: 160, xxl: 160 };

export default function UserCard({ courses, editable = false }) {
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
      toastApi.open({ type: "error", content: t(error) });
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadUserAvatar(file, user);
      // Só muda a imagem (img): a sessão atual continua válida, não é preciso guardar outro token
      setUser(res.user);
      toastApi.open({
        type: "success",
        content: t("Avatar updated successfully"),
      });
    } catch (err) {
      console.log(err);
      toastApi.open({
        type: "error",
        content: t("Could not update the avatar, please try again"),
      });
    } finally {
      setIsUploading(false);
    }
  }

  useEffect(() => {
    console.log(courses);
  }, [courses]);

  return (
    <div className="bg-white p-4 sm:p-6 lg:p-10 flex flex-col items-center">
      <p className="font-ryker text-[18px] sm:text-[22px] lg:text-[26px] font-bold text-center leading-tight">
        {user.name}
      </p>
      {user.job && <p>{user.job}</p>}
      {editable ? (
        <div className="group relative mt-3 mb-3 lg:mt-4 lg:mb-4">
          <button
            type="button"
            aria-label={t("Change avatar")}
            title={t("Change avatar")}
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="block rounded-full cursor-pointer">
            <UserAvatar user={user} size={AVATAR_SIZE} />
            {/* Camada escura, removida ao passar o rato */}
            <span className="pointer-events-none absolute inset-0 rounded-full bg-black/5 transition-opacity duration-200 group-hover:opacity-0" />
          </button>
          {/* Botão sobre o contorno do avatar, no canto inferior direito (45º) */}
          <Button
            shape="circle"
            aria-label={t("Change avatar")}
            loading={isUploading}
            icon={<TbCameraPlus className="text-[16px] lg:text-[18px]" />}
            onClick={() => inputRef.current?.click()}
            className="absolute! right-[14.6%] bottom-[14.6%] translate-x-1/2 translate-y-1/2 border-2! border-white! bg-[#163986]! text-white! hover:bg-[#00B9D6]! shadow-md w-8! h-8! min-w-8! lg:w-10! lg:h-10! lg:min-w-10!"
          />
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            hidden
            onChange={handleAvatarChange}
          />
        </div>
      ) : (
        <UserAvatar
          user={user}
          size={AVATAR_SIZE}
          className="mt-3! mb-3! lg:mt-4! lg:mb-4!"
        />
      )}
      <Link to={`/${i18n.language}/account`}>
        <Button
          size="large"
          className={`mb-4 min-w-50 user-card-button ${location.pathname.includes("account") ? "selected" : ""}`}>
          <p className="font-bold text-[14px] lg:text-[16px]">
            {t("My account")}
          </p>
        </Button>
      </Link>
      <Link to={`/${i18n.language}/result`}>
        <Button
          size="large"
          className={`min-w-50 user-card-button ${location.pathname.includes("result") ? "selected" : ""}`}>
          <p className="font-bold text-[14px] lg:text-[16px]">{t("Results")}</p>
        </Button>
      </Link>

      {courses && (
        <div className="flex justify-center items-center gap-4 mt-6!">
          <div className="flex flex-col justify-start items-center">
            <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center">
              {courses.length}
            </p>
            <p className="text-[#707C87] text-[12px] text-center">
              {t("Course(s)")}
            </p>
          </div>
          <Divider orientation="vertical" className="m-0! h-full!" />
          <div className="flex flex-col justify-start items-center">
            <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center">
              {courses.length > 0
                ? courses.filter((_c) =>
                    _c.progress?.some(
                      (_p) =>
                        _p.is_completed === 1 &&
                        _p.activity_type === "course" &&
                        _p.is_deleted === 0,
                    ),
                  ).length
                : 0}
            </p>
            <p className="text-[#707C87] text-[12px] text-center">
              {t("Completed")}
            </p>
          </div>
          <Divider orientation="vertical" className="m-0!  h-full!" />
          <div className="flex flex-col justify-start items-center">
            <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center">
              {courses.length > 0
                ? courses.filter((_c) =>
                    _c.progress?.some(
                      (_p) =>
                        _p.is_completed === 1 &&
                        _p.activity_type === "course" &&
                        _p.is_deleted === 0,
                    ),
                  ).length
                : 0}
            </p>
            <p className="text-[#707C87] text-[12px] text-center">
              {t("Certificate(s)")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
