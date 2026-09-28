import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";

import { Context } from "../../../utils/context";
import {
  requiredRule,
  requiredSelectRule,
} from "../../../utils/formFieldError";

export default function Update({ data, open, close, submit }) {
  const { update, roles } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    if (data) {
      form.setFieldsValue({ ...data });
    }
  }, [open === true]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await update({ data: values, table: "user" }, { old: data, new: values });
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
      title="Editar utilizador"
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          Editar
        </Button>,
      ]}>
      <Form form={form} onFinish={submit} layout="vertical">
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="name" label="Nome" rules={[requiredRule]}>
          <Input placeholder="John Doe" size="large" />
        </Form.Item>
        <Form.Item name="email" label="E-mail" rules={[requiredRule]}>
          <Input
            type="email"
            placeholder="nome@phormulagroup.com"
            size="large"
          />
        </Form.Item>
        <Form.Item name="id_role" label="Role" rules={[requiredSelectRule]}>
          <Select
            size="large"
            placeholder="Role..."
            showSearch={{
              optionFilterProp: "label",
            }}
            allowClear
            options={roles.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
