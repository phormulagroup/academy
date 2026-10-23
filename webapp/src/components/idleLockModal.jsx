import { useContext, useEffect, useState } from "react";
import { Button, Form, Input, Modal } from "antd";
import axios from "axios";
import { LuLock, LuLogOut } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../utils/context";
import endpoints from "../utils/endpoints";
import i18n from "../utils/i18n";
import { getDeviceToken } from "../utils/trustedDevice";
import { IDLE_MINUTES } from "../utils/useIdleLock";
import { requiredRule, setFieldError } from "../utils/formFieldError";
import UserAvatar from "../utils/userAvatar";
import bgLogin from "../assets/Background-login.png";

// Sessão bloqueada por inatividade: o ecrã fica desfocado e tapado, e a pessoa volta a entrar só com a palavra-passe, sem perder a página
// onde estava. Se a API pedir o código de verificação (dispositivo não reconhecido) ou a conta mudar, termina a sessão.
export default function IdleLockModal() {
  const { isLoggedIn, isIdleLocked, user, resumeSession, logout, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const open = isLoggedIn && isIdleLocked && !!user?.id;

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  async function submit(values) {
    setIsLoading(true);
    try {
      const res = await axios.post(endpoints.auth.login, {
        data: { email: user.email, password: values.password, lang: i18n.language, device_token: await getDeviceToken(user.email) },
      });
      if (res.data.token && res.data.user?.id === user.id) {
        resumeSession(res.data.token);
        return;
      }
      if (res.data.message === "The password is not correct, try again.") {
        setFieldError(form, "password", t("The password is not correct, try again."));
        return;
      }
      // Pede código de verificação, conta com outro estado ou outra conta: volta ao login normal
      toastApi.open({ type: "warning", content: t("Your session could not be resumed. Please log in again.") });
      logout();
    } catch (err) {
      toastApi.open({ type: "error", content: t(err?.response?.data?.message || "Something went wrong, try again later.") });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      centered
      width={440}
      zIndex={5000}
      destroyOnHidden
      // Fundo do login (arte da Bial), opaco: o conteúdo por trás não se vê enquanto a sessão está bloqueada
      styles={{ mask: { backgroundColor: "#F7F7F7", backgroundImage: `url(${bgLogin})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } }}>
      <div className="flex flex-col items-center text-center px-1 sm:px-3 pt-2 pb-1">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#E6F8FB] text-[26px] text-[#00B9D6]">
          <LuLock aria-hidden="true" />
        </span>
        <p className="font-ryker font-bold text-[#163986] text-[19px] sm:text-[21px] mt-4 mb-1!">{t("Session locked due to inactivity")}</p>
        <p className="text-[13px] sm:text-sm text-[#5F6B7A] mb-4!">
          {t("You were inactive for more than {{minutes}} minutes. Enter your password to continue where you left off.", { minutes: IDLE_MINUTES })}
        </p>

        <div className="flex w-full items-center gap-3 rounded-[12px] bg-[#F6F7F9] p-2.5 sm:p-3 mb-4 text-left">
          <UserAvatar user={user} size={40} className="shrink-0" />
          <div className="min-w-0">
            <p className="mb-0! truncate text-[13px] font-bold sm:text-[14px]">{user?.name}</p>
            <p className="mb-0! truncate text-[12px] text-[#8A8D98]">{user?.email}</p>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={submit} className="w-full" requiredMark={false}>
          <Form.Item name="password" rules={[requiredRule]} className="mb-5!">
            <Input.Password size="large" autoFocus autoComplete="current-password" placeholder={t("Password")} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={isLoading} className="w-full main-cta-button [&&]:font-bold!">
            {t("Continue")}
          </Button>
        </Form>

        <button
          type="button"
          onClick={logout}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent text-[13px] text-[#163986] underline hover:text-[#00B9D6]">
          <LuLogOut aria-hidden="true" /> {t("Log out instead")}
        </button>
      </div>
    </Modal>
  );
}
