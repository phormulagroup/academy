import { useContext, useEffect, useRef, useState } from "react";
import { Button, Drawer, Form, Input, Select, Divider, Switch } from "antd";
import { AiOutlinePlus } from "react-icons/ai";

import { Context } from "../../utils/context";

export default function Update({ data, open, close, submit }) {
  const { update, companies, roles } = useContext(Context);
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

        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input placeholder="John Doe" size="large" />
        </Form.Item>
        <Form.Item name="email" label="E-mail" rules={[{ required: true }]}>
          <Input type="email" placeholder="nome@phormulagroup.com" size="large" />
        </Form.Item>
        <Form.Item name="id_role" label="Role" rules={[{ required: true }]}>
          <Select size="large" placeholder="Role..." allowClear options={roles.map((item) => ({ label: item.name, value: item.id }))} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.id_role !== currentValues.id_role}>
          {({ getFieldValue }) =>
            getFieldValue("id_role") !== 1 ? (
              <Form.Item name="id_department" label="Departamento" rules={[{ required: true }]}>
                <Select size="large" placeholder="Departamento..." allowClear options={companies.map((item) => ({ label: item.name, value: item.id }))} />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Drawer>
  );
}
