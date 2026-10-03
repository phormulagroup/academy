import { useContext, useEffect, useState } from "react";
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

export default function Update({ data, open, close, nameRule }) {
  const { update, selectedLanguage, languages } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();
  const name = Form.useWatch("name", form);
  const media = useMediaPicker(form, FIELD_TYPES, t);
  const errors = useFormErrors(form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(data);
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
      await update({ data: values, table: "document" });
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
      title={`${t("Update document")}`}
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
        mediaKey={media.mediaKey} fileType={media.fileType}
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
        <Form.Item
          name="name"
          {...errors.labelErrorProps("name", name, t("Name"))}
          rules={[requiredRule, nameRule(data?.id)]}>
          <Input size="large" placeholder={t("Document name")} />
        </Form.Item>
        <Form.Item name="country" label={t("Country")}>
          <Select
            mode="multiple"
            size="large"
            placeholder={t("Country...")}
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
                validateTrigger="onChange"
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
                validateTrigger="onChange"
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
