import { useContext } from "react";
import { LuLogOut, LuSave, LuShieldCheck } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../utils/context";
import UserAvatar from "../utils/userAvatar";
import ConfirmModal from "./admin/confirmModal";
import { hasFullAccess } from "../utils/roles";

// Confirmação de terminar a sessão: mostra a conta que vai sair e o que acontece a seguir
function Logout({ open, close, submit }) {
  const { t } = useTranslation();
  const { user } = useContext(Context);
  const isStaff = hasFullAccess(user);

  return (
    <ConfirmModal
      open={open}
      onCancel={close}
      onConfirm={submit}
      tone="info"
      icon={<LuLogOut />}
      width={480}
      title={t("Are you sure you want to log out?")}
      description={t("You will need to sign in again to access your account.")}
      okText={t("Yes, log me out")}
      cancelText={t("Stay signed in")}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-[12px] bg-[#F6F7F9] p-3">
          <UserAvatar user={user} size={44} className="shrink-0" />
          <div className="min-w-0">
            <p className="mb-0! truncate text-[14px] font-bold">{user?.name}</p>
            <p className="mb-0! truncate text-[12px] text-[#8A8D98]">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-[13px] text-[#5B5F6B]">
          <LuSave className="mt-0.5 shrink-0 text-[#2F8351]" />
          <span>{isStaff ? t("Unsaved changes on the page you are on will be lost.") : t("Your progress in the courses is saved.")}</span>
        </div>
        <div className="flex items-start gap-2 text-[13px] text-[#5B5F6B]">
          <LuShieldCheck className="mt-0.5 shrink-0 text-[#163986]" />
          <span>{t("For your security, log out if you are using a shared computer.")}</span>
        </div>
      </div>
    </ConfirmModal>
  );
}

export default Logout;
