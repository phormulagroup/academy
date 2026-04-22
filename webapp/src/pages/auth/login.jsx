import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Footer } from "antd/es/layout/layout";
import { Button, Checkbox, Divider, Dropdown, Form, Input, message } from "antd";
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
  const { setIsLoadingLanguage, login, messageApi, languages, createLog } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  const navigate = useNavigate();

  function submit(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.login, { data: values })
      .then((res) => {
        console.log(res);
        if (res.data.user) {
          if (res.data.user.status === "approved") {
            login({ user: res.data.user, token: res.data.token });
            createLog({ id_user: res.data.user.id, action: "login", id_lang: languages.filter((l) => l.code === i18n.language)[0].id });
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
            content: t(`${res.data.message}`),
          });
        }
        setIsButtonLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsButtonLoading(false);
      });
  }

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    navigate(`/${lang}/${window.location.pathname.split("/").slice(2).join("/")}`);
    setIsLoadingLanguage(true);
    setTimeout(() => {
      setIsLoadingLanguage(false);
    }, 1500);
  };

  return (
    <div className={`flex flex-col justify-between w-full min-h-full bg-[#F7F7F7] bg-contain bg-right bg-no-repeat`} style={{ backgroundImage: `url(${bgLogin})` }}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full p-4">
        <div className="max-w-112.5 bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)] sm:mt-15 relative">
          <div className="absolute right-[-30px] top-[-18px]">
            <Dropdown
              menu={{
                items: languages.map((item) => ({
                  key: item.code,
                  label: (
                    <div className={`flex items-center ${i18n.language === item.code ? "text-[#00B9D6]" : ""}`} onClick={() => changeLanguage(item.code)}>
                      <img src={item.flag} className="max-w-5 mr-2" alt={item.name} />
                      <p>{item.name}</p>
                    </div>
                  ),
                })),
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <div className="flex justify-center items-center cursor-pointer border leading-1 p-2 rounded-full bg-white">
                <div
                  className={`w-5 h-5 rounded-full bg-cover bg-center mr-2`}
                  style={{ backgroundImage: `url(${languages.filter((l) => l.code === i18n.language)[0].flag})` }}
                ></div>
                <p>{i18n.language.toUpperCase()}</p>
              </div>
            </Dropdown>
          </div>
          <div className="flex flex-col p-6">
            <Link to={`/${i18n.language}`}>
              <img src={logo} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-6" />
            </Link>
            <p className="text-center text-sm mb-6">
              Bem vind@ à <b>BIAL Regional Academy</b>,
              <br /> a plataforma de e-learning!
            </p>
            <Form form={form} layout="vertical" onFinish={submit} className="auth-form">
              <p className="pb-2 text-center text-sm">E-mail</p>
              <Form.Item name="email" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                <Input size="large" placeholder="nome.apelido@phormulagroup.com" />
              </Form.Item>
              <p className="pb-2 text-center text-sm">Password</p>
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
                  <Link to={`/${i18n.language}/recover`} className="text-[#000]! hover:text-[#FFC600]! underline!">
                    <p className="text-[12px]">
                      <u>Esqueceu-se da password?</u>
                    </p>
                  </Link>
                </div>
              </div>
              <Button htmlType="submit" type="primary" size="large" className="w-full" loading={isButtonLoading}>
                {t("Login")}
              </Button>
              <p className="text-center mt-4">
                <Link to={`/${i18n.language}/register`} className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
                  « {t("Register")}
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
