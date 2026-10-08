import { useContext, useEffect, useState } from "react";
import { Button, Modal } from "antd";
import { useTranslation } from "react-i18next";

import { Context } from "../utils/context";

const SECONDS = 10;

export default function PasswordChangedLogout({ open }) {
  const { t } = useTranslation();
  const { logout } = useContext(Context);
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (!open) return;
    setLeft(SECONDS);
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (open && left <= 0) logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, left]);

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      centered
      width={420}>
      <div
        className="auth-step auth-otp-success"
        role="status"
        aria-live="polite">
        <svg className="auth-otp-check" viewBox="0 0 52 52" aria-hidden="true">
          <circle
            className="auth-otp-check-circle"
            cx="26"
            cy="26"
            r="24"
            fill="none"
          />
          <path
            className="auth-otp-check-mark"
            fill="none"
            d="M15 27l7 7 15-16"
          />
        </svg>
        <p className="font-ryker font-bold text-[#163986] text-[18px] sm:text-[20px] mt-6 mb-0!">
          {t("Password changed successfully")}
        </p>
        <p className="text-[#707070] text-[13px] sm:text-sm mt-2 mb-0! max-w-80 leading-relaxed">
          {t(
            "For your security, your session will end in {{seconds}}s. Sign in again with your new password.",
            { seconds: Math.max(left, 0) },
          )}
        </p>
        <Button
          type="primary"
          className="main-cta-button mt-6!"
          onClick={logout}>
          {t("Sign out now")}
        </Button>
      </div>
    </Modal>
  );
}
