import { useContext, useEffect, useRef, useState } from "react";
import { Button, Drawer, Form, Input, Select, Divider, Switch } from "antd";
import { AiOutlinePlus } from "react-icons/ai";

import { Context } from "../../utils/context";

export default function Create({ open, close, submit }) {
  const { create, roles } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const inputRef = useRef(null);

  const [form] = Form.useForm();
  const [formClient] = Form.useForm();

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
      title="Adicionar utilizador"
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
          <Input placeholder="John Doe" size="large" />
        </Form.Item>
        <Form.Item name="email" label="E-mail" rules={[{ required: true }]}>
          <Input type="email" placeholder="nome@phormulagroup.com" size="large" />
        </Form.Item>
        <Form.Item name="id_role" label="Role" rules={[{ required: true }]}>
          <Select size="large" placeholder="Role..." allowClear options={roles.map((item) => ({ label: item.name, value: item.id }))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
