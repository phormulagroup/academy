import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Footer } from "antd/es/layout/layout";
import { Button, Checkbox, DatePicker, Divider, Form, Input, message, Select } from "antd";
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

export default function Register() {
  const { isLoggedIn, login, messageApi, microsoftLogin, createLog } = useContext(Context);
  const [countries] = useState([
    { value: "Albania", label: "Albania" },
    { value: "Angola", label: "Angola" },
    { value: "Azerbaijan", label: "Azerbaijan" },
    { value: "Benin", label: "Benin" },
    { value: "Burkina Faso", label: "Burkina Faso" },
    { value: "Cameroon", label: "Cameroon" },
    { value: "Cape Verde", label: "Cape Verde" },
    { value: "Colombia", label: "Colombia" },
    { value: "Congo", label: "Congo" },
    { value: "Costa Rica", label: "Costa Rica" },
    { value: "Côte d'Ivoire", label: "Côte d'Ivoire" },
    { value: "Cuba", label: "Cuba" },
    { value: "Cyprus", label: "Cyprus" },
    { value: "Republica Dominicana", label: "Dominican Republic" },
    { value: "El Salvador", label: "El Salvador" },
    { value: "Gabon", label: "Gabon" },
    { value: "Guatemala", label: "Guatemala" },
    { value: "Guinea", label: "Guinea" },
    { value: "Haiti", label: "Haiti" },
    { value: "Honduras", label: "Honduras" },
    { value: "Hong Kong", label: "Hong Kong" },
    { value: "Lebanon", label: "Lebanon" },
    { value: "Macau", label: "Macau" },
    { value: "Madagascar", label: "Madagascar" },
    { value: "Mali", label: "Mali" },
    { value: "Malta", label: "Malta" },
    { value: "Mauritania", label: "Mauritania" },
    { value: "Mauritius", label: "Mauritius" },
    { value: "Mexico", label: "Mexico" },
    { value: "Moldavia", label: "Moldavia" },
    { value: "Mozambique", label: "Mozambique" },
    { value: "Nicaragua", label: "Nicaragua" },
    { value: "Niger", label: "Niger" },
    { value: "Panama", label: "Panama" },
    { value: "Saudi Arabia", label: "Saudi Arabia" },
    { value: "Senegal", label: "Senegal" },
    { value: "Togolese Republic", label: "Togolese Republic" },
    { value: "Tunisia", label: "Tunisia" },
    { value: "UAE", label: "United Arab Emirates" },
  ]);

  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();
  const { t } = useTranslation();

  function submit(values) {
    console.log(values);
  }

  return (
    <div className={`flex flex-col justify-between w-full h-full bg-[#F7F7F7] bg-contain bg-right bg-no-repeat`} style={{ backgroundImage: `url(${bgLogin})` }}>
      <div className="flex flex-col justify-center items-center min-h-125 w-full h-full">
        <div className="max-w-[800px] bg-white rounded-[5px] shadow-[0_3px_6px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col p-6">
            <img src={logo} alt="Phormula Logo" className="max-w-75 h-auto mx-auto mb-6" />
            <Form form={form} layout="vertical" onFinish={submit} validateMessages={{ required: t("This field is required") }} requiredMark="hidden" className="auth-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Form.Item name="name" label={t("Name")} rules={[{ required: true }]} className="mb-0!">
                    <Input size="large" placeholder="John Doe" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item name="country" label={t("Country")} rules={[{ required: true }]} className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Choose a country")}
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      options={countries.map((item) => ({ label: item.label, value: item.value }))}
                    />
                  </Form.Item>
                </div>
                <div>
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
                <div>
                  <Form.Item name="email" label={t("E-mail")} rules={[{ required: true }]} className="mb-0!">
                    <Input type="email" size="large" placeholder="E-mail" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Birth date")} name="birth_date" rules={[{ required: true }]} className="mb-0!">
                    <DatePicker size="large" placeholder="Select birth date" className="w-full" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Bial's starting date")} name="bial_starting_date" rules={[{ required: true }]} className="mb-0!">
                    <DatePicker size="large" placeholder="Select Bial's starting date" className="w-full" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Password")} name="password" rules={[{ required: true }]} className="mb-0!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Confirm password")} name="confirm_password" rules={[{ required: true }]} className="mb-0!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div className="col-span-2">
                  <Form.Item name="remember" valuePropName="checked" className="mb-0!">
                    <Checkbox size="large">
                      <p className="text-[#707070] text-[12px]">Declaro que tomei conhecimento da Política de Privacidade deste site, bem como dos seus Termos de Utilização.</p>
                    </Checkbox>
                  </Form.Item>
                </div>
                <div className="col-span-2 flex justify-center items-center">
                  <Button htmlType="submit" type="primary" size="large" className="w-full max-w-[350px]" loading={isButtonLoading}>
                    {t("Login")}
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
        <div className="p-4 flex justify-center items-center">
          <img src={logoBialFooter} className="max-w-[180px]" />
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
