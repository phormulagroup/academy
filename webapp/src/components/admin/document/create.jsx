import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import countries from "../../../utils/countries.json";

import { Context } from "../../../utils/context";
import Media from "../media/media";
import config from "../../../utils/config";
import { useTranslation } from "react-i18next";
import { AiOutlineFile } from "react-icons/ai";

export default function Create({ open, close, submit }) {
  const { create, selectedLanguage } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await create({ data: { ...values, id_lang: selectedLanguage.id }, table: "document" });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  function openMedia(k) {
    setMediaKey(k);
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
      title={`${t("Add document")}`}
      extra={[
        <Button type="primary" size="large" loading={isButtonLoading} onClick={form.submit}>
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
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input size="large" placeholder="Nome do documento" />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.img !== currentValues.img}>
          {({ getFieldValue }) => (
            <>
              <p className="pb-2">{t("Cover image")}</p>
              <div
                className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                onClick={() => openMedia("img")}
                style={{
                  backgroundImage: `url(${config.server_ip}/media/${getFieldValue("img")})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
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
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.img !== currentValues.img}>
          {({ getFieldValue }) => (
            <>
              <p className="pb-2">{t("Document")}</p>
              <div
                className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                onClick={() => openMedia("file")}
              >
                {!getFieldValue("file") ? (
                  <div className="flex justify-center items-center flex-col p-10">
                    <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add file")}</p>
                  </div>
                ) : (
                  <div className="flex justify-center items-center flex-col p-10">
                    <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{getFieldValue("file")}</p>
                  </div>
                )}
              </div>

              <Form.Item name="file" hidden>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>
      </Form>
    </Drawer>
  );
}
