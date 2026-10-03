import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Segmented, Select, Tag } from "antd";
import { LuCopy, LuHouse, LuLanguages, LuMonitor, LuSmartphone } from "react-icons/lu";

import RefreshButton from "../../components/admin/refreshButton";
import RichTextFormField from "../../components/admin/richText/richTextFormField";
import { SettingsSection } from "../../components/admin/settingsSection";
import PageFooter from "../../components/admin/pageFooter";
import { useConfirm } from "../../components/admin/confirmModal";
import { usePermission } from "../../utils/usePermission";
import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import i18n from "../../utils/i18n";

const KEY = "homepage_text";

// O editor guarda "<p><br></p>" quando está vazio: conta como sem texto
const plain = (html) => {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return (el.textContent || "").trim();
};
const textOf = (row) => {
  try {
    return JSON.parse(row?.json || "{}").text || "";
  } catch {
    return "";
  }
};

// Como o texto aparece na página inicial (mesmo estilo da página), em ecrã largo ou pequeno
function HomepagePreview({ html, heading }) {
  const { t } = useContext(Context);
  const [device, setDevice] = useState("desktop");
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="mb-0! text-[12px] font-semibold uppercase tracking-wide text-[#8A8D98]">{t("Preview")}</p>
        <Segmented
          value={device}
          onChange={setDevice}
          options={[
            { value: "desktop", label: <span className="flex items-center gap-1.5 px-2 py-0.5"><LuMonitor />{t("Desktop")}</span> },
            { value: "mobile", label: <span className="flex items-center gap-1.5 px-2 py-0.5"><LuSmartphone />{t("Mobile")}</span> },
          ]}
        />
      </div>
      <div className="rounded-xl bg-[#F1F9FF] p-4">
        <div className={`mx-auto rounded-lg bg-white p-5 shadow-sm ${device === "mobile" ? "max-w-[360px]" : ""}`}>
          <p className={`font-ryker font-bold leading-tight text-[#163986] ${device === "mobile" ? "text-[22px]" : "text-[28px]"}`}>{heading}</p>
          <p className={`font-ryker italic mt-1 text-[#163986] ${device === "mobile" ? "text-base" : "text-lg"}`}>Keeping training in mind</p>
          {plain(html) ? <div className={`homepage_text ${device === "mobile" ? "text-[13px]" : "text-base"}`} style={{ color: "#163986" }} dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-4 mb-0! text-[14px] italic text-[#8A8D98]">{t("The text you write appears here")}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Personalization() {
  const { t, toastApi, selectedLanguage, languages, getPersonalization } = useContext(Context);
  const perm = usePermission("personalization");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState([]); // todas as linhas (todos os idiomas)
  const [isDirty, setIsDirty] = useState(false);
  const [confirm, confirmHolder] = useConfirm();
  const [form] = Form.useForm();
  const html = Form.useWatch("text", form);

  const current = useMemo(() => rows.find((r) => r.name === KEY && r.id_lang === selectedLanguage.id), [rows, selectedLanguage.id]);
  const withText = useMemo(() => new Set(rows.filter((r) => r.name === KEY && plain(textOf(r))).map((r) => r.id_lang)), [rows]);

  useEffect(() => {
    getData();
  }, [selectedLanguage.id]);

  // Aviso do browser ao fechar ou recarregar com texto por guardar
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.personalization.read)
      .then((res) => {
        setRows(res.data);
        const row = res.data.find((r) => r.name === KEY && r.id_lang === selectedLanguage.id);
        form.setFieldsValue({ text: textOf(row) });
        setIsDirty(false);
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Something went wrong, please try again"));
      })
      .finally(() => setIsLoading(false));
  }

  async function submit(values) {
    setIsSaving(true);
    try {
      const json = JSON.stringify({ ...values, text: plain(values.text) ? values.text : "" });
      if (current?.id) await axios.post(endpoints.personalization.update, { data: { id: current.id, json } });
      else await axios.post(endpoints.personalization.create, { data: { json, name: KEY, id_lang: selectedLanguage.id } });
      await getPersonalization(languages);
      toastApi.success(t("Homepage text saved"));
      getData();
    } catch (err) {
      console.log(err);
      toastApi.error(err.response?.data?.message || t("Something went wrong, please try again"));
    } finally {
      setIsSaving(false);
    }
  }

  function copyFrom(idLang) {
    const source = rows.find((r) => r.name === KEY && r.id_lang === idLang);
    const apply = () => {
      form.setFieldsValue({ text: textOf(source) });
      setIsDirty(true);
    };
    if (!plain(form.getFieldValue("text"))) return apply();
    confirm({
      title: t("Replace the current text?"),
      description: t("The text below is replaced by the one from the other language. Nothing is saved until you click Save"),
      tone: "warning",
      okText: t("Replace"),
      onOk: apply,
    });
  }

  const others = (languages || []).filter((l) => l.id !== selectedLanguage.id && !l.is_deleted);
  const heading = i18n.getFixedT(selectedLanguage.code)("About Bial Regional Academy");

  return (
    <div className="p-2">
      {confirmHolder}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Personalization")}</p>
          <p className="mb-0! text-[14px] text-[#8A8D98]">{t("The content of the public pages, for each language")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tag color="blue" className="m-0! inline-flex items-center gap-1.5 px-3 py-1 text-[13px]">
            <LuLanguages />
            {t("Editing")}: <b>{selectedLanguage.name}</b>
          </Tag>
          <RefreshButton size="large" onClick={getData} />
        </div>
      </div>

      {!perm.canUpdate && <Alert type="info" showIcon className="mb-4!" title={t("You do not have permission to edit this content")} />}

      <Form form={form} onFinish={submit} layout="vertical" onValuesChange={() => setIsDirty(true)} disabled={!perm.canUpdate}>
        <SettingsSection icon={<LuHouse />} title={t("Homepage text")} description={t("The text shown on the homepage, next to the login buttons")}>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className={isLoading ? "opacity-60" : ""}>
              <Form.Item name="text" className="mb-4!">
                <RichTextFormField />
              </Form.Item>

              {perm.canUpdate && others.length > 0 && (
                <div className="rounded-xl bg-[#FAFAFB] p-4">
                  <p className="mb-2! flex items-center gap-2 text-[13px] font-semibold text-[#163986]">
                    <LuCopy /> {t("Start from another language")}
                  </p>
                  <Select
                    className="w-full"
                    size="large"
                    placeholder={t("Copy the text from...")}
                    value={null}
                    onChange={copyFrom}
                    options={others.map((l) => ({
                      value: l.id,
                      disabled: !withText.has(l.id),
                      label: (
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            {l.flag && <img src={l.flag} className="max-w-5" />}
                            {l.name}
                          </span>
                          {!withText.has(l.id) && <span className="text-[12px] text-[#8A8D98]">{t("No text yet")}</span>}
                        </span>
                      ),
                    }))}
                  />
                </div>
              )}
            </div>

            <div>
              <HomepagePreview html={html} heading={heading} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon={<LuLanguages />} title={t("Languages")} description={t("Which languages already have a homepage text")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(languages || [])
              .filter((l) => !l.is_deleted)
              .map((l) => {
                const has = l.id === selectedLanguage.id ? !!plain(html) : withText.has(l.id);
                const active = l.id === selectedLanguage.id;
                return (
                  <div key={l.id} className={`flex flex-col items-center gap-1 rounded-xl border border-solid p-4 text-center ${active ? "border-[#163986] bg-[#163986]/5" : "border-[#E5E7EB] bg-white"}`}>
                    {l.flag ? <img src={l.flag} className="h-6 w-9 rounded-sm object-cover shadow-sm" /> : <LuLanguages className="text-[22px] text-[#8A8D98]" />}
                    <p className="mb-0! mt-1 text-[14px] font-semibold">{l.name}</p>
                    <Tag color={has ? "green" : "default"} className="m-0!">
                      {has ? t("With text") : t("No text yet")}
                    </Tag>
                    {active && <span className="text-[11px] text-[#163986]">{t("Editing")}</span>}
                  </div>
                );
              })}
          </div>
          <p className="mb-0! mt-3 text-[12px] text-[#8A8D98]">{t("Without a text, the homepage shows the default welcome message")}</p>
        </SettingsSection>
      </Form>

      {perm.canUpdate && (
        <PageFooter className="justify-end px-4 md:px-6">
          {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
          <Button type="primary" loading={isSaving} disabled={!isDirty} onClick={form.submit}>
            {t("Save")}
          </Button>
        </PageFooter>
      )}
    </div>
  );
}
