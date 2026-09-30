import { useContext, useState } from "react";
import { Link } from "react-router";
import { Button, Checkbox, Form, Input } from "antd";

import { Context } from "../../utils/context";

import axios from "axios";
import endpoints from "../../utils/endpoints";

import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import AuthLayout from "../../layout/auth";
import {
  emailFieldProps,
  emailRule,
  requiredRule,
  setFieldError,
} from "../../utils/formFieldError";

export default function Login() {
  const { login, messageApi, languages, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  function submit(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.login, { data: values })
      .then((res) => {
        if (res.data.user) {
          if (res.data.user.status === "approved") {
            login({ user: res.data.user, token: res.data.token });
            createLog({
              id_user: res.data.user.id,
              action: "login",
              id_lang: languages.filter((l) => l.code === i18n.language)[0].id,
            });
            messageApi.open({
              type: "success",
              content: res.data.message,
            });
          } else if (res.data.user.status === "pending")
            messageApi.open({
              type: "warning",
              content: t(
                "This user is still pending on approval. You'll need to wait until we approved you registration.",
              ),
            });
          else if (res.data.user.status === "denied")
            messageApi.open({
              type: "error",
              content: t(
                "This user was denied from our administration. If you have some complaints contact us through email",
              ),
            });
        } else if (res.data.message === "This user does not exist on our database!") {
          // E-mail sem conta: mensagem traduzida no próprio campo
          setFieldError(form, "email", t("There is no account with this e-mail"));
        } else if (res.data.message === "The password is not correct, try again.") {
          setFieldError(form, "password", t("The password is not correct, try again."));
        } else {
          messageApi.open({
            type: "error",
            content: t(`${res.data.message}`),
          });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({
          type: "error",
          content: t("Something went wrong, try again later."),
        });
        setIsButtonLoading(false);
      });
  }

  const labelClass = "pb-2 text-center text-[13px] sm:text-sm";

  return (
    <AuthLayout>
      <div className="flex justify-center items-center mx-auto max-w-75">
        <p className="text-center text-[13px] sm:text-sm mb-4 sm:mb-6 font-semibold">
          {t("Welcome to the BIAL Regional Academy e-Learning platform")}
        </p>
      </div>
      <Form form={form} layout="vertical" onFinish={submit} className="auth-form">
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
          <Input.Password size="large" placeholder="●●●●●●●" />
        </Form.Item>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <Form.Item name="remember" valuePropName="checked" className="mb-0!">
            <Checkbox size="large">
              <p className="text-[#707070] text-[12px]">{t("Remember me")}</p>
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
        <Button
          htmlType="submit"
          type="primary"
          size="large"
          className="w-full main-cta-button"
          loading={isButtonLoading}>
          {t("Login")}
        </Button>
        <p className="text-center mt-4 text-[13px] sm:text-sm">
          <Link
            to={`/${i18n.language}/register`}
            className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
            « {t("Register")}
          </Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
