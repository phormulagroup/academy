import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Footer } from "antd/es/layout/layout";
import { Button, Checkbox, Divider, Form, Input, message } from "antd";
import { FaChevronRight } from "react-icons/fa";
import { TfiMicrosoftAlt } from "react-icons/tfi";
import logoPhormula from "../../assets/logo-phormula.svg";

import { Context } from "../../utils/context";

import dayjs from "dayjs";
import axios from "axios";
import endpoints from "../../utils/endpoints";

import logo from "../../assets/BIAL-Regional-Academy.svg";
import logoBialFooter from "../../assets/BIAL-logo-footer.svg";
import bgLogin from "../../assets/Background-login.png";

import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";

export default function Recover() {
  const { isLoggedIn, login, messageApi, microsoftLogin, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [userRecover, setUserRecover] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  const [form] = Form.useForm();
  const [formCode] = Form.useForm();
  const [formPassword] = Form.useForm();
  const { t } = useTranslation();

  const navigate = useNavigate();

  function verify(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.verifyRecoverCode, { data: values })
      .then((res) => {
        console.log(res);
        if (res.data.user) {
          messageApi.open({ type: "success", content: "The code is correct, now choose your new password" });
          formPassword.setFieldValue("email", values.email);
          setCurrentStep(currentStep + 1);
        } else {
          messageApi.open({ type: "error", content: res.data.message ?? "Something went wrong, please try again" });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsButtonLoading(false);
      });
  }

  function sendCode(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.recover, { data: values })
      .then((res) => {
        if (res.data.status) {
          messageApi.open({ type: "success", content: "An e-mail was sent with the code to recover you password" });
          formCode.setFieldValue("email", values.email);
          setCurrentStep(currentStep + 1);
        } else {
          messageApi.open({ type: "error", content: res.data.message ?? "Something went wrong, please try again" });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({ type: "error", content: "Something went wrong, please try again" });
        setIsButtonLoading(false);
      });
  }

  function recover(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.password, { data: values })
      .then((res) => {
        if (res.data.status) {
          messageApi.open({ type: "success", content: "The password was changed, now you can login with the new one" });
          formCode.setFieldValue("email", values.email);
          createLog({ id_user: userRecover.id, action: "recover password" });
          navigate(`/${i18n.language}/login`);
        } else {
          messageApi.open({ type: "error", content: res.data.message ?? "Something went wrong, please try again" });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({ type: "error", content: "Something went wrong, please try again" });
        setIsButtonLoading(false);
      });
  }

  return (
    <div className={`flex flex-col justify-between w-full min-h-full bg-[#F7F7F7] bg-contain bg-right bg-no-repeat`} style={{ backgroundImage: `url(${bgLogin})` }}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full p-4">
        <div className="max-w-112.5 bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)] sm:mt-15">
          <div className="flex flex-col p-6">
            <Link to={`/${i18n.language}`}>
              <img src={logo} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-6" />
            </Link>
            {currentStep === 0 ? (
              <div>
                <p className="text-center text-sm mb-6">
                  <b>Recuperação de Password</b>
                  <br />
                  Insira o seu email e receberá instruções para recuperar a sua password.
                </p>
                <Form form={form} layout="vertical" onFinish={sendCode} className="auth-form">
                  <p className="pb-2 text-center text-sm">E-mail</p>
                  <Form.Item name="email" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                    <Input size="large" placeholder="nome.apelido@phormulagroup.com" />
                  </Form.Item>
                  <Button htmlType="submit" type="primary" size="large" className="w-full" loading={isButtonLoading}>
                    {t("Send code")}
                  </Button>
                  <p className="text-center mt-4">
                    <Link to={`/${i18n.language}/login`} className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
                      « Login
                    </Link>
                  </p>
                </Form>
              </div>
            ) : currentStep === 1 ? (
              <div>
                <p className="text-center text-sm mb-6">
                  <b>Recuperação de Password</b>
                  <br />
                  Insira o código que recebeu no seu e-mail para recuperar a sua password.
                </p>
                <Form form={formCode} layout="vertical" onFinish={verify} className="auth-form">
                  <Form.Item name="email" hidden>
                    <Input />
                  </Form.Item>
                  <p className="pb-2 text-center text-sm">Code</p>
                  <Form.Item name="code" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                    <Input.OTP size="large" />
                  </Form.Item>
                  <Button htmlType="submit" type="primary" size="large" className="w-full" loading={isButtonLoading}>
                    {t("Send code")}
                  </Button>
                  <p className="text-center mt-4">
                    <Link to={`/${i18n.language}/login`} className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
                      « Login
                    </Link>
                  </p>
                </Form>
              </div>
            ) : (
              <div>
                <p className="text-center text-sm mb-6">
                  <b>Recuperação de Password</b>
                  <br />
                  Insira o código que recebeu no seu e-mail para recuperar a sua password.
                </p>
                <Form form={formPassword} layout="vertical" onFinish={recover} className="auth-form">
                  <Form.Item name="email" hidden>
                    <Input />
                  </Form.Item>
                  <p className="pb-2 text-center text-sm">Code</p>
                  <Form.Item label={t("Password")} name="password" rules={[{ required: true }]} className="mb-4!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                  <Form.Item
                    label={t("Confirm password")}
                    name="confirm_password"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: true,
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error(t("The passwords does not match!")));
                        },
                      }),
                    ]}
                    className="mb-4!"
                  >
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                  <Button htmlType="submit" type="primary" size="large" className="w-full" loading={isButtonLoading}>
                    {t("Recover password")}
                  </Button>
                  <p className="text-center mt-4">
                    <Link to={`/${i18n.language}/login`} className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
                      « Login
                    </Link>
                  </p>
                </Form>
              </div>
            )}

            <p className="text-center text-xs mt-6 text-[#707070]">
              Caso esteja com problemas de acesso por favor entre em contacto com o nosso suporte <u className="text-black">help@bial-academy.pt</u>
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 md:col-span-1 p-4 flex justify-center items-center">
          <img src={logoBialFooter} className="max-w-45" />
        </div>
        <div className="col-span-3 md:col-span-1 flex flex-col justify-center items-center p-4">
          <div className="flex">
            <div className="pr-3">
              <p className="text-sm text-center text-[#163986]">Formulário de contacto</p>
            </div>
            <div className="border-r border-l border-[#163986] pl-3 pr-3">
              <p className="text-sm text-center text-[#163986]">Termos e condições</p>
            </div>
            <div className="pl-3">
              <p className="text-sm text-center text-[#163986]">Política de Privacidade</p>
            </div>
          </div>
          <p className="text-sm mt-4 text-[#163986]">{dayjs().format("YYYY")} Bial Portugal. All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
