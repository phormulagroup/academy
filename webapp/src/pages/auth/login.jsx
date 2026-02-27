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

export default function Login() {
  const { isLoggedIn, login, messageApi, microsoftLogin, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();
  const { t } = useTranslation();

  function submit(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.login, { data: values })
      .then((res) => {
        console.log(res);
        if (res.data.user) {
          if (res.data.user.status === "approved") {
            login({ user: res.data.user, token: res.data.token });
            //createLog({ id_user: res.data.user.id, action: "login" });
            messageApi.open({
              type: "success",
              content: res.data.message,
            });
          } else if (res.data.user.status === "pending")
            messageApi.open({
              type: "warning",
              content: t("This user is still pending on approval. You'll need to wait until we approved you registration."),
            });
          else if (res.data.user.status === "denied")
            messageApi.open({
              type: "error",
              content: t("This user was denied from our administration. If you have some complaints contact us through email"),
            });
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

  return (
    <div className={`flex flex-col justify-between w-full h-full bg-[#F7F7F7] bg-contain bg-right bg-no-repeat`} style={{ backgroundImage: `url(${bgLogin})` }}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full">
        <div className="max-w-112.5 bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col p-6">
            <img src={logo} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-6" />
            <p className="text-center text-[14px] mb-6">
              Bem vind@ à <b>BIAL Regional Academy</b>,
              <br /> a plataforma de e-learning!
            </p>
            <Form form={form} layout="vertical" onFinish={submit} className="auth-form">
              <p className="pb-2 text-center text-[14px]">E-mail</p>
              <Form.Item name="email" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                <Input size="large" placeholder="nome.apelido@phormulagroup.com" />
              </Form.Item>
              <p className="pb-2 text-center text-[14px]">Password</p>
              <Form.Item name="password" rules={[{ required: true, message: "Este campo é obrigatório" }]} className="mb-2!">
                <Input.Password size="large" placeholder="●●●●●●●" />
              </Form.Item>
              <div className="flex justify-between mb-4">
                <Form.Item name="remember" valuePropName="checked" className="mb-0!">
                  <Checkbox size="large">
                    <p className="text-[#707070] text-[12px]">Lembrar-me</p>
                  </Checkbox>
                </Form.Item>
                <div className="flex justify-end items-center">
                  <p className="text-[12px]">
                    <u>Esqueceu-se da password?</u>
                  </p>
                </div>
              </div>
              <Button htmlType="submit" type="primary" size="large" className="w-full" loading={isButtonLoading}>
                {t("Login")}
              </Button>
              <p className="text-center mt-4">
                <Link to={`/${i18n.language}/register`} className="text-[#FF7D5A]! hover:text-[#FFC600]! font-bold underline!">
                  « Registar
                </Link>
              </p>
            </Form>

            <p className="text-center text-xs mt-6 text-[#707070]">
              Caso esteja com problemas de acesso por favor entre em contacto com o nosso suporte <u className="text-black">help@bial-academy.pt</u>
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 flex justify-center items-center">
          <img src={logoBialFooter} className="max-w-45" />
        </div>
        <div className="flex flex-col justify-center items-center p-4">
          <div className="flex gap-4">
            <p className="text-[14px] text-center">Formulário de contacto</p>
            <span className="text-[14px] text-center">|</span>
            <p className="text-[14px] text-center">Termos e condições</p>
            <span className="text-[14px] text-center">|</span>
            <p className="text-[14px] text-center">Política de Privacidade</p>
          </div>
          <p className="text-[14px] mt-4">{dayjs().format("YYYY")} Bial Portugal. All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
