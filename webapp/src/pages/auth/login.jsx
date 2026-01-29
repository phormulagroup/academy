import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Footer } from "antd/es/layout/layout";
import { Button, Checkbox, Divider, Form, Input, message } from "antd";
import { FaChevronRight } from "react-icons/fa";
import { TfiMicrosoftAlt } from "react-icons/tfi";
import logoPhormula from "../../assets/logo-phormula.svg";

import { Context } from "../../utils/context";

import dayjs from "dayjs";
import axios from "axios";
import endpoints from "../../utils/endpoints";

export default function Login() {
  const { isLoggedIn, login, messageApi, microsoftLogin, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  const [loginUser, setLoginUser] = useState(null);
  const [loginToken, setLoginToken] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [formCode] = Form.useForm();
  const [formPassword] = Form.useForm();

  function submit(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.login, { data: { ...values, login_by: type ?? "password" } })
      .then((res) => {
        if (res.data.user) {
          formCode.setFieldValue("email", values.email);
          setCurrentStep(2);
        } else {
          messageApi.open({
            type: "error",
            content: res.data.message,
          });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsButtonLoading(false);
      });
  }

  async function submitMicrosoft() {
    try {
      const auxUser = await microsoftLogin();
      if (auxUser) {
        formCode.setFieldValue("email", auxUser.email);
        setCurrentStep(2);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function validateEmail() {
    setIsValidatingEmail(true);
    try {
      await form.validateFields(["email"]);
      const email = form.getFieldValue("email");
      axios
        .get(endpoints.auth.validateEmail, {
          params: { email },
        })
        .then((res) => {
          if (res.data.user) {
            formPassword.setFieldValue("email", res.data.user.email);
            setCurrentStep(1);
          } else {
            messageApi.open({
              type: "error",
              content: res.data.message,
            });
          }
          setIsValidatingEmail(false);
        })
        .catch((err) => {
          console.log(err);
          messageApi.open({
            type: "error",
            content: err.data.message,
          });
          setIsValidatingEmail(false);
        });
    } catch (err) {
      setIsValidatingEmail(false);
    }
  }

  async function compareCode(values) {
    try {
      setIsButtonLoading(true);
      await formCode.validateFields(["code"]);
      const res = await axios.post(endpoints.auth.loginCode, {
        data: values,
      });

      if (res.data.user) {
        login({ user: res.data.user, token: res.data.token });
        createLog({ id_user: res.data.user.id, action: "login" });
        setIsButtonLoading(false);
      } else {
        messageApi.open({
          type: "error",
          content: "O código não está correto. Certifique-se que está a colocar o código que lhe foi enviado para o e-mail",
        });
        setIsButtonLoading(false);
      }
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <div className={`flex flex-col justify-between w-full h-full bg-cover bg-center`}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full">
        <div className="max-w-112.5 bg-white rounded-[5px]">
          <div className="flex flex-col p-4">
            <img src={logoPhormula} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-4" />
            <div className="flex flex-col mt-6">
              {currentStep === 0 && (
                <Form form={form} layout="vertical" onFinish={validateEmail}>
                  <p className="pb-2">E-mail</p>
                  <Form.Item name="email" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                    <Input
                      size="large"
                      placeholder="nome.apelido@phormulagroup.com"
                      suffix={<Button loading={isValidatingEmail} onClick={form.submit} icon={<FaChevronRight />}></Button>}
                    />
                  </Form.Item>
                  <div className="flex flex-col justify-center items-center">
                    <div className="w-full">
                      <Divider className="w-full">
                        <div className="flex justify-center items-center p-2 rounded-full w-5 h-5 bg-[#c1c1c1]"></div>
                      </Divider>
                    </div>
                    <p>Ou faz login em apenas um clique</p>
                    <Button className="mt-4 mb-4 min-h-15" onClick={submitMicrosoft}>
                      <div className="p-2! flex flex-col justify-center items-center">
                        <TfiMicrosoftAlt />
                      </div>
                    </Button>
                  </div>
                </Form>
              )}
              {currentStep === 1 && (
                <Form form={formPassword} layout="vertical" onFinish={submit}>
                  <p className="pb-2">E-mail ou nº de telemóvel</p>
                  <Form.Item name="email" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                    <Input size="large" placeholder="nome.apelido@phormulagroup.com" readOnly />
                  </Form.Item>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center pb-2">
                      <p>Password</p>
                      <a className="text-xs text-[#2b5067]!">
                        <u>Forgot your password?</u>
                      </a>
                    </div>
                    <Form.Item name="password" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                      <Input.Password size="large" placeholder="●●●●●●●" />
                    </Form.Item>
                    <Form.Item name="remember" valuePropName="checked">
                      <Checkbox size="large" className="text-sm">
                        Lembrar-me
                      </Checkbox>
                    </Form.Item>
                    <Form.Item noStyle>
                      <Button size="large" type="primary" className="w-full" htmlType="submit" onClick={form.submit} loading={isButtonLoading}>
                        Login
                      </Button>
                    </Form.Item>
                  </div>
                </Form>
              )}
              {currentStep === 2 && (
                <Form form={formCode} layout="vertical" onFinish={compareCode}>
                  <div className="flex flex-col justify-center items-center">
                    <p className="mb-4">Insira aqui o código que foi enviado para o seu e-mail</p>
                    <Form.Item name="email" hidden>
                      <Input size="large" />
                    </Form.Item>
                    <Form.Item name="code" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                      <Input.OTP size="large" />
                    </Form.Item>
                    <Button size="large" type="primary" className="w-full" htmlType="submit" onClick={form.submit} loading={isButtonLoading}>
                      Submeter
                    </Button>
                  </div>
                </Form>
              )}

              <p className="text-center text-xs mt-6">
                Se tiver problemas em aceder, por favor, contacte o <u>suporte@phormulagroup.com</u>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
