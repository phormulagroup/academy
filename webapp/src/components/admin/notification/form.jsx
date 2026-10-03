import { useContext, useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { Alert, Button, DatePicker, Drawer, Form, Radio } from "antd";
import { LuClock, LuSend } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { requiredRichTextRule } from "../../../utils/formFieldError";
import { toastRef } from "../../../utils/notify";
import RichTextFormField from "../richText/richTextFormField";
import CountriesPicker from "../language/countriesPicker";
import { useConfirm } from "../confirmModal";

const parseList = (value) => {
  try {
    const list = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

// Criar ou editar uma notificação (data = linha para editar, vazio para criar): mensagem, público e quando sai
// (guardar como rascunho, enviar já ou agendar). Depois de enviada só o texto se pode corrigir.
export default function NotificationForm({ data, open, close }) {
  const { selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [confirm, confirmHolder] = useConfirm();
  const [isSaving, setIsSaving] = useState(false);
  const [audience, setAudience] = useState({ total: null, scheduling: true });

  const isEdit = !!data?.id;
  const sent = isEdit && (!!data.sent_at || data.recipients > 0);
  const languageCountries = parseList(selectedLanguage?.country);
  const mode = Form.useWatch("mode", form) ?? "draft";
  const countries = Form.useWatch("country", form) ?? [];

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      id: data?.id,
      title: data?.title || null,
      description: data?.description || null,
      country: parseList(data?.country),
      mode: data?.scheduled_at && !sent ? "schedule" : "draft",
      scheduled_at: data?.scheduled_at && !sent ? dayjs(data.scheduled_at) : null,
    });
  }, [open, data?.id]);

  // Quantas pessoas recebem com os países escolhidos
  useEffect(() => {
    if (!open || !selectedLanguage?.id) return;
    const timer = setTimeout(() => {
      axios
        .post(endpoints.notification.audience, { data: { id_lang: selectedLanguage.id, country: countries } })
        .then((res) => setAudience({ total: res.data.total, scheduling: res.data.scheduling }))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [open, selectedLanguage?.id, JSON.stringify(countries)]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function save(values) {
    setIsSaving(true);
    try {
      const payload = {
        id: values.id,
        title: values.title,
        description: values.description,
        id_lang: data?.id_lang ?? selectedLanguage.id,
        country: values.country,
        mode: sent ? "draft" : values.mode,
        scheduled_at: values.mode === "schedule" && values.scheduled_at ? values.scheduled_at.toISOString() : null,
      };
      await axios.post(isEdit ? endpoints.notification.update : endpoints.notification.create, { data: payload });
      toastRef.current?.success(payload.mode === "now" ? t("Notification sent successfully") : payload.mode === "schedule" ? t("Notification scheduled for {{date}}", { date: values.scheduled_at.format("DD/MM/YYYY HH:mm") }) : t("Notification saved"));
      form.resetFields();
      close(true);
    } catch (err) {
      toastRef.current?.error(err.response?.data?.message || t("Something went wrong, please try again"));
    } finally {
      setIsSaving(false);
    }
  }

  function submit(values) {
    if (!sent && values.mode === "now") {
      return confirm({
        title: t("Send this notification now?"),
        description: t("It reaches {{count}} people right away. This cannot be undone", { count: audience.total ?? 0 }),
        tone: "warning",
        icon: <LuSend />,
        okText: t("Send now"),
        onOk: () => save(values),
      });
    }
    return save(values);
  }

  const actionLabel = sent || mode === "draft" ? t("Save") : mode === "now" ? t("Send now") : t("Schedule");

  return (
    <Drawer
      open={open}
      size={820}
      onClose={onClose}
      maskClosable={false}
      title={isEdit ? t("Edit notification") : t("Add notification")}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button type="primary" loading={isSaving} icon={!sent && mode === "now" ? <LuSend /> : !sent && mode === "schedule" ? <LuClock /> : undefined} onClick={form.submit}>
            {actionLabel}
          </Button>
        </div>
      }>
      {confirmHolder}
      <Form form={form} onFinish={submit} layout="vertical" initialValues={{ mode: "draft", country: [] }}>
        <Form.Item name="id" hidden>
          <input />
        </Form.Item>

        <Form.Item name="title" label={t("Title")} rules={[requiredRichTextRule]}>
          <RichTextFormField />
        </Form.Item>
        <Form.Item name="description" label={t("Description")} rules={[requiredRichTextRule]}>
          <RichTextFormField />
        </Form.Item>

        {sent ? (
          <Form.Item label={t("Countries")}>
            <p className="mb-0! text-[14px]">{countries.length ? countries.map((c) => t(c)).join(", ") : t("All countries")}</p>
          </Form.Item>
        ) : (
          <Form.Item name="country" label={t("Countries")} extra={audience.total === null ? t("Leave empty to reach every country of this language") : `${t("Leave empty to reach every country of this language")} · ${t("{{count}} people will receive it", { count: audience.total })}`}>
            <CountriesPicker options={languageCountries} maxHeight="max-h-52" />
          </Form.Item>
        )}

        {sent ? (
          <Alert
            type="success"
            showIcon
            title={t("Sent on {{date}} to {{count}} people", { date: dayjs(data.sent_at || data.created_at).format("DD/MM/YYYY HH:mm"), count: data.recipients })}
            description={t("The audience and the language can no longer change; you can still correct the text")}
          />
        ) : (
          <>
            <Form.Item name="mode" label={t("Delivery")}>
              <Radio.Group optionType="button" buttonStyle="solid">
                <Radio.Button value="draft">{t("Save as draft")}</Radio.Button>
                <Radio.Button value="now">{t("Send now")}</Radio.Button>
                {audience.scheduling && <Radio.Button value="schedule">{t("Schedule")}</Radio.Button>}
              </Radio.Group>
            </Form.Item>
            {mode === "schedule" && (
              <Form.Item name="scheduled_at" label={t("Send on")} rules={[{ required: true, message: t("Choose when to send") }]}>
                <DatePicker showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" size="large" className="w-full sm:w-72" disabledDate={(d) => d && d.isBefore(dayjs(), "day")} placeholder={t("Select date and time")} />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Drawer>
  );
}
