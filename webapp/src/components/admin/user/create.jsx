import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select, DatePicker } from "antd";

import { Context } from "../../../utils/context";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  emailFieldProps,
  emailRule,
  requiredDateRule,
  requiredRule,
  requiredSelectRule,
  userEmailRule,
} from "../../../utils/formFieldError";

export default function Create({ open, close }) {
  const { create, roles, languages, selectedLanguage } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [form] = Form.useForm();

  const { t } = useTranslation();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await create({ data: values, table: "user" });
      setIsButtonLoading(false);
      close(true);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Drawer
      open={open}
      size={800}
      onClose={onClose}
      maskClosable={false}
      title={t("Add user")}
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          {t("Add")}
        </Button>,
      ]}>
      <Form form={form} onFinish={submit} layout="vertical">
        {/* Mesma ordem do registo: nome, e-mail, data de nascimento, país, formação, início na Bial */}
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="name" label={t("Name")} rules={[requiredRule]}>
            <Input placeholder="John Doe" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label={t("E-mail")}
            {...emailFieldProps}
            rules={[
              requiredRule,
              emailRule,
              userEmailRule(),
            ]}>
            <Input
              type="email"
              placeholder="nome@phormulagroup.com"
              size="large"
            />
          </Form.Item>
          <Form.Item
            label={t("Birth date")}
            name="birth_date"
            rules={[requiredDateRule]}
            getValueProps={(value) => ({
              value: value && dayjs(value),
            })}>
            <DatePicker
              size="large"
              placeholder={t("Select birth date")}
              className="w-full"
            />
          </Form.Item>
          <Form.Item name="country" label={t("Country")} rules={[requiredSelectRule]}>
            <Select
              size="large"
              placeholder={t("Country...")}
              allowClear
              options={languages
                .filter((lang) => lang.id === selectedLanguage.id)
                .flatMap((l) =>
                  JSON.parse(l.country).map((c) => ({
                    value: c,
                    label: t(`${c}`),
                    id_lang: l.id,
                  })),
                )
                .sort((a, b) => a.label.localeCompare(b.label))}
            />
          </Form.Item>
          <Form.Item
            label={t("Academic background")}
            name="academic_background"
            rules={[requiredSelectRule]}>
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
          <Form.Item
            label={t("Bial's starting date")}
            name="bial_starting_date"
            rules={[requiredDateRule]}
            getValueProps={(value) => ({
              value: value && dayjs(value),
            })}>
            <DatePicker
              size="large"
              placeholder={t("Select Bial's starting date")}
              className="w-full"
            />
          </Form.Item>
          <Form.Item name="id_role" label={t("Role")} rules={[requiredSelectRule]}>
            <Select
              size="large"
              placeholder={t("Role...")}
              allowClear
              options={roles.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
}
