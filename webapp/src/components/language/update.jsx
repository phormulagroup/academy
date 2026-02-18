import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import countries from "../../utils/countries.json";

import { Context } from "../../utils/context";

export default function Update({ data, open, close, submit }) {
  const { update } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [languageOptions, setLanguageOptions] = useState([
    { flag: "https://flagcdn.com/es.svg", name: "Español" },
    { flag: "https://flagcdn.com/pt.svg", name: "Português" },
    { flag: "https://flagcdn.com/fr.svg", name: "Français" },
    { flag: "https://flagcdn.com/gb.svg", name: "English" },
  ]);

  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      let aux = Object.assign({}, data);
      aux.country = aux.country ? JSON.parse(aux.country) : null;
      form.setFieldsValue(aux);
    }
  }, [open]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await update({ data: values, table: "language" });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
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
      title="Editar linguagem"
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          Atualizar
        </Button>,
      ]}
    >
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        validateMessages={{
          required: "Este campo é obrigatório!",
        }}
      >
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="flag" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Select
            size="large"
            className="w-full"
            placeholder="Selecione..."
            onChange={(e) => form.setFieldValue("flag", languageOptions.filter((i) => i.name === e)[0].flag)}
            showSearch={{
              optionFilterProp: "label",
            }}
            options={languageOptions.map((o) => ({
              label: (
                <div className="flex justify-start items-center">
                  <img src={o.flag} className="max-w-5 mr-2" />
                  <p>{o.name}</p>
                </div>
              ),
              value: o.name,
            }))}
          />
        </Form.Item>
        <Form.Item name="country" label="Países" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            size="large"
            className="w-full"
            placeholder="Selecione..."
            showSearch={{
              optionFilterProp: ["label"],
            }}
            options={countries.map((o) => ({ label: o, value: o }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
