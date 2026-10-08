import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Form, Input } from "antd";
import {
  LuKeyRound,
  LuLockKeyhole,
  LuMailCheck,
  LuRotateCw,
} from "react-icons/lu";

import { Context } from "../../utils/context";

import axios from "axios";
import endpoints from "../../utils/endpoints";

import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import AuthLayout from "../../layout/auth";
import {
  AuthStepHeader,
  AuthStepLoading,
  AuthStepSuccess,
  authLinkClass,
} from "../../components/auth/authStep";
import maskEmail from "../../utils/maskEmail";
import { RetryNotice, RetryTooltip } from "../../components/auth/retryLock";
import useRetryLock, { clearRetryLocks } from "../../utils/useRetryLock";
import {
  emailFieldProps,
  emailRule,
  matchFieldRule,
  requiredRule,
  passwordRule,
  setFieldError,
  otpCodeRule,
  otpPattern,
} from "../../utils/formFieldError";

// Código de recuperação: 6 letras e/ou dígitos (gerado pela API)
const CODE_LENGTH = 6;
const CODE_FORMAT = { digitsOnly: false };

// Recuperação pendente (e-mail para onde foi o código), só na memória da página (nunca no armazenamento do browser, onde o e-mail
// ficaria visível): mudar de idioma volta a montar a página (ecrã de carregamento do idioma) e assim o passo do código reaparece já
// traduzido; recarregar a página volta ao primeiro passo. Dura o mesmo que o código (RECOVER_CODE_MINUTES na API)
const PENDING_RECOVER_MINUTES = 15;
let pendingMemory = null;
// Espera entre reenvios do código, como no 2FA (o limite real é o da API: 5 pedidos por hora)
const RESEND_SECONDS = 60;
const resendSecondsLeft = (sentAt) =>
  Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - (sentAt || 0)) / 1000));

const writePendingRecover = (value) => {
  pendingMemory = value;
};

function readPendingRecover() {
  if (
    pendingMemory &&
    Date.now() - pendingMemory.sentAt < PENDING_RECOVER_MINUTES * 60 * 1000
  )
    return pendingMemory;
  pendingMemory = null;
  return null;
}

export default function Recover() {
  const { toastApi } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  // Passos: email → sending (carregamento) → code → verified (sucesso) → password → changed (sucesso) → login
  const [pending, setPending] = useState(readPendingRecover);
  const [step, setStep] = useState(() => (pending ? "code" : "email"));

  const [form] = Form.useForm();
  const [formCode] = Form.useForm();
  const [formPassword] = Form.useForm();
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const isCodeComplete = otpPattern(CODE_LENGTH, CODE_FORMAT).test(code);

  // Bloqueios da API por e-mail: pedidos de código a mais (primeiro passo) e códigos errados a mais (código e nova password)
  const [email, setEmail] = useState("");
  // 1.º passo: limite de pedidos de código (partilhado com o Reenviar do 2.º passo). Os códigos errados só bloqueiam o Verificar
  const sendLock = useRetryLock("recover", email);
  const codeLock = useRetryLock("code", pending?.email);
  // Reenvio no passo do código: mesmo limite de pedidos, para o e-mail da recuperação pendente
  // Reenviar: só o limite de pedidos (partilhado com o Enviar código). Com códigos errados a mais pode pedir-se outro, mas só se valida
  // no fim desse bloqueio
  const resendLock = useRetryLock("recover", pending?.email);
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(() =>
    resendSecondsLeft(pending?.sentAt),
  );

  // Contagem decrescente para poder pedir outro código
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const navigate = useNavigate();

  function savePending(value) {
    setPending(value);
    writePendingRecover(value);
  }

  const genericError = () =>
    toastApi.open({
      type: "error",
      content: t("Something went wrong, please try again"),
    });

  // Erro do pedido: a mensagem da API quando existe (ex.: 429 "Too many attempts...") ou a genérica
  const requestError = (err) =>
    err?.response?.data?.message
      ? toastApi.open({ type: "error", content: t(err.response.data.message) })
      : genericError();

  function verify(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.verifyRecoverCode, {
        data: { email: pending?.email, code: values.code },
      })
      .then((res) => {
        if (res.data.user) {
          toastApi.open({
            type: "success",
            content: t("The code is correct, now choose your new password"),
          });
          formPassword.setFieldsValue({
            email: pending?.email,
            code: values.code,
          });
          // Limpa o passo do código enquanto ainda está no ecrã: se o código expirar no passo da nova password, volta-se a ele vazio
          // (o antd repunha o código anterior ao voltar a montar o formulário)
          formCode.resetFields();
          setCode("");
          // Sucesso: animação no próprio formulário e depois o passo da nova password
          setStep("verified");
          setTimeout(() => setStep("password"), 2600);
        } else if (res.data.expired) {
          // Código fora da validade: aviso e o reenvio fica logo disponível (como na verificação do login)
          toastApi.open({ type: "warning", content: t(res.data.message) });
          setResendIn(0);
        } else if (res.data.message) {
          setFieldError(formCode, "code", t(res.data.message));
          toastApi.open({ type: "error", content: t(res.data.message) });
        } else genericError();
        setIsButtonLoading(false);
      })
      .catch((err) => {
        codeLock.lock(err?.response?.data?.retry_after);
        requestError(err);
        setIsButtonLoading(false);
      });
  }

  function sendCode(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.recover, { data: values })
      .then((res) => {
        if (res.data.status) {
          toastApi.open({
            type: "success",
            content: t(
              "An e-mail was sent with the code to recover your password",
            ),
          });
          // Transição suave (a enviar o código) para o passo do código
          savePending({ email: values.email, sentAt: Date.now() });
          setResendIn(RESEND_SECONDS);
          // Último pedido permitido: o próximo só depois do tempo indicado pela API
          sendLock.lock(res.data.retry_after, values.email);
          setStep("sending");
          setTimeout(() => setStep("code"), 900);
        } else if (
          res.data.message === "This e-mail does not exists in our database!"
        ) {
          // E-mail sem conta: mensagem traduzida no próprio campo
          setFieldError(
            form,
            "email",
            t("There is no account with this e-mail"),
          );
        } else if (res.data.message) {
          toastApi.open({ type: "error", content: t(res.data.message) });
        } else genericError();
        setIsButtonLoading(false);
      })
      .catch((err) => {
        sendLock.lock(err?.response?.data?.retry_after, values.email);
        requestError(err);
        setIsButtonLoading(false);
      });
  }

  function recover(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.password, { data: values })
      .then((res) => {
        if (res.data.status) {
          toastApi.open({
            type: "success",
            content: t(
              "The password was changed, now you can login with the new one",
            ),
          });
          savePending(null);
          // A API limpou os limites de login e de código deste e-mail: o login não pode ficar com uma contagem antiga
          clearRetryLocks(values.email, ["login", "code"]);
          // Sucesso: animação e depois o login
          setStep("changed");
          setTimeout(() => navigate(`/${i18n.language}/login`), 2800);
        } else if (res.data.expired) {
          // O código expirou enquanto escolhia a password: volta ao passo do código, com o reenvio disponível
          toastApi.open({ type: "warning", content: t(res.data.message) });
          formCode.resetFields();
          setCode("");
          setResendIn(0);
          setStep("code");
        } else if (res.data.message) {
          toastApi.open({ type: "error", content: t(res.data.message) });
        } else genericError();
        setIsButtonLoading(false);
      })
      .catch((err) => {
        codeLock.lock(err?.response?.data?.retry_after);
        requestError(err);
        setIsButtonLoading(false);
      });
  }

  // Novo código para o mesmo e-mail (substitui o anterior, com nova validade)
  function resend() {
    setIsResending(true);
    axios
      .post(endpoints.auth.recover, { data: { email: pending?.email, resend: true } })
      .then((res) => {
        if (res.data.status) {
          formCode.resetFields();
          setCode("");
          savePending({ ...pending, sentAt: Date.now() });
          setResendIn(RESEND_SECONDS);
          resendLock.lock(res.data.retry_after);
          toastApi.open({
            type: "success",
            content: t(
              "An e-mail was sent with the code to recover your password",
            ),
          });
        } else if (res.data.message) {
          toastApi.open({ type: "error", content: t(res.data.message) });
        } else genericError();
      })
      .catch((err) => {
        resendLock.lock(err?.response?.data?.retry_after);
        requestError(err);
      })
      .finally(() => setIsResending(false));
  }

  // Outro e-mail: volta ao primeiro passo
  function restart() {
    savePending(null);
    formCode.resetFields();
    setCode("");
    setStep("email");
  }

  const labelClass = "pb-2 text-center text-[13px] sm:text-sm";

  const backToLogin = (
    <p className="text-center mt-6 text-[13px] sm:text-sm">
      <Link
        to={`/${i18n.language}/login`}
        onClick={() => savePending(null)}
        className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
        « {t("Login")}
      </Link>
    </p>
  );

  return (
    <AuthLayout>
      {step === "sending" ? (
        <AuthStepLoading
          title={t("Sending the code")}
          subtitle={t("Check your e-mail inbox")}
        />
      ) : step === "verified" ? (
        <AuthStepSuccess
          title={t("Code verified")}
          subtitle={t("Now choose your new password")}
        />
      ) : step === "changed" ? (
        <AuthStepSuccess
          title={t("Password changed")}
          subtitle={t("Taking you to the login...")}
        />
      ) : step === "email" ? (
        // key por passo: os passos têm a mesma estrutura (div + Form) e, sem key, o React reaproveitava o formulário de um passo no
        // seguinte (ex.: o campo escondido "code" do passo da password aparecia no passo do código ao voltar a ele)
        <div key="email" className="auth-step">
          <AuthStepHeader icon={<LuKeyRound />} title={t("Password Recovery")}>
            {t(
              "Enter your email and you will receive instructions to recover your password.",
            )}
          </AuthStepHeader>
          <Form
            form={form}
            layout="vertical"
            onFinish={sendCode}
            onValuesChange={(changed) =>
              "email" in changed && setEmail(changed.email)
            }
            className="auth-form">
            <p className={labelClass}>{t("E-mail")}</p>
            {/* Formato do e-mail; se não houver conta, o erro do servidor aparece no campo ao submeter */}
            <Form.Item
              name="email"
              {...emailFieldProps}
              rules={[requiredRule, emailRule]}>
              <Input size="large" placeholder={t("youremail@domain.com")} />
            </Form.Item>
            <RetryTooltip lock={sendLock}>
              <Button
                htmlType="submit"
                type="primary"
                size="large"
                className="w-full main-cta-button"
                disabled={sendLock.isLocked}
                loading={isButtonLoading}>
                {t("Send code")}
              </Button>
            </RetryTooltip>
            <RetryNotice lock={sendLock} text="Code request limit reached. You can request a new code in" />
            {backToLogin}
          </Form>
        </div>
      ) : step === "code" ? (
        <div key="code" className="auth-step">
          <AuthStepHeader icon={<LuMailCheck />} title={t("Password Recovery")}>
            {/* Como na verificação do login: o e-mail aparece parcialmente escondido */}
            {t("We sent a {{count}}-character recovery code to", {
              count: CODE_LENGTH,
            })}{" "}
            <b className="text-[#163986] break-all">
              {maskEmail(pending?.email)}
            </b>
          </AuthStepHeader>
          <Form
            form={formCode}
            layout="vertical"
            onFinish={verify}
            onValuesChange={(changed) =>
              "code" in changed && setCode(changed.code || "")
            }
            preserve={false}
            className="auth-form auth-otp-form"
            requiredMark={false}>
            <p className="pb-3 text-center text-[13px] sm:text-sm">
              <span className="text-[#ff4d4f] mr-1">*</span>
              {t("Code")}
            </p>
            <Form.Item
              name="code"
              rules={[otpCodeRule(CODE_LENGTH, CODE_FORMAT)]}
              validateTrigger="onSubmit"
              className="mb-3!">
              <Input.OTP
                size="large"
                length={CODE_LENGTH}
                autoFocus
                formatter={(value) => value.replace(/[^A-Za-z0-9]/g, "")}
                aria-label={t("Code")}
              />
            </Form.Item>
            <p
              className={`text-center text-[12px] text-[#8B9CC3] mb-6 min-h-4.5 transition-opacity ${isCodeComplete ? "opacity-0" : "opacity-100"}`}>
              {t("This field is required")}:{" "}
              {t("enter the {{count}}-character code", { count: CODE_LENGTH })}
            </p>
            <RetryTooltip lock={codeLock}>
              <Button
                htmlType="submit"
                type="primary"
                size="large"
                className="w-full main-cta-button"
                disabled={!isCodeComplete || codeLock.isLocked}
                loading={isButtonLoading}>
                {t("Verify")}
              </Button>
            </RetryTooltip>
            <RetryNotice lock={codeLock} text="Too many wrong codes. You can verify again in" />
            <p className="text-center mt-6 text-[12.5px] sm:text-[13px] text-[#707070]">
              {t("Didn't receive the code?")}{" "}
              {resendLock.isLocked ? (
                <span className="text-[#8B9CC3] tabular-nums">
                  {t("New code available in {{time}}", { time: resendLock.time })}
                </span>
              ) : resendIn > 0 ? (
                <span className="text-[#8B9CC3]">
                  {t("Resend in {{seconds}}s", { seconds: resendIn })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={resend}
                  disabled={isResending}
                  className={authLinkClass}>
                  <LuRotateCw className={isResending ? "animate-spin" : ""} />
                  {t("Resend code")}
                </button>
              )}
            </p>
            <p className="text-center mt-3 text-[12.5px] sm:text-[13px]">
              <button
                type="button"
                onClick={restart}
                className="text-[#163986] font-semibold underline hover:text-[#FFC600] transition-colors cursor-pointer">
                {t("Use another e-mail")}
              </button>
            </p>
            {backToLogin}
          </Form>
        </div>
      ) : (
        <div key="password" className="auth-step">
          <AuthStepHeader
            icon={<LuLockKeyhole />}
            title={t("Password Recovery")}>
            {t("Choose your new password.")}
          </AuthStepHeader>
          <Form
            form={formPassword}
            layout="vertical"
            onFinish={recover}
            className="auth-form">
            <Form.Item name="email" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="code" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label={t("Password")}
              name="password"
              rules={[requiredRule, passwordRule]}
              className="mb-4!">
              <Input.Password
                size="large"
                placeholder={t("Enter your new password")}
              />
            </Form.Item>
            <Form.Item
              label={t("Confirm password")}
              name="confirm_password"
              dependencies={["password"]}
              rules={[
                requiredRule,
                matchFieldRule("password", t("The passwords does not match!")),
              ]}
              className="mb-6!">
              <Input.Password
                size="large"
                placeholder={t("Repeat your new password")}
              />
            </Form.Item>
            <RetryTooltip lock={codeLock}>
              <Button
                htmlType="submit"
                type="primary"
                size="large"
                className="w-full main-cta-button"
                disabled={codeLock.isLocked}
                loading={isButtonLoading}>
                {t("Recover password")}
              </Button>
            </RetryTooltip>
            <RetryNotice lock={codeLock} text="Too many wrong codes. You can verify again in" />
            {backToLogin}
          </Form>
        </div>
      )}
    </AuthLayout>
  );
}
