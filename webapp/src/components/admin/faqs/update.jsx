import { useContext, useState, useEffect } from "react";
import { Button, Drawer, Form, Input } from "antd";

import { Context } from "../../../utils/context";
import Media from "../media/media";
import { useTranslation } from "react-i18next";
import RichTextFormField from "../richText/richTextFormField";
import { fileTypeRule } from "../../../utils/fileValidation";
import {
  requiredListRule,
  requiredRichTextRule,
  requiredRule,
} from "../../../utils/formFieldError";
import useMediaPicker from "../../../utils/useMediaPicker";
import useFormErrors from "../../../utils/useFormErrors";
import FieldLabel from "../../../utils/fieldLabel";
import MediaField from "../../../utils/mediaField";

// Tipo de ficheiro aceite por cada campo da Multimédia
const FIELD_TYPES = { images: "image" };

export default function Update({ data, open, close, nameRule }) {
  const { update, selectedLanguage } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();
  const images = Form.useWatch("images", form);
  const media = useMediaPicker(form, FIELD_TYPES, t);
  const errors = useFormErrors(form);

  useEffect(() => {
    if (open) {
      errors.reset();
      media.resetSelectionErrors();
      // As imagens vêm em JSON da base de dados; copia para não alterar a prop
      const values = { ...data };
      if (typeof values.images === "string")
        values.images = JSON.parse(values.images);
      form.setFieldsValue(values);
    }
  }, [open]);

  function resetState() {
    form.resetFields();
    errors.reset();
    media.resetSelectionErrors();
  }

  function onClose() {
    resetState();
    close();
  }

  async function handleSubmit(values) {
    setIsButtonLoading(true);
    try {
      if (values.images) values.images = JSON.stringify(values.images);
      await update({
        data: { ...values, id_lang: selectedLanguage.id },
        table: "faqs",
      });
      setIsButtonLoading(false);
      resetState();
      close(true);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  const imagesError = errors.errorOf("images", images);

  return (
    <Drawer
      open={open}
      size={800}
      onClose={onClose}
      maskClosable={false}
      title={`${t("Update faq")}`}
      extra={[
        <Button
          key="submit"
          type="primary"
          size="large"
          loading={isButtonLoading}
          onClick={errors.submit}>
          {t("Update")}
        </Button>,
      ]}>
      <Media
        mediaKey={media.mediaKey}
        open={media.isOpenMedia}
        close={media.closeMedia}
      />
      <Form
        form={form}
        onFinish={handleSubmit}
        onFieldsChange={errors.onFieldsChange}
        layout="vertical">
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="title" label={t("Title")} rules={[requiredRule, nameRule(data?.id)]}>
          <Input size="large" placeholder={t("Title")} />
        </Form.Item>
        <Form.Item
          name="description"
          label={t("Description")}
          rules={[requiredRichTextRule]}>
          <RichTextFormField />
        </Form.Item>

        <p className="pb-2">
          <FieldLabel label={t("Images")} error={imagesError} />
        </p>
        <Form.List name="images" rules={[requiredListRule]}>
          {(fields, { add, remove }) => (
            <div
              className={`flex flex-col border border-dashed ${imagesError ? "border-red-500" : "border-gray-300"} p-6`}>
              {fields.map((field) => (
                <div
                  className={`py-4 border-bottom border-gray-300 flex flex-col justify-center`}
                  key={field.key}>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      JSON.stringify(prevValues.images) !==
                      JSON.stringify(currentValues.images)
                    }>
                    {({ getFieldValue }) => {
                      const path = ["images", field.name, "img"];
                      const value = getFieldValue(path);

                      return (
                        <>
                          {/* o botão remove a imagem inteira, mesmo que ainda não tenha ficheiro */}
                          <MediaField
                            label={t("Image")}
                            value={value}
                            error={
                              media.selectionError(path) ||
                              errors.errorOf(path, value)
                            }
                            placeholder={t("Add image")}
                            onOpen={() =>
                              media.openMedia("images", field.name, "img")
                            }
                            onRemove={() => remove(field.name)}
                            alwaysRemovable
                          />
                          <Form.Item
                            name={[field.name, "img"]}
                            hidden
                            validateTrigger="onChange"
                            rules={[requiredRule, fileTypeRule("image", t)]}>
                            <Input />
                          </Form.Item>
                        </>
                      );
                    }}
                  </Form.Item>

                  <Form.Item
                    name={[field.name, "id_lang"]}
                    hidden
                    defaultValue={selectedLanguage.id}>
                    <Input />
                  </Form.Item>
                </div>
              ))}
              <Button size="large" onClick={() => add()}>
                {t("Add image")}
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
}
