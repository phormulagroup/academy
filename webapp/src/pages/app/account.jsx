import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Collapse,
  DatePicker,
  Divider,
  Form,
  Input,
  Select,
} from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import {
  FaChevronRight,
  FaRegCheckCircle,
  FaRegCopy,
  FaRegEdit,
  FaRegFile,
  FaRegTimesCircle,
  FaRegTrashAlt,
} from "react-icons/fa";

import Table from "../../components/admin/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";
import avatarImg from "../../assets/Female.svg";
import { useTranslation } from "react-i18next";
import UserCard from "../../components/app/user/card";
import dayjs from "dayjs";
import {
  matchFieldRule,
  requiredRule,
  requiredSelectRule,
} from "../../utils/formFieldError";

export default function Account() {
  const { user, setUser, languages, selectedLanguage, messageApi } = useContext(Context);

  const { t } = useTranslation();
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
    const formObjUser = Object.assign({}, user);
    delete formObjUser.password;
    form.setFieldsValue(formObjUser);
  }, [user]);

  function submit(values) {
    if (!values.password) {
      delete values.password;
      delete values.confirm_password;
    }

    console.log(values);

    axios
      .post(endpoints.user.update, {
        data: values,
      })
      .then((res) => {
        if (res.data.user && res.data.token) {
          setUser(res.data.user);
          localStorage.setItem("token", res.data.token);
          messageApi.open({
            type: "success",
            content: t("Account updated successfully!"),
          });
        } else {
          messageApi.open({
            type: "error",
            content: t("Something wrong happened, try again please."),
          });
        }
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({
          type: "error",
          content: t("Something wrong happened, try again please."),
        });
      });
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <div className="container m-auto">
        <div className="grid grid-cols-4">
          <UserCard />
          <div className="bg-[#F7F7F7] col-span-3 p-10">
            <p className="text-[26px] font-bold text-center mb-6!">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <Form.Item
                    name="name"
                    label={t("Name")}
                    rules={[requiredRule]}
                    className="mb-0!">
                    <Input size="large" placeholder="John Doe" />
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
                      options={[
                        {
                          label: "Secondary School",
                          value: "Secondary School",
                        },
                        {
                          label: "University Degree",
                          value: "University Degree",
                        },
                        { label: "PhD", value: "PhD" },
                      ]}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="email"
                    label={t("E-mail")}
                    rules={[requiredRule]}
                    className="mb-0!">
                    <Input type="email" size="large" placeholder="E-mail" />
                  </Form.Item>
                </div>
                <div>
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
                      placeholder="Select birth date"
                      className="w-full"
                    />
                  </Form.Item>
                </div>
                <div>
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
                      placeholder="Select Bial's starting date"
                      className="w-full"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Password")}
                    name="password"
                    className="mb-0!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
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
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div className="flex justify-end items-end">
                  <Button
                    className="w-full"
                    size="large"
                    variant="solid"
                    color="blue"
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
