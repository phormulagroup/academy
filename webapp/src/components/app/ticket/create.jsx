import { useContext, useState } from "react";
import { Button, Form, Input, Modal, Upload } from "antd";
import axios from "axios";
import { PiPaperclip } from "react-icons/pi";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, isEmptyHtml } from "../../../utils/ticket";
import RichTextFormField from "../../admin/richText/richTextFormField";

// Janela para abrir um ticket novo (assunto, mensagem e até 5 anexos)
export default function CreateTicket({ open, close }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    setFileList([]);
    close();
  }

  function submit(values) {
    setIsButtonLoading(true);
    const formData = new FormData();
    fileList.forEach((f) => formData.append("file", f));
    formData.append("data", JSON.stringify({ subject: values.subject, message: values.message }));

    axios
      .post(endpoints.ticket.create, formData)
      .then(() => {
        setIsButtonLoading(false);
        form.resetFields();
        setFileList([]);
        toastApi.success(t("Ticket created successfully."));
        close(true);
      })
      .catch((err) => {
        toastApi.error(err.response?.data?.message || t("Could not create the ticket."));
        setIsButtonLoading(false);
      });
  }

  return (
    <Modal
      width={600}
      onCancel={onClose}
      open={open}
      mask={{ closable: false }}
      footer={[
        <div className="flex justify-end items-center" key="footer">
          <Button className="mr-2" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="primary" loading={isButtonLoading} onClick={form.submit}>
            {t("Send")}
          </Button>
        </div>,
      ]}
      title={t("New ticket")}>
      <Form
        form={form}
        onFinish={submit}
        onFinishFailed={() => toastApi.error(t("Fill in the highlighted fields correctly."))}
        layout="vertical"
        validateTrigger="onSubmit"
        validateMessages={{ required: t("This field is required!") }}>
        <Form.Item name="subject" label={t("Subject")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="message"
          label={t("Message")}
          rules={[{ validator: (_, value) => (isEmptyHtml(value) ? Promise.reject(new Error(t("This field is required!"))) : Promise.resolve()) }]}>
          <RichTextFormField placeholder={t("Describe your question...")} />
        </Form.Item>
        <Upload
          multiple
          maxCount={5}
          accept={ATTACHMENT_ACCEPT}
          fileList={fileList.map((f, i) => ({ uid: String(i), name: f.name, status: "done" }))}
          beforeUpload={(file) => {
            if (file.size > MAX_ATTACHMENT_BYTES) {
              toastApi.error(t("\"{{name}}\" is too large. The maximum size is 2MB.", { name: file.name }));
              return Upload.LIST_IGNORE;
            }
            setFileList((prev) => [...prev, file]);
            return false;
          }}
          onRemove={(file) => setFileList((prev) => prev.filter((_, i) => String(i) !== file.uid))}>
          <Button icon={<PiPaperclip />}>{t("Attach files")}</Button>
        </Upload>
        <div className="text-xs text-gray-500 mt-1">{t("Accepted formats: PDF, PNG, JPG, GIF and WEBP (max. 2MB per file)")}</div>
      </Form>
    </Modal>
  );
}
