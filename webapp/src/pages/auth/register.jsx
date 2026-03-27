import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Footer } from "antd/es/layout/layout";
import { Button, Checkbox, DatePicker, Divider, Dropdown, Form, Input, message, Select } from "antd";
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

export default function Register() {
  const { t } = useTranslation();
  const { setIsLoadingLanguage, languages, messageApi } = useContext(Context);
  const [countries, setCountries] = useState([]);

  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    let auxCountries = JSON.parse(languages.filter((l) => l.code === i18n.language)[0].country);
    let auxLanguage = languages.filter((l) => l.code === i18n.language)[0];
    if (auxCountries.length > 0)
      setCountries(
        auxCountries
          .map((c) => ({
            value: c,
            label: t(`${c}`),
            id_lang: auxLanguage.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
  }, [i18n.language]);

  function submit(values) {
    setIsButtonLoading(true);
    values.id_lang = countries.filter((c) => c.value === values.country)[0].id_lang;
    delete values.confirm_password;
    delete values.knowledge;
    axios
      .post(endpoints.auth.register, {
        data: values,
      })
      .then((res) => {
        if (res.data.insertId) {
          messageApi.success({
            type: "success",
            content: t("User registered successfully. You're registration is now pending for review."),
          });
          setTimeout(() => {
            navigate(`/${i18n.language}/login`, { replace: true });
            setIsButtonLoading(false);
          }, 1500);
        } else if (res.data.message) {
          messageApi.open({
            type: "error",
            content: t(res.data.message),
          });
          setIsButtonLoading(false);
        } else {
          messageApi.open({
            type: "error",
            content: t("Something went wrong, try again later."),
          });
          setIsButtonLoading(false);
        }
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
        <div className="max-w-200 bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)] sm:mt-15 relative">
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
            <img src={logo} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-6" />
            <Form
              form={form}
              layout="vertical"
              onFinish={submit}
              validateMessages={{ required: t("This field is required") }}
              requiredMark="hidden"
              className="auth-form"
              onFinishFailed={() => message.error(t("Some fields are missing"))}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Form.Item name="name" label={t("Name")} rules={[{ required: true }]} className="mb-0!">
                    <Input size="large" placeholder="John Doe" />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Form.Item name="country" label={t("Country")} rules={[{ required: true }]} className="mb-0!">
                    <Select size="large" placeholder={t("Choose a country")} showSearch={{ optionFilterProp: "label" }} allowClear options={countries} />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Form.Item label={t("Academic background")} name="academic_background" rules={[{ required: true }]} className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Academic background")}
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      options={[
                        { label: "Secondary School", value: "Secondary School" },
                        { label: "University Degree", value: "University Degree" },
                        { label: "PhD", value: "PhD" },
                      ]}
                    />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Form.Item name="email" label={t("E-mail")} rules={[{ required: true }]} className="mb-0!">
                    <Input type="email" size="large" placeholder="E-mail" />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Form.Item label={t("Birth date")} name="birth_date" rules={[{ required: true }]} className="mb-0!" getValueProps={(value) => ({ value: value && dayjs(value) })}>
                    <DatePicker size="large" placeholder="Select birth date" className="w-full" />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Form.Item
                    label={t("Bial's starting date")}
                    name="bial_starting_date"
                    rules={[{ required: true }]}
                    className="mb-0!"
                    getValueProps={(value) => ({ value: value && dayjs(value) })}
                  >
                    <DatePicker size="large" placeholder="Select Bial's starting date" className="w-full" />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Form.Item label={t("Password")} name="password" rules={[{ required: true }]} className="mb-0!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div className="col-span-2 md:col-span-1">
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
                    className="mb-0!"
                  >
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div className="col-span-2">
                  <Form.Item
                    name="knowledge"
                    valuePropName="checked"
                    className="mb-0!"
                    rules={[
                      {
                        required: true,
                        validator: async (_, checked) => {
                          if (!checked) {
                            return Promise.reject(new Error(t("You must accept our privacy policy.")));
                          }
                        },
                      },
                    ]}
                  >
                    <Checkbox size="large">
                      <p className="text-[#707070] text-[12px]">Declaro que tomei conhecimento da Política de Privacidade deste site, bem como dos seus Termos de Utilização.</p>
                    </Checkbox>
                  </Form.Item>
                </div>
                <div className="col-span-2 flex justify-center items-center">
                  <Button htmlType="submit" type="primary" size="large" className="w-full max-w-87.5" loading={isButtonLoading}>
                    {t("Register")}
                  </Button>
                </div>
              </div>
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
