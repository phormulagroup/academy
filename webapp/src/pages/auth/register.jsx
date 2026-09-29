import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Checkbox, DatePicker, Form, Input, Select } from "antd";

import { Context } from "../../utils/context";

import dayjs from "dayjs";
import axios from "axios";
import endpoints from "../../utils/endpoints";

import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import AuthLayout from "../../layout/auth";
import {
  matchFieldRule,
  requiredCheckboxRule,
  requiredRule,
  requiredSelectRule,
} from "../../utils/formFieldError";

export default function Register() {
  const { t } = useTranslation();
  const { languages, messageApi } = useContext(Context);
  const [countries, setCountries] = useState([]);

  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    let auxCountries = JSON.parse(
      languages.filter((l) => l.code === i18n.language)[0].country,
    );
    let auxLanguage = languages.filter((l) => l.code === i18n.language)[0];

    if (auxCountries && auxCountries.length > 0)
      setCountries(
        auxCountries
          .map((c) => ({
            value: c,
            label: t(`${c}`),
            id_lang: auxLanguage.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
  }, [i18n.language, languages]);

  function submit(values) {
    setIsButtonLoading(true);
    values.id_lang = countries.filter(
      (c) => c.value === values.country,
    )[0].id_lang;
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
            content: t(
              "User registered successfully. You're registration is now pending for review.",
            ),
          });
          setTimeout(() => {
            navigate(`/${i18n.language}/login`, { replace: true });
            setIsButtonLoading(false);
          }, 1500);
        } else {
          messageApi.open({
            type: "error",
            content: t(
              res.data.message ?? "Something went wrong, try again later.",
            ),
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

  return (
    <AuthLayout cardClassName="max-w-200">
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        requiredMark="hidden"
        className="auth-form"
        onFinishFailed={() =>
          messageApi.error(t("Some fields are missing"))
        }>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              name="name"
              label={t("Name")}
              rules={[requiredRule]}
              className="mb-0!">
              <Input size="large" placeholder="John Doe" />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              name="country"
              label={t("Country")}
              rules={[requiredSelectRule]}
              className="mb-0!">
              <Select
                size="large"
                placeholder={t("Choose a country")}
                showSearch={{ optionFilterProp: "label" }}
                allowClear
                options={countries}
              />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              label={t("Academic background")}
              name="academic_background"
              rules={[requiredSelectRule]}
              className="mb-0!">
              <Select
                size="large"
                placeholder={t("Academic background")}
                showSearch={{ optionFilterProp: "label" }}
                allowClear
                options={[
                  {
                    label: t("Secondary School"),
                    value: "Secondary School",
                  },
                  {
                    label: t("University Degree"),
                    value: "University Degree",
                  },
                  { label: t("PhD"), value: "PhD" },
                ]}
              />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              name="email"
              label={t("E-mail")}
              rules={[requiredRule]}
              className="mb-0!">
              <Input type="email" size="large" placeholder={t("E-mail")} />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              label={t("Birth date")}
              name="birth_date"
              rules={[requiredRule]}
              className="mb-0!"
              getValueProps={(value) => ({
                value: value && dayjs(value),
              })}>
              <DatePicker
                size="large"
                placeholder={t("Select birth date")}
                className="w-full"
              />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              label={t("Bial's starting date")}
              name="bial_starting_date"
              rules={[requiredRule]}
              className="mb-0!"
              getValueProps={(value) => ({
                value: value && dayjs(value),
              })}>
              <DatePicker
                size="large"
                placeholder={t("Select Bial's starting date")}
                className="w-full"
              />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              label={t("Password")}
              name="password"
              rules={[requiredRule]}
              className="mb-0!">
              <Input.Password size="large" placeholder="●●●●●●●" />
            </Form.Item>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Form.Item
              label={t("Confirm password")}
              name="confirm_password"
              dependencies={["password"]}
              rules={[
                requiredRule,
                matchFieldRule("password", t("The passwords does not match!")),
              ]}
              className="mb-0!">
              <Input.Password size="large" placeholder="●●●●●●●" />
            </Form.Item>
          </div>
          <div className="col-span-2">
            <Form.Item
              name="knowledge"
              valuePropName="checked"
              className="mb-0!"
              rules={[
                requiredCheckboxRule(t("You must accept our privacy policy.")),
              ]}>
              <Checkbox size="large">
                <p className="text-[#707070] text-[12px]">
                  {t(
                    "I declare that I have read the Privacy Policy of this site, as well as its",
                  )}{" "}
                  <a
                    href="https://www.bial.com/en/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#163986]! underline!"
                    onClick={(e) => e.stopPropagation()}>
                    {t("Terms of Use")}
                  </a>
                  .
                </p>
              </Checkbox>
            </Form.Item>
          </div>
          <div className="col-span-2 flex flex-col justify-center items-center">
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              className="w-full max-w-87.5"
              loading={isButtonLoading}>
              {t("Register")}
            </Button>
            <p className="text-center mt-4 text-[13px] sm:text-sm">
              <Link
                to={`/${i18n.language}/login`}
                className="text-[#163986]! hover:text-[#FFC600]! font-bold underline!">
                « {t("Login")}
              </Link>
            </p>
          </div>
        </div>
      </Form>
    </AuthLayout>
  );
}
