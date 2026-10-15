import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { Alert, Button, DatePicker, Drawer, Form, Radio, Select, Tag, Tooltip } from "antd";
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
  // Todos os grupos (para mostrar os já escolhidos) e os que têm membros dos países escolhidos (ou, sem países, dos do idioma)
  const [allGroups, setAllGroups] = useState([]);
  const [countryGroups, setCountryGroups] = useState([]);

  const isEdit = !!data?.id;
  const sent = isEdit && (!!data.sent_at || data.recipients > 0);
  const languageCountries = parseList(selectedLanguage?.country);
  const mode = Form.useWatch("mode", form) ?? "draft";
  const countries = Form.useWatch("country", form) ?? [];
  const groupIds = Form.useWatch("user_groups", { form, preserve: true }) ?? [];
  const groupCountries = countries.length ? countries : languageCountries;
  const groupCountriesKey = groupCountries.join("|");

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      id: data?.id,
      title: data?.title || null,
      description: data?.description || null,
      country: parseList(data?.country),
      // user_groups vem como [{ "id": 1 }, ...] (como course_module.items); o seletor trabalha com os ids
      user_groups: parseList(data?.user_groups).map((g) => Number(g?.id)).filter(Boolean),
      mode: data?.scheduled_at && !sent ? "schedule" : "draft",
      scheduled_at: data?.scheduled_at && !sent ? dayjs(data.scheduled_at) : null,
    });
  }, [open, data?.id]);

  // Quantas pessoas recebem com os países e grupos escolhidos
  useEffect(() => {
    if (!open || !selectedLanguage?.id) return;
    const timer = setTimeout(() => {
      axios
        .post(endpoints.notification.audience, { data: { id_lang: selectedLanguage.id, country: countries, user_groups: groupIds } })
        .then((res) => setAudience({ total: res.data.total, scheduling: res.data.scheduling }))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [open, selectedLanguage?.id, JSON.stringify(countries), JSON.stringify(groupIds)]);

  useEffect(() => {
    if (!open) return;
    axios
      .get(endpoints.userGroup.read, { params: { id_lang: selectedLanguage?.id } })
      .then((res) => {
        setAllGroups(res.data);
        // Só grupos ativos: um grupo entretanto removido (is_deleted = 1) sai do campo
        const active = new Set(res.data.map((g) => g.id));
        form.setFieldValue("user_groups", (form.getFieldValue("user_groups") || []).filter((id) => active.has(id)));
      })
      .catch((err) => console.log(err));
  }, [open]);

  // Grupos com membros dos países escolhidos (sem países, dos países do idioma), com o nº de membros (total e desses países)
  useEffect(() => {
    if (!open || !groupCountriesKey) {
      setCountryGroups([]);
      return;
    }
    let cancelled = false;
    axios
      .get(endpoints.userGroup.read, { params: { countries: groupCountriesKey.split("|"), id_lang: selectedLanguage?.id } })
      .then((res) => !cancelled && setCountryGroups(res.data))
      .catch((err) => console.log(err));
    return () => {
      cancelled = true;
    };
  }, [open, groupCountriesKey]);

  // Opções: os grupos com membros desses países e ainda os já escolhidos que não têm nenhum (ficam assinalados em vez de desaparecerem)
  const groupOptions = useMemo(() => {
    if (!groupCountriesKey) return allGroups.map((g) => ({ value: g.id, label: g.name }));
    const options = countryGroups.map((g) => ({ value: g.id, label: g.name, members: Number(g.members), inCountries: Number(g.members_in_countries) }));
    const listed = new Set(options.map((o) => o.value));
    allGroups.filter((g) => groupIds.includes(g.id) && !listed.has(g.id)).forEach((g) => options.push({ value: g.id, label: g.name, outside: true }));
    return options;
  }, [groupCountriesKey, allGroups, countryGroups, JSON.stringify(groupIds)]);
  const outsideGroupIds = groupOptions.filter((o) => o.outside).map((o) => o.value);
  const groupName = (id) => allGroups.find((g) => g.id === id)?.name;

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
        user_groups: values.user_groups,
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
      <Form form={form} onFinish={submit} layout="vertical" initialValues={{ mode: "draft", country: [], user_groups: [] }}>
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
          groupIds.length > 0 && (
            <Form.Item label={t("User groups")}>
              <p className="mb-0! text-[14px]">{groupIds.map(groupName).filter(Boolean).join(", ")}</p>
            </Form.Item>
          )
        ) : (
            <Form.Item
              name="user_groups"
              label={t("User groups")}
              extra={
                <>
                  <p className="mb-0!">{t("Leave empty to reach everyone, in any group")}</p>
                  {groupIds.length > 0 && <p className="mb-0!">{t("Only members of the selected groups from the selected countries will receive it")}</p>}
                </>
              }>
              <Select
                mode="multiple"
                size="large"
                className="w-full"
                placeholder={t("Select groups...")}
                allowClear
                optionFilterProp="label"
                options={groupOptions}
                optionRender={(option) =>
                  groupCountriesKey && !option.data.outside ? (
                    <div className="flex justify-between gap-3">
                      <span className="truncate">{option.data.label}</span>
                      <span className="text-[12px] text-[#8A8D98] shrink-0">
                        {t("{{count}} of {{total}} members in the selected countries", { count: option.data.inCountries, total: option.data.members })}
                      </span>
                    </div>
                  ) : (
                    option.data.label
                  )
                }
                tagRender={({ value: id, label: tagLabel, closable, onClose }) => {
                  const outside = outsideGroupIds.includes(id);
                  const tag = (
                    <Tag color={outside ? "warning" : undefined} closable={closable} onClose={onClose} onMouseDown={(e) => e.preventDefault()} className="my-0.5! me-1!">
                      {tagLabel}
                    </Tag>
                  );
                  return outside ? <Tooltip title={t("This group has no members from the selected countries: none of its members will receive it")}>{tag}</Tooltip> : tag;
                }}
                notFoundContent={groupCountriesKey ? t("No groups with members from the selected countries") : t("No groups yet. Create them in User groups")}
              />
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
