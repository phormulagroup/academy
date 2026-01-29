import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import countries from "../../utils/countries.json";

import { Context } from "../../utils/context";

export default function Create({ open, close, submit }) {
  const { create } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await create({ data: values, table: "language" });
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
      title="Adicionar linguagem"
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          Adicionar
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
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>
        <Form.Item name="country" label="Países" rules={[{ required: true }]}>
          <Select
            key="language"
            size="large"
            className="w-full"
            placeholder="Please select"
            onChange={(e) => console.log(e)}
            showSearch={{
              optionFilterProp: ["label"],
            }}
            options={countries.map((o) => ({ label: o, values: o }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
