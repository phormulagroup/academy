import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Form, Input } from "antd";

import { Context } from "../../utils/context";

import axios from "axios";
import endpoints from "../../utils/endpoints";

import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import AuthLayout from "../../layout/auth";
import {
  emailFieldProps,
  emailRule,
  matchFieldRule,
  requiredRule,
  setFieldError,
} from "../../utils/formFieldError";

export default function Recover() {
  const { toastApi, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [userRecover] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  const [form] = Form.useForm();
  const [formCode] = Form.useForm();
  const [formPassword] = Form.useForm();
  const { t } = useTranslation();

  const navigate = useNavigate();

  const genericError = () =>
    toastApi.open({
      type: "error",
      content: t("Something went wrong, please try again"),
    });

  function verify(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.verifyRecoverCode, { data: values })
      .then((res) => {
        if (res.data.user) {
          toastApi.open({
            type: "success",
            content: t("The code is correct, now choose your new password"),
          });
          formPassword.setFieldValue("email", values.email);
          setCurrentStep(currentStep + 1);
        } else if (res.data.message) {
          toastApi.open({ type: "error", content: t(res.data.message) });
        } else genericError();
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        genericError();
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
          formCode.setFieldValue("email", values.email);
          setCurrentStep(currentStep + 1);
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
        console.log(err);
        genericError();
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
          formCode.setFieldValue("email", values.email);
          createLog({ id_user: userRecover.id, action: "recover password" });
          navigate(`/${i18n.language}/login`);
        } else if (res.data.message) {
          toastApi.open({ type: "error", content: t(res.data.message) });
        } else genericError();
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        genericError();
        setIsButtonLoading(false);
      });
  }

  const labelClass = "pb-2 text-center text-[13px] sm:text-sm";
  const introClass = "text-center text-[13px] sm:text-sm mb-4 sm:mb-6";

  const backToLogin = (
    <p className="text-center mt-4 text-[13px] sm:text-sm">
      <Link
        to={`/${i18n.language}/login`}
        className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
        « {t("Login")}
      </Link>
    </p>
  );

  return (
    <AuthLayout>
      {currentStep === 0 ? (
        <div>
          <p className={introClass}>
            <b className="font-ryker">{t("Password Recovery")}</b>
            <br />
            <span className="font-normal">
              {t(
                "Enter your email and you will receive instructions to recover your password.",
              )}
            </span>
          </p>
          <Form
            form={form}
            layout="vertical"
            onFinish={sendCode}
            className="auth-form">
            <p className={labelClass}>{t("E-mail")}</p>
            {/* Formato do e-mail; se não houver conta, o erro do servidor aparece no campo ao submeter */}
            <Form.Item
              name="email"
              {...emailFieldProps}
              rules={[requiredRule, emailRule]}>
              <Input size="large" placeholder={t("youremail@domain.com")} />
            </Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              className="w-full main-cta-button"
              loading={isButtonLoading}>
              {t("Send code")}
            </Button>
            {backToLogin}
          </Form>
        </div>
      ) : currentStep === 1 ? (
        <div>
          <p className={introClass}>
            <b className="font-ryker">{t("Password Recovery")}</b>
            <br />
            {t(
              "Enter the code you received in your email to recover your password.",
            )}
          </p>
          <Form
            form={formCode}
            layout="vertical"
            onFinish={verify}
            className="auth-form">
            <Form.Item name="email" hidden>
              <Input />
            </Form.Item>
            <p className={labelClass}>{t("Code")}</p>
            <Form.Item name="code" rules={[requiredRule]}>
              <Input.OTP size="large" />
            </Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              className="w-full main-cta-button"
              loading={isButtonLoading}>
              {t("Send code")}
            </Button>
            {backToLogin}
          </Form>
        </div>
      ) : (
        <div>
          <p className={introClass}>
            <b className="font-ryker">{t("Password Recovery")}</b>
            <br />
            {t("Choose your new password.")}
          </p>
          <Form
            form={formPassword}
            layout="vertical"
            onFinish={recover}
            className="auth-form">
            <Form.Item name="email" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label={t("Password")}
              name="password"
              rules={[requiredRule]}
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
              className="mb-4!">
              <Input.Password
                size="large"
                placeholder={t("Repeat your new password")}
              />
            </Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              className="w-full main-cta-button"
              loading={isButtonLoading}>
              {t("Recover password")}
            </Button>
            {backToLogin}
          </Form>
        </div>
      )}
    </AuthLayout>
  );
}
