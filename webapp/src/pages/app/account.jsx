import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, DatePicker, Divider, Form, Input, Select } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";
import avatarImg from "../../assets/Female.svg";
import { useTranslation } from "react-i18next";
import UserCard from "../../components/app/userCard";

export default function Account() {
  const { user, languages } = useContext(Context);

  const { t } = useTranslation();
  const [countries] = useState(
    languages
      .flatMap((l) =>
        JSON.parse(l.country).map((c) => ({
          value: c,
          label: t(`${c}`),
          id_lang: l.id,
        })),
      )
      .sort((a, b) => a.label.localeCompare(b.label)),
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

    axios
      .post(endpoints.user.update, {
        data: values,
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <div className="container m-auto">
        <div className="grid grid-cols-4">
          <UserCard />
          <div className="bg-[#F7F7F7] col-span-3 p-10">
            <p className="text-[26px] font-bold text-center mb-6!">{t("My account")}</p>
            <Form form={form} onFinish={submit} layout="vertical" className="auth-form">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  <Form.Item label={t("Password")} name="password" rules={[{ required: false }]} className="mb-0!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Confirm password")}
                    name="confirm_password"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: false,
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
                <div className="flex justify-end items-end">
                  <Button className="w-full" size="large" variant="solid" color="blue">
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
