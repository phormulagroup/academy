import { useContext, useEffect, useState } from "react";
import { Button, Col, Row, Modal, Drawer, Form, Input, Select, DatePicker } from "antd";
import axios from "axios";

import Media from "../media/media";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";
import { AiOutlineFile } from "react-icons/ai";
import i18n from "../../../utils/i18n";
import { useNavigate } from "react-router-dom";

export default function Duplicate({ data, open, close, submit }) {
  const { create, t, selectedLanguage, languages } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  const [form] = Form.useForm();

  const navigate = useNavigate();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      const res = await axios.post(endpoints.course.duplicate, { data: { id_lang: values.id_lang, id: data.id } });
      navigate(`/admin/courses/${res.data.insertId}`);
      setIsButtonLoading(false);
      close(true);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  function openMedia(key) {
    setMediaKey(key);
    setIsOpenMedia(true);
  }

  function closeMedia(res) {
    if (res) {
      form.setFieldValue(mediaKey, res[mediaKey]);
    }

    setMediaKey(null);
    setIsOpenMedia(false);
  }

  return (
    <Modal
      key="modal-logout"
      width={500}
      style={{ top: 20 }}
      onCancel={close}
      open={open}
      maskClosable={false}
      footer={[
        <Button onClick={close}>{t("Cancel")}</Button>,
        <Button type="primary" loading={isButtonLoading} onClick={form.submit}>
          {t("Create")}
        </Button>,
      ]}
    >
      <Media mediaKey={mediaKey} open={isOpenMedia} close={closeMedia} />
      <p className="text-[16px] font-bold mb-4">{t("Duplicate Course")}</p>
      <p>{t("Are you sure you want to duplicate this course?")}</p>
      <p className="mb-4">
        {t("Selected course")}: {data.internal_name}
      </p>
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        validateMessages={{
          required: "Este campo é obrigatório!",
        }}
      >
        <Form.Item name="name" label={t("New name")} rules={[{ required: true }]}>
          <Input size="large" placeholder={t("Enter course name")} />
        </Form.Item>
        <Form.Item name="internal_name" label={t("New internal name")} rules={[{ required: true }]}>
          <Input size="large" placeholder={t("Enter internal course name")} />
        </Form.Item>
        <Form.Item name="id_lang" label={t("New language")} rules={[{ required: true }]}>
          <Select
            size="large"
            className="w-full"
            placeholder="Selecione..."
            showSearch={{
              optionFilterProp: ["label"],
            }}
            options={languages.map((item) => ({
              label: (
                <div className={`flex items-center`}>
                  <img src={item.flag} className="max-w-5 mr-2" alt={item.name} />
                  <p>{item.name}</p>
                </div>
              ),
              value: item.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
