import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, Select } from "antd";
import { useContext } from "react";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserCard from "../../components/app/user/card";
import dayjs from "dayjs";
import {
  emailFieldProps,
  emailRule,
  matchFieldRule,
  requiredDateRule,
  requiredRule,
  requiredSelectRule,
  userEmailRule,
} from "../../utils/formFieldError";
import {
  academicBackgroundOptions,
  genderOptions,
  namePlaceholders,
  splitName,
} from "../../utils/userFields";

export default function Account() {
  const { user, setUser, languages, selectedLanguage, toastApi } =
    useContext(Context);

  const { t, i18n } = useTranslation();
  // Exemplos de Nome e Apelido no idioma atual
  const placeholders = namePlaceholders(i18n.language);
  // Apenas os países do idioma selecionado (como nos formulários do backoffice)
  const countries = useMemo(
    () =>
      languages
        .filter((lang) => lang.id === selectedLanguage?.id)
        .flatMap((l) =>
          JSON.parse(l.country).map((c) => ({
            value: c,
            label: t(`${c}`),
            id_lang: l.id,
          })),
        )
        .sort((a, b) => a.label.localeCompare(b.label)),
    [languages, selectedLanguage, t],
  );

  const navigate = useNavigate();

  const [form] = Form.useForm();

  useEffect(() => {
    const formObjUser = { ...user, ...splitName(user?.name) };
    delete formObjUser.password;
    delete formObjUser.name;
    form.setFieldsValue(formObjUser);
    // Só ao carregar o utilizador: mudar o avatar não deve repor alterações por guardar no formulário
  }, [user.id]);

  function submit(values) {
    if (values.password) values.new_password = values.password;
    delete values.password;
    delete values.confirm_password;

    axios
      .post(endpoints.user.update, {
        data: values,
      })
      .then((res) => {
        if (res.data.user && res.data.token) {
          setUser(res.data.user);
          localStorage.setItem("token", res.data.token);
          toastApi.open({
            type: "success",
            content: t("Account updated successfully!"),
          });
        } else {
          toastApi.open({
            type: "error",
            content: t("Something wrong happened, try again please."),
          });
        }
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({
          type: "error",
          content: t("Something wrong happened, try again please."),
        });
      });
  }

  return (
    <div className="flex-1 py-4 sm:py-8 lg:py-10 bg-[#EAEAEA]">
      <div className="page-frame">
        {/* Mobile/tablet: cartão por cima; desktop: cartão à esquerda e formulário à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-4 rounded-[5px] overflow-hidden shadow-[0px_3px_6px_#00000029]">
          <UserCard editable />
          <div className="bg-[#F7F7F7] lg:col-span-3 p-3 sm:p-6 lg:p-10 min-w-0">
            <p className="font-ryker text-[20px] sm:text-[24px] lg:text-[26px] font-bold text-center mb-4! sm:mb-6!">
              {t("My account")}
            </p>
            <Form
              form={form}
              onFinish={submit}
              layout="vertical"
              className="auth-form">
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <div>
                  <Form.Item
                    name="first_name"
                    label={t("First Name")}
                    rules={[requiredRule]}
                    className="mb-0!">
                    <Input size="large" placeholder={placeholders.first_name} />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="last_name"
                    label={t("Last Name")}
                    rules={[requiredRule]}
                    className="mb-0!">
                    <Input size="large" placeholder={placeholders.last_name} />
                  </Form.Item>
                </div>
                <div>
                  {/* Formato do e-mail e não usado por outra conta (o próprio é ignorado) */}
                  <Form.Item
                    name="email"
                    label={t("E-mail")}
                    {...emailFieldProps}
                    rules={[
                      requiredRule,
                      emailRule,
                      userEmailRule({
                        shouldExist: false,
                        excludeId: user?.id,
                      }),
                    ]}
                    className="mb-0!">
                    <Input
                      type="email"
                      size="large"
                      placeholder={t("youremail@domain.com")}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="gender"
                    label={t("Gender")}
                    rules={[requiredSelectRule]}
                    className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Gender")}
                      allowClear
                      options={genderOptions(t, i18n.language)}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Birth date")}
                    name="birth_date"
                    rules={[requiredDateRule]}
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
                <div>
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
                      options={countries.map((item) => ({
                        label: item.label,
                        value: item.value,
                      }))}
                    />
                  </Form.Item>
                </div>
                <div>
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
                      options={academicBackgroundOptions(t)}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Bial's starting date")}
                    name="bial_starting_date"
                    rules={[requiredDateRule]}
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
                {/* Divide os dados pessoais das passwords */}
                <div className="col-span-full">
                  <Divider
                    className="my-0!"
                    style={{ borderColor: "#8b9cc3" }}
                  />
                </div>
                <div>
                  <Form.Item
                    label={t("Password")}
                    name="password"
                    className="mb-0!">
                    <Input.Password
                      size="large"
                      placeholder={t("Enter your new password")}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Confirm password")}
                    name="confirm_password"
                    dependencies={["password"]}
                    rules={[
                      matchFieldRule(
                        "password",
                        t("The passwords does not match!"),
                      ),
                    ]}
                    className="mb-0!">
                    <Input.Password
                      size="large"
                      placeholder={t("Repeat your new password")}
                    />
                  </Form.Item>
                </div>
                <div className="flex justify-end items-end">
                  <Button
                    className="w-full main-cta-button"
                    size="large"
                    onClick={form.submit}>
                    {t("Save")}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
