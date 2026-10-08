import { useContext, useState } from "react";
import { Link } from "react-router";
import { Button, Checkbox, Form, Input } from "antd";

import { Context } from "../../utils/context";

import axios from "axios";
import endpoints from "../../utils/endpoints";

import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import AuthLayout from "../../layout/auth";
import LoginCode from "../../components/auth/loginCode";
import { AuthStepLoading } from "../../components/auth/authStep";
import { RetryNotice, RetryTooltip } from "../../components/auth/retryLock";
import useRetryLock, { lockFromResponse, longestLock } from "../../utils/useRetryLock";
import {
  emailFieldProps,
  emailRule,
  requiredRule,
  setFieldError,
} from "../../utils/formFieldError";

// Validade do código de verificação em dois passos (2FA) pendente na memória da página
const PENDING_2FA_MINUTES = 10;
let pendingMemory = null;

const writePending2fa = (value) => {
  pendingMemory = value;
};

function readPending2fa() {
  if (
    pendingMemory &&
    Date.now() - pendingMemory.sentAt < PENDING_2FA_MINUTES * 60 * 1000
  )
    return pendingMemory;
  pendingMemory = null;
  return null;
}

export default function Login() {
  const { login, toastApi, languages, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [pending2fa, setPending2fa] = useState(readPending2fa);
  const [step, setStep] = useState(() => (pending2fa ? "code" : "credentials"));

  function savePending2fa(value) {
    setPending2fa(value);
    writePending2fa(value);
  }

  const [form] = Form.useForm();

  // Demasiadas passwords erradas para este e-mail: contagem e botão desativado até a API voltar a aceitar
  // Em estado e não em Form.useWatch: o formulário sai do ecrã no passo do código e, ao voltar ("Usar outra conta"), o useWatch
  // deixava de acompanhar o campo
  const [email, setEmail] = useState("");
  // Dois limites sobre o botão: passwords erradas e códigos do 2FA pedidos (cada login com sucesso envia um, como o Reenviar).
  // Cada um com a sua mensagem, para a pessoa perceber porque está à espera
  const passwordLock = useRetryLock("login", email);
  const sendLock = useRetryLock("otp_send", email);
  const loginLock = longestLock(passwordLock, sendLock);
  const loginLockText =
    loginLock.scope === "otp_send"
      ? "Code request limit reached. You can log in again in"
      : "Too many wrong passwords. You can try again in";

  const { t } = useTranslation();

  function startSession({ user, token }) {
    savePending2fa(null);
    login({ user, token });
    createLog({
      id_user: user.id,
      action: "login",
      id_lang: languages.filter((l) => l.code === i18n.language)[0]?.id,
    });
    toastApi.open({
      type: "success",
      content: `${t("Welcome")} ${user.name}!`,
    });
  }

  function restartLogin() {
    savePending2fa(null);
    setStep("credentials");
  }

  function submit(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.login, { data: values })
      .then((res) => {
        if (res.data.otp_required) {
          savePending2fa({ email: res.data.email, sentAt: Date.now() });
          // Último pedido de código permitido: o Reenviar do passo do código já aparece bloqueado
          sendLock.lock(res.data.retry_after, res.data.email);
          toastApi.open({
            type: "success",
            content: t("A verification code was sent to your e-mail"),
          });
          setStep("sending");
          setTimeout(() => setStep("code"), 900);
        } else if (res.data.status) {
          // Contas pendentes ou não aprovadas: não entram (sem sessão nem código), só a mensagem do estado
          if (res.data.status === "pending")
            toastApi.open({
              type: "warning",
              content: t(
                "This user is still pending on approval. You'll need to wait until we approved you registration.",
              ),
            });
          else if (res.data.status === "denied" || res.data.status === "not_approved")
            toastApi.open({
              type: "error",
              content: t(
                "This user was denied from our administration. If you have some complaints contact us through email",
              ),
            });
        } else if (
          res.data.message === "This user does not exist on our database!"
        ) {
          // E-mail sem conta: mensagem traduzida no próprio campo
          setFieldError(
            form,
            "email",
            t("There is no account with this e-mail"),
          );
        } else if (
          res.data.message === "The password is not correct, try again."
        ) {
          setFieldError(
            form,
            "password",
            t("The password is not correct, try again."),
          );
        } else {
          toastApi.open({
            type: "error",
            content: t(`${res.data.message}`),
          });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        // Bloqueio: o limite indicado pela API (passwords erradas ou códigos pedidos), com o tempo que falta
        if (err?.response?.data?.retry_after) lockFromResponse(err.response.data, [passwordLock, sendLock], values.email);
        // Mensagem da API quando existe (ex.: 429 com o motivo do bloqueio) ou a genérica
        toastApi.open({
          type: "error",
          content: t(
            err?.response?.data?.message ||
              "Something went wrong, try again later.",
          ),
        });
        setIsButtonLoading(false);
      });
  }

  const labelClass = "pb-2 text-center text-[13px] sm:text-sm";

  return (
    <AuthLayout>
      {step === "sending" ? (
        <AuthStepLoading
          title={t("Sending the verification code")}
          subtitle={t("Check your e-mail inbox")}
        />
      ) : step === "code" ? (
        <LoginCode
          email={pending2fa?.email}
          sentAt={pending2fa?.sentAt}
          onVerified={startSession}
          onRestart={restartLogin}
          onResent={(sentAt) => savePending2fa({ ...pending2fa, sentAt })}
        />
      ) : (
        <div className="auth-step">
          <div className="flex justify-center items-center mx-auto max-w-75">
            <p className="font-ryker text-center text-[13px] sm:text-sm mb-4 sm:mb-6 font-semibold">
              {t("Welcome to the BIAL Regional Academy e-Learning platform")}
            </p>
          </div>
          <Form
            form={form}
            layout="vertical"
            onFinish={submit}
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
            <p className={labelClass}>{t("Password")}</p>
            <Form.Item name="password" rules={[requiredRule]} className="mb-2!">
              <Input.Password
                size="large"
                placeholder={t("Enter your password")}
              />
            </Form.Item>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <Form.Item
                name="remember"
                valuePropName="checked"
                className="mb-0!">
                <Checkbox size="large">
                  <p className="text-[#707070] text-[12px]">
                    {t("Remember me")}
                  </p>
                </Checkbox>
              </Form.Item>
              <Link
                to={`/${i18n.language}/recover`}
                className="text-[#163986]! hover:text-[#FFC600]! underline!">
                <p className="text-[12px]">
                  <u>{t("Forgot your password?")}</u>
                </p>
              </Link>
            </div>
            <RetryTooltip lock={loginLock}>
              <Button
                htmlType="submit"
                type="primary"
                size="large"
                className="w-full main-cta-button"
                disabled={loginLock.isLocked}
                loading={isButtonLoading}>
                {t("Login")}
              </Button>
            </RetryTooltip>
            <RetryNotice lock={loginLock} text={loginLockText} />
            <p className="text-center mt-4 text-[13px] sm:text-sm">
              <Link
                to={`/${i18n.language}/register`}
                className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
                « {t("Register")}
              </Link>
            </p>
          </Form>
        </div>
      )}
    </AuthLayout>
  );
}
