import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Divider, Form, Input, Select } from "antd";
import { LuLock, LuUser } from "react-icons/lu";
import { useContext } from "react";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserHero from "../../components/app/user/hero";
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
          form.setFieldsValue({ current_password: undefined, password: undefined, confirm_password: undefined });
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
        if (err.response?.data?.code === "invalid_current_password") {
          form.setFields([{ name: "current_password", errors: [t("The current password is incorrect")] }]);
          return;
        }
        toastApi.open({
          type: "error",
          content: t("Something wrong happened, try again please."),
        });
      });
  }

  return (
    <div className="flex-1 bg-[#F1F9FF] py-4 sm:py-8 lg:py-10">
      <div className="page-frame flex flex-col gap-4 sm:gap-6">
        <UserHero editable />

        <div className="min-w-0 rounded-[16px] bg-white p-3 shadow-[0px_3px_6px_#00000029] sm:p-6 lg:p-8">
          <p className="mb-1! font-ryker text-[20px] font-bold sm:text-[24px]">{t("My account")}</p>
          <p className="mb-6! text-[14px] text-[#8A8D98]">{t("Your personal data and password")}</p>
          <Form form={form} onFinish={submit} layout="vertical" className="auth-form">
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
            <p className="mb-4! flex items-center gap-2 text-[15px] font-bold">
              <LuUser className="text-[#163986]" />
              {t("Personal data")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              <Form.Item name="first_name" label={t("First Name")} rules={[requiredRule]} className="mb-0!">
                <Input size="large" placeholder={placeholders.first_name} />
              </Form.Item>
              <Form.Item name="last_name" label={t("Last Name")} rules={[requiredRule]} className="mb-0!">
                <Input size="large" placeholder={placeholders.last_name} />
              </Form.Item>
              {/* Formato do e-mail e não usado por outra conta (o próprio é ignorado) */}
              <Form.Item
                name="email"
                label={t("E-mail")}
                {...emailFieldProps}
                rules={[requiredRule, emailRule, userEmailRule({ shouldExist: false, excludeId: user?.id })]}
                className="mb-0!">
                <Input type="email" size="large" placeholder={t("youremail@domain.com")} />
              </Form.Item>
              <Form.Item name="gender" label={t("Gender")} rules={[requiredSelectRule]} className="mb-0!">
                <Select size="large" placeholder={t("Gender")} allowClear options={genderOptions(t, i18n.language)} />
              </Form.Item>
              <Form.Item label={t("Birth date")} name="birth_date" rules={[requiredDateRule]} className="mb-0!" getValueProps={(value) => ({ value: value && dayjs(value) })}>
                <DatePicker size="large" placeholder={t("Select birth date")} className="w-full" />
              </Form.Item>
              <Form.Item name="country" label={t("Country")} rules={[requiredSelectRule]} className="mb-0!">
                <Select size="large" placeholder={t("Choose a country")} showSearch={{ optionFilterProp: "label" }} allowClear options={countries.map((item) => ({ label: item.label, value: item.value }))} />
              </Form.Item>
              <Form.Item label={t("Academic background")} name="academic_background" rules={[requiredSelectRule]} className="mb-0!">
                <Select size="large" placeholder={t("Academic background")} showSearch={{ optionFilterProp: "label" }} allowClear options={academicBackgroundOptions(t)} />
              </Form.Item>
              <Form.Item label={t("Bial's starting date")} name="bial_starting_date" rules={[requiredDateRule]} className="mb-0!" getValueProps={(value) => ({ value: value && dayjs(value) })}>
                <DatePicker size="large" placeholder={t("Select Bial's starting date")} className="w-full" />
              </Form.Item>
            </div>

            <Divider />

            <p className="mb-1! flex items-center gap-2 text-[15px] font-bold">
              <LuLock className="text-[#163986]" />
              {t("Password")}
            </p>
            <p className="mb-4! text-[13px] text-[#8A8D98]">{t("Leave empty to keep the current password")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              <Form.Item label={t("Current password")} name="current_password" dependencies={["password"]} rules={[({ getFieldValue }) => ({ required: !!getFieldValue("password"), message: t("Enter your current password to change it") })]} className="mb-0!">
                <Input.Password size="large" autoComplete="current-password" placeholder={t("Enter your current password")} />
              </Form.Item>
              <Form.Item label={t("New password")} name="password" className="mb-0!">
                <Input.Password size="large" placeholder={t("Enter your new password")} />
              </Form.Item>
              <Form.Item label={t("Confirm password")} name="confirm_password" dependencies={["password"]} rules={[matchFieldRule("password", t("The passwords does not match!"))]} className="mb-0!">
                <Input.Password size="large" placeholder={t("Repeat your new password")} />
              </Form.Item>
            </div>

            <div className="mt-8 flex justify-end">
              <Button className="main-cta-button w-full sm:w-auto sm:min-w-48" size="large" onClick={form.submit}>
                {t("Save")}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
