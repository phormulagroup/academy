import { useContext, useEffect, useState } from "react";
import { Button, Form, Input } from "antd";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { LuMailCheck, LuRotateCw, LuArrowLeft } from "react-icons/lu";

import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import { otpCodeRule, otpPattern, setFieldError } from "../../utils/formFieldError";
import useRetryLock from "../../utils/useRetryLock";
import maskEmail from "../../utils/maskEmail";
import { AuthStepHeader, AuthStepSuccess, authLinkClass } from "./authStep";
import { RetryNotice, RetryTooltip } from "./retryLock";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

// Segundos que faltam para poder reenviar, a partir da hora em que o último código foi enviado
const secondsLeft = (sentAt) => Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - (sentAt || 0)) / 1000));

/**
 * @component LoginCode
 * @description Segundo passo do login (2FA): o código de 6 dígitos enviado por e-mail depois da password certa.
 * Confirma o código na API (/auth/verifyLoginCode) e, se estiver certo, mostra a animação de sucesso e chama onVerified
 * com a sessão ({ user, token }). onRestart volta ao formulário de login (outra conta, sessão de verificação terminada).
 * sentAt: hora (ms) do último envio, para a contagem do reenvio continuar depois de mudar de idioma; onResent é chamado
 * com a hora de cada reenvio.
 */
export default function LoginCode({ email, sentAt, onVerified, onRestart, onResent }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const code = Form.useWatch("code", form) || "";
  const isComplete = otpPattern(CODE_LENGTH).test(code);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(() => secondsLeft(sentAt));
  const [isVerified, setIsVerified] = useState(false);

  // Bloqueios da API para este e-mail: códigos errados a mais (verificar) e pedidos de código a mais (reenviar)
  // Limites do 2FA: códigos errados (Verificar) e códigos pedidos (Reenviar, partilhado com o login). São independentes: com códigos
  // errados a mais pode pedir-se outro código, mas só se valida no fim do bloqueio
  const codeLock = useRetryLock("otp", email);
  const sendLock = useRetryLock("otp_send", email);

  // Contagem decrescente para poder pedir outro código
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function verify(values) {
    setIsVerifying(true);
    axios
      .post(endpoints.auth.verifyLoginCode, {
        data: { email, code: values.code },
      })
      .then((res) => {
        if (res.data.user && res.data.token) {
          // Sucesso: animação no próprio formulário e depois entra na aplicação
          setIsVerified(true);
          setTimeout(() => onVerified({ user: res.data.user, token: res.data.token }), 2800);
          return;
        }
        setIsVerifying(false);
        if (res.data.restart) {
          toastApi.open({ type: "error", content: t(res.data.message) });
          onRestart();
        } else if (res.data.expired) {
          toastApi.open({ type: "warning", content: t(res.data.message) });
          setResendIn(0);
        } else {
          // Código errado: erro no campo e popup, como na recuperação de password
          const message = t(res.data.message || "The verification code is not correct, try again.");
          setFieldError(form, "code", message);
          toastApi.open({ type: "error", content: message });
        }
      })
      .catch((err) => {
        setIsVerifying(false);
        codeLock.lock(err?.response?.data?.retry_after);
        toastApi.open({
          type: "error",
          content: t(err?.response?.data?.message || "Something went wrong, try again later."),
        });
      });
  }

  function resend() {
    setIsResending(true);
    axios
      .post(endpoints.auth.resendLoginCode, { data: { email } })
      .then((res) => {
        if (res.data.status) {
          form.resetFields();
          setResendIn(RESEND_SECONDS);
          onResent?.(Date.now());
          // Último pedido permitido: o próximo só depois do tempo indicado pela API
          sendLock.lock(res.data.retry_after);
          toastApi.open({
            type: "success",
            content: t("A new verification code was sent to your e-mail"),
          });
        } else {
          toastApi.open({ type: "error", content: t(res.data.message) });
          if (res.data.restart) onRestart();
        }
      })
      .catch((err) => {
        sendLock.lock(err?.response?.data?.retry_after);
        toastApi.open({
          type: "error",
          content: t(err?.response?.data?.message || "Something went wrong, try again later."),
        });
      })
      .finally(() => setIsResending(false));
  }

  if (isVerified) {
    return <AuthStepSuccess title={t("Verification successful")} subtitle={t("Taking you to the platform...")} />;
  }

  return (
    <div className="auth-step">
      <AuthStepHeader icon={<LuMailCheck />} title={t("Two-step verification")}>
        {t("We sent a 6-digit verification code to")} <b className="text-[#163986] break-all">{maskEmail(email)}</b>
      </AuthStepHeader>
      <Form form={form} layout="vertical" onFinish={verify} className="auth-form auth-otp-form" requiredMark={false}>
        <p className="pb-3 text-center text-[13px] sm:text-sm">
          <span className="text-[#ff4d4f] mr-1">*</span>
          {t("Verification code")}
        </p>
        <Form.Item name="code" rules={[otpCodeRule(CODE_LENGTH)]} validateTrigger="onSubmit" className="mb-3!">
          <Input.OTP
            size="large"
            length={CODE_LENGTH}
            autoFocus
            formatter={(value) => value.replace(/\D/g, "")}
            inputMode="numeric"
            aria-label={t("Verification code")}
          />
        </Form.Item>
        <p className={`text-center text-[12px] text-[#8B9CC3] mb-6 min-h-4.5 transition-opacity ${isComplete ? "opacity-0" : "opacity-100"}`}>
          {t("This field is required")}: {t("enter the {{count}}-digit code", { count: CODE_LENGTH })}
        </p>
        <RetryTooltip lock={codeLock}>
          <Button
            htmlType="submit"
            type="primary"
            size="large"
            className="w-full main-cta-button"
            disabled={!isComplete || codeLock.isLocked}
            loading={isVerifying}>
            {t("Verify")}
          </Button>
        </RetryTooltip>
        <RetryNotice lock={codeLock} text="Too many wrong codes. You can verify again in" />
        <div className="flex flex-col items-center gap-3 mt-6 text-[12.5px] sm:text-[13px]">
          <p className="text-[#707070]">
            {t("Didn't receive the code?")}{" "}
            {sendLock.isLocked ? (
              <span className="text-[#8B9CC3] tabular-nums">{t("New code available in {{time}}", { time: sendLock.time })}</span>
            ) : resendIn > 0 ? (
              <span className="text-[#8B9CC3]">{t("Resend in {{seconds}}s", { seconds: resendIn })}</span>
            ) : (
              <button type="button" onClick={resend} disabled={isResending} className={authLinkClass}>
                <LuRotateCw className={isResending ? "animate-spin" : ""} />
                {t("Resend code")}
              </button>
            )}
          </p>
          <button type="button" onClick={onRestart} className={authLinkClass}>
            <LuArrowLeft />
            {t("Use another account")}
          </button>
        </div>
      </Form>
    </div>
  );
}
