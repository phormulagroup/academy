import { useContext, useEffect, useMemo } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import { Button, DatePicker, Form, InputNumber, Radio, Select, Switch } from "antd";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { LuEye, LuGlobe, LuListChecks, LuLock, LuShuffle, LuTarget } from "react-icons/lu";
import { SettingsSection, SettingsSectionNav } from "../../../../components/admin/settingsSection";
import PageFooter from "../../../../components/admin/pageFooter";

// Secções das definições do teste, pela ordem em que aparecem: alimenta o índice lateral
const SECTIONS = [
  { id: "access", icon: <LuLock />, key: "Access" },
  { id: "countries", icon: <LuGlobe />, key: "Countries" },
  { id: "passing", icon: <LuTarget />, key: "Passing options" },
  { id: "status", icon: <LuEye />, key: "Status" },
  { id: "questions", icon: <LuShuffle />, key: "Question and Answers" },
  { id: "results", icon: <LuListChecks />, key: "Results" },
];

// settings do curso pode vir em string (BD) ou já em objeto
function parseSettings(settings) {
  if (!settings) return {};
  if (typeof settings !== "string") return settings;
  try {
    return JSON.parse(settings) || {};
  } catch {
    return {};
  }
}

export default function Settings({ data, isActive = true }) {
  const { update, t, languages } = useContext(Context);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  let { idTest } = useParams();

  const [form] = Form.useForm();

  // Países que o teste pode limitar: os do limite de países do curso; sem limite no curso, os do idioma do curso
  const countryOptions = useMemo(() => {
    const courseSettings = parseSettings(data?.course_settings);
    const countries =
      courseSettings.country_limit && courseSettings.country?.length
        ? courseSettings.country
        : JSON.parse(languages?.find((l) => l.id === data?.course_id_lang)?.country || "[]");
    return countries.map((item) => ({ value: item, label: t(item) }));
  }, [data, languages, t]);

  useEffect(() => {
    const formValues = {};

    if (data?.settings && Object.keys(data.settings).length > 0) {
      Object.assign(formValues, data.settings);
    }

    if (data?.status) {
      formValues.status = data.status;
    }

    if (Object.keys(formValues).length > 0) {
      form.setFieldsValue(formValues);
    }
    setIsDirty(false);
  }, [data]);

  async function save(values) {
    setIsSaving(true);
    try {
      const { status, ...settings } = values;

      await update({
        table: "test",
        data: {
          status: status,
          settings: JSON.stringify(settings),
          id: idTest,
        },
      });
      setIsDirty(false);
    } catch (err) {
      console.log(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        <SettingsSectionNav items={SECTIONS.map((item) => ({ ...item, label: t(item.key) }))} />
        <div>
          <Form form={form} onFinish={save} layout="vertical" onValuesChange={() => setIsDirty(true)}>
            <SettingsSection id="access" icon={<LuLock />} title={t("Access")} description={t("Controls the acces settings of the test")}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <Form.Item
                  name="start_date"
                  label={t("Start date")}
                  className="mb-0!"
                  getValueProps={(value) => ({ value: value && dayjs(value) })}>
                  <DatePicker format="YYYY-MM-DD HH:mm" showTime size="large" className="w-full" />
                </Form.Item>
                <Form.Item
                  name="end_date"
                  label={t("End date")}
                  className="mb-0!"
                  getValueProps={(value) => ({ value: value && dayjs(value) })}>
                  <DatePicker format="YYYY-MM-DD HH:mm" showTime size="large" className="w-full" />
                </Form.Item>
              </div>
            </SettingsSection>

            {/* Limitar por país (como no curso): os alunos de outros países não recebem o teste */}
            <SettingsSection
              id="countries"
              icon={<LuGlobe />}
              title={t("Countries")}
              description={t("Only students from the selected countries see this test. For the others it does not count for the course progress")}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <Form.Item name="country_limit" label={t("Country limit")} valuePropName="checked" className="mb-0!">
                  <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
                </Form.Item>
                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => prevValues.country_limit !== currentValues.country_limit}>
                  {({ getFieldValue }) =>
                    getFieldValue("country_limit") ? (
                      <Form.Item name="country" label={t("Country")} className="mb-0!">
                        <Select
                          mode="multiple"
                          size="large"
                          className="w-full"
                          placeholder={t("Select...")}
                          allowClear
                          showSearch={{ optionFilterProp: ["label"] }}
                          options={countryOptions}
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </div>
            </SettingsSection>

            <SettingsSection id="passing" icon={<LuTarget />} title={t("Passing options")} description={t("Controls the settings of the test to pass")}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-4">
                <Form.Item name="passing_score" label={t("Passing score")} className="mb-0!">
                  <InputNumber suffix={"%"} size="large" className="w-full!" />
                </Form.Item>
                <Form.Item name="time" label={t("Time limit")} className="mb-0!">
                  <InputNumber size="large" suffix={t("min")} className="w-full!" />
                </Form.Item>
                <Form.Item name="retries_allowed" label={t("Retries allowed")} className="mb-0!">
                  <InputNumber className="w-full!" size="large" />
                </Form.Item>
              </div>
            </SettingsSection>

            <SettingsSection
              id="status"
              icon={<LuEye />}
              title={t("Status")}
              description={t("Controls the status of the test if it will be showed on course page")}>
              <Form.Item name="status" label={t("Status")} className="mb-0!" tooltip={t("A draft test is only visible to administrators")}>
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  size="large"
                  options={[
                    { label: t("Draft"), value: "draft" },
                    { label: t("Published"), value: "published" },
                  ]}
                />
              </Form.Item>
            </SettingsSection>

            <SettingsSection
              id="questions"
              icon={<LuShuffle />}
              title={t("Question and Answers")}
              description={t("Controls the display and position of the questions and answers")}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-4">
                <Form.Item name="randomize_questions" label={t("Randomize Questions")} valuePropName="checked" className="mb-0!">
                  <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
                </Form.Item>
                <Form.Item name="randomize_answers" label={t("Randomize Answers")} valuePropName="checked" className="mb-0!">
                  <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
                </Form.Item>
              </div>
            </SettingsSection>

            <SettingsSection
              id="results"
              icon={<LuListChecks />}
              title={t("Results")}
              description={t("Controls what you wanna show after complete the test")}>
              <Form.Item name="show_correct_answers" label={t("Show correct answers")} valuePropName="checked" className="mb-0!">
                <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
              </Form.Item>
            </SettingsSection>
          </Form>

          {/* Rodapé fixo com o Guardar (components/admin/pageFooter.jsx), como nas definições do curso */}
          <PageFooter active={isActive} className="justify-end px-4 md:px-6">
            {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
            <Button type="primary" loading={isSaving} onClick={form.submit}>
              {t("Save")}
            </Button>
          </PageFooter>
        </div>
      </div>
    </div>
  );
}
