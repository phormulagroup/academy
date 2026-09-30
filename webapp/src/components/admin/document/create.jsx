import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";

import { Context } from "../../../utils/context";
import Media from "../media/media";
import { useTranslation } from "react-i18next";
import { fileTypeRule } from "../../../utils/fileValidation";
import { requiredRule } from "../../../utils/formFieldError";
import useMediaPicker from "../../../utils/useMediaPicker";
import useFormErrors from "../../../utils/useFormErrors";
import MediaField from "../../../utils/mediaField";

// Tipo de ficheiro aceite por cada campo da Multimédia
const FIELD_TYPES = { img: "image", file: "pdf" };

export default function Create({ open, close, nameRule }) {
  const { create, selectedLanguage, languages } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();
  const name = Form.useWatch("name", form);
  const media = useMediaPicker(form, FIELD_TYPES, t);
  const errors = useFormErrors(form);

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
      await create({
        data: { ...values, id_lang: selectedLanguage.id },
        table: "document",
      });
      setIsButtonLoading(false);
      resetState();
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
      title={`${t("Add document")}`}
      extra={[
        <Button
          key="submit"
          type="primary"
          size="large"
          loading={isButtonLoading}
          onClick={errors.submit}>
          {t("Add")}
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
        <Form.Item
          name="name"
          {...errors.labelErrorProps("name", name, "Nome")}
          rules={[requiredRule, nameRule()]}>
          <Input size="large" placeholder="Nome do documento" />
        </Form.Item>
        <Form.Item name="country" label={t("Country")}>
          <Select
            mode="multiple"
            size="large"
            placeholder="País..."
            allowClear
            options={languages
              .filter((lang) => lang.id === selectedLanguage.id)
              .flatMap((l) =>
                JSON.parse(l.country).map((c) => ({
                  value: c,
                  label: t(`${c}`),
                  id_lang: l.id,
                })),
              )
              .sort((a, b) => a.label.localeCompare(b.label))}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.img !== currentValues.img
          }>
          {({ getFieldValue }) => (
            <>
              <MediaField
                label={t("Cover image")}
                value={getFieldValue("img")}
                error={
                  media.selectionError("img") ||
                  errors.errorOf("img", getFieldValue("img"))
                }
                placeholder={t("Add multimedia")}
                onOpen={() => media.openMedia("img")}
                onRemove={() => media.setMediaValue("img", null)}
              />
              <Form.Item
                name="img"
                hidden
                rules={[requiredRule, fileTypeRule("image", t)]}>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.file !== currentValues.file
          }>
          {({ getFieldValue }) => (
            <>
              <MediaField
                type="file"
                label={t("Document")}
                value={getFieldValue("file")}
                error={
                  media.selectionError("file") ||
                  errors.errorOf("file", getFieldValue("file"))
                }
                placeholder={t("Add file")}
                onOpen={() => media.openMedia("file")}
                onRemove={() => media.setMediaValue("file", null)}
              />
              <Form.Item
                name="file"
                hidden
                rules={[requiredRule, fileTypeRule("pdf", t)]}>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>
      </Form>
    </Drawer>
  );
}
