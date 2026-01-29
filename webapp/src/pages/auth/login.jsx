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

  const [form] = Form.useForm();

  function submit(values, type) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.login, { data: values })
      .then((res) => {
        console.log(res);
        if (res.data.user) {
          login({ user: res.data.user, token: res.data.token });
          //createLog({ id_user: res.data.user.id, action: "login" });
          messageApi.open({
            type: "success",
            content: res.data.message,
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
    <div className={`flex flex-col justify-between w-full h-full bg-cover bg-center bg-[#F1F9FF]`}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full">
        <div className="max-w-112.5 bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)]">
          <div className="bg-[#B1BDD7] p-6 flex justify-center items-center rounded-t-[5px]">
            <img src={logoPhormula} alt="Phormula Logo" className="max-w-75 h-auto mx-auto" />
          </div>
          <div className="flex flex-col p-6">
            <p className="text-center text-[#707070] text-[14px] mb-6">
              Bem vind@ à <b>BIAL Regional Academy</b>,
              <br /> a plataforma de e-learning!
            </p>
            <Form form={form} layout="vertical" onFinish={submit}>
              <p className="pb-2 text-center text-[#163986] text-[14px]">E-mail</p>
              <Form.Item name="email" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                <Input size="large" placeholder="nome.apelido@phormulagroup.com" />
              </Form.Item>
              <p className="pb-2 text-center text-[#163986] text-[14px]">Password</p>
              <Form.Item name="password" rules={[{ required: true, message: "Este campo é obrigatório" }]} className="mb-2!">
                <Input.Password size="large" placeholder="●●●●●●●" />
              </Form.Item>
              <div className="flex justify-between mb-4">
                <Form.Item name="remember" valuePropName="checked" className="mb-0!">
                  <Checkbox size="large">
                    <p className="text-[#B1BDD7] text-[12px]">Lembrar-me</p>
                  </Checkbox>
                </Form.Item>
                <div className="flex justify-end items-center">
                  <p className="text-[#B1BDD7] text-[12px]">
                    <u>Esqueceu-se da password?</u>
                  </p>
                </div>
              </div>
              <Button htmlType="submit" type="primary" size="large" className="w-full" loading={isButtonLoading}>
                Login
              </Button>
            </Form>

            <p className="text-center text-xs mt-6 text-[#707070]">
              Caso esteja com problemas de acesso por favor entre em contacto com o nosso <u>suporte help@bial-academy.pt</u>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
