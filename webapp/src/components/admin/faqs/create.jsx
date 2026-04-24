import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import countries from "../../../utils/countries.json";

import { Context } from "../../../utils/context";
import Media from "../media/media";
import config from "../../../utils/config";
import { useTranslation } from "react-i18next";
import { AiOutlineFile, AiOutlineFileImage } from "react-icons/ai";
import TipTapFormField from "../tipTap/tipTapFormField";

export default function Create({ open, close, submit }) {
  const { create, selectedLanguage } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [mediaKeyInd, setMediaKeyInd] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    console.log(values);
    try {
      if (values.images) values.images = JSON.stringify(values.images);
      await create({ data: { ...values, id_lang: selectedLanguage.id }, table: "faqs" });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  function openMedia(k, i) {
    setMediaKey(k);
    console.log(i);
    if (i !== null && i !== undefined) setMediaKeyInd(i);
    setIsOpenMedia(true);
  }

  function closeMedia(res) {
    if (res) {
      if (mediaKeyInd !== null) form.setFieldValue([mediaKey, mediaKeyInd, "img"], res[mediaKey]);
      else form.setFieldValue(mediaKey, res[mediaKey]);
    }

    setMediaKey(null);
    setMediaKeyInd(null);
    setIsOpenMedia(false);
  }

  return (
    <Drawer
      open={open}
      size={800}
      onClose={onClose}
      maskClosable={false}
      title={`${t("Add faq")}`}
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
        <Form.Item name="title" label={t("Title")} rules={[{ required: true }]}>
          <Input size="large" placeholder={t("Title")} />
        </Form.Item>
        <Form.Item name="description" label={t("Description")} rules={[{ required: true }]}>
          <TipTapFormField />
        </Form.Item>

        <p className="pb-2">{t("Images")}</p>
        <Form.List name="images">
          {(fields, { add, remove, move }) => (
            <div className="flex flex-col border border-dashed border-gray-300 p-6">
              {fields.map((field) => (
                <div className={`py-4 border-bottom border-gray-300 flex flex-col justify-center`} key={field.key}>
                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.img !== currentValues.img}>
                    {({ getFieldValue }) => (
                      <>
                        <div
                          className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                          onClick={() => openMedia("images", field.name)}
                          style={{
                            backgroundImage: `url(${config.server_ip}/media/${getFieldValue("images")[field?.name]?.img})`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                          }}
                        >
                          {!getFieldValue("images")[field?.name]?.img ? (
                            <div className="flex justify-center items-center flex-col p-10">
                              <AiOutlineFileImage className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add image")}</p>
                            </div>
                          ) : null}
                        </div>

                        <Form.Item name={[field.name, "img"]} hidden>
                          <Input />
                        </Form.Item>
                      </>
                    )}
                  </Form.Item>

                  <Form.Item name={[field.name, "id_lang"]} hidden defaultValue={selectedLanguage.id}>
                    <Input />
                  </Form.Item>
                </div>
              ))}
              <Button size="large" onClick={() => add()}>
                Add image
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
}
