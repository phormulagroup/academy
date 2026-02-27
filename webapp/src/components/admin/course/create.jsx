import { useContext, useState } from "react";
import { Button, Col, Row, Modal, Drawer, Form, Input, Select, DatePicker } from "antd";
import axios from "axios";

import Media from "../media/media";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";
import { AiOutlineFile } from "react-icons/ai";
import i18n from "../../../utils/i18n";

export default function Create({ open, close, submit }) {
  const { create, t, languages } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await create({ data: values, table: "course" });
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
    <Drawer
      open={open}
      size={800}
      onClose={onClose}
      maskClosable={false}
      title={t("Add course")}
      extra={[
        <Button type="primary" loading={isButtonLoading} onClick={form.submit}>
          {t("Add")}
        </Button>,
      ]}
    >
      <Media mediaKey={mediaKey} open={isOpenMedia} close={closeMedia} />
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        validateMessages={{
          required: "Este campo é obrigatório!",
        }}
      >
        <Form.Item name="id_lang" label={t("Language")} rules={[{ required: true }]}>
          <Select
            size="large"
            className="w-full"
            placeholder={t("Select")}
            showSearch={{
              optionFilterProp: ["label"],
            }}
            value={languages.filter((item) => i18n.language === item.code)[0]?.id}
            options={languages.map((o) => ({
              label: (
                <div className="flex justify-start items-center">
                  <img src={o.flag} className="max-w-5 mr-2" />
                  <p>{o.name}</p>
                </div>
              ),
              value: o.id,
            }))}
          />
        </Form.Item>
        <Form.Item name="name" label={t("Name")} rules={[{ required: true }]}>
          <Input size="large" placeholder={t("Enter course name")} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.items !== currentValues.items}>
          {({ getFieldValue }) => (
            <>
              <p className="pb-2">{t("Image")}</p>
              <div
                className="border border-dashed border-gray-300 rounded-lg mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                onClick={() => openMedia("img")}
                style={{ background: `url(${config.server_ip}/media/${getFieldValue("img")})` }}
              >
                {!getFieldValue("img") ? (
                  <div className="flex justify-center items-center flex-col p-10">
                    <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add multimedia")}</p>
                  </div>
                ) : null}
              </div>

              <Form.Item name="img" hidden>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="date_start" label={t("Date start")} rules={[{ required: true }]}>
            <DatePicker size="large" showTime className="w-full" />
          </Form.Item>
          <Form.Item name="date_end" label={t("Date end")} rules={[{ required: true }]}>
            <DatePicker size="large" showTime className="w-full" />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
}
