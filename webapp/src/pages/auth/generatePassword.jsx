import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Footer } from "antd/es/layout/layout";
import { Alert, Button, Checkbox, Divider, Form, Input, message } from "antd";
import { FaChevronRight } from "react-icons/fa";
import { TfiMicrosoftAlt } from "react-icons/tfi";
import logoPhormula from "../../assets/logo-phormula.svg";

import { Context } from "../../utils/context";

import dayjs from "dayjs";
import axios from "axios";
import endpoints from "../../utils/endpoints";

export default function GeneratePassword() {
  const { isLoggedIn, login, messageApi } = useContext(Context);

  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [userGeneratePassword, setUserGeneratePassword] = useState(null);

  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  const navigate = useNavigate();

  useEffect(() => {
    verifyToken();
  }, []);

  function verifyToken() {
    const token = searchParams.get("t");
    axios
      .post(endpoints.auth.verifyTokenGeneratePassword, {
        data: token,
      })
      .then((res) => {
        if (!res.data.token_valid) {
          setIsValid(false);
        } else {
          setUserGeneratePassword(res.data.user);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function submit(values) {
    setIsButtonLoading(true);
    axios
      .post(endpoints.auth.generatePassword, {
        data: { ...userGeneratePassword, password: values.password },
      })
      .then((res) => {
        if (res.data.updated) {
          messageApi.success("A sua password foi associada com sucesso!");
          navigate("/");
        } else {
          messageApi.error(res.data.message);
        }
      })
      .catch((err) => {
        setIsButtonLoading(false);
        console.log(err);
        messageApi.error("Alguma coisa de errado aconteceu, tente novamente mais tarde!");
      });
  }

  return (
    <div className={`flex flex-col justify-between w-full h-full bg-cover bg-center`}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full">
        <div className="max-w-112.5 bg-white rounded-[5px]">
          <div className="flex flex-col p-4">
            <img src={logoPhormula} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-4" />
            {isValid ? (
              <div className="flex flex-col mt-6">
                <Form form={form} layout="vertical" onFinish={submit}>
                  <div className="flex flex-col">
                    <p className="mb-4 text-2xl text-center">Gerar password</p>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: "Este campo é obrigatório" }]}>
                      <Input.Password size="large" placeholder="●●●●●●●" />
                    </Form.Item>
                    <Form.Item
                      label="Confirmar password"
                      name="confirm_password"
                      dependencies={["password"]}
                      hasFeedback
                      rules={[
                        {
                          required: true,
                          message: "Confirme a sua password, por favor!",
                        },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue("password") === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error("As passwords não correspondem"));
                          },
                        }),
                      ]}
                    >
                      <Input.Password size="large" placeholder="●●●●●●●" />
                    </Form.Item>
                    <Form.Item noStyle>
                      <Button size="large" type="primary" className="w-full" onClick={form.submit} loading={isButtonLoading}>
                        Confimar
                      </Button>
                    </Form.Item>
                  </div>
                </Form>

                <p className="text-center text-xs mt-6">
                  Se tiver problemas em aceder, por favor, contacte o <u>suporte@phormulagroup.com</u>
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <Alert
                  title="Oops, algo de errado aconteceu!"
                  description="Este link já não é válido. Contacte o suporte@phormulagroup.com em caso ocorra este erro"
                  type="error"
                  showIcon
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
