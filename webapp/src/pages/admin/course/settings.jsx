import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";
import { cleanMaterials } from "../../../utils/materials";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
  Tabs,
} from "antd";
import Media from "../../../components/admin/media/media";
import MediaField from "../../../utils/mediaField";
import useMediaPicker from "../../../utils/useMediaPicker";
import { fileTypeRule } from "../../../utils/fileValidation";
import { requiredRule, uniqueRule } from "../../../utils/formFieldError";
import { AiOutlinePlus } from "react-icons/ai";
import { LuAward, LuBookOpen, LuClock, LuImage, LuLock, LuPill, LuRoute, LuSettings } from "react-icons/lu";
import { SettingsSection, SettingsSectionNav } from "../../../components/admin/settingsSection";
import PageFooter from "../../../components/admin/pageFooter";
import { RxTrash } from "react-icons/rx";

import RichTextFormField from "../../../components/admin/richText/richTextFormField";
import dayjs from "dayjs";

// Secções do separador, pela ordem em que aparecem: alimenta o índice lateral
const SECTIONS = [
  { id: "general", icon: <LuSettings />, key: "General" },
  { id: "duration", icon: <LuClock />, key: "Course dates" },
  { id: "product", icon: <LuPill />, key: "Product" },
  { id: "access", icon: <LuLock />, key: "Access" },
  { id: "display", icon: <LuImage />, key: "Content" },
  { id: "navigation", icon: <LuRoute />, key: "Navigation" },
  { id: "awards", icon: <LuAward />, key: "Completion awards" },
  { id: "objection", icon: <LuBookOpen />, key: "Objection book" },
];

export default function Settings({ course, isActive = true, onSaved }) {
  const { languages, createLog, user, selectedLanguage, toastApi } =
    useContext(Context);
  const [products, setProducts] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [activeKey, setActiveKey] = useState("0");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Utilizadores e grupos com acesso (tabelas à parte, não fazem parte do curso): guardam-se depois de o curso
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [accessUserIds, setAccessUserIds] = useState([]);
  const [accessGroupIds, setAccessGroupIds] = useState([]);
  // Se os acessos atuais não carregaram, não se guardam (senão apagavam-se os que já existem)
  const [accessLoaded, setAccessLoaded] = useState(false);
  // Cursos do mesmo idioma: o nome e o nome interno não se podem repetir
  const [languageCourses, setLanguageCourses] = useState([]);
  const [form] = Form.useForm();

  const { t } = useTranslation();
  // Banner image e Thumbnail só aceitam imagens; os materiais aceitam qualquer ficheiro
  const media = useMediaPicker(form, { img: "image", thumbnail: "image" }, t);

  useEffect(() => {
    if (course) {
      course.objection = course.objection
        ? typeof course.objection === "string"
          ? JSON.parse(course.objection)
          : course.objection
        : null;
      course.material = course.material
        ? typeof course.material === "string"
          ? JSON.parse(course.material)
          : course.material
        : null;
      course.settings = course.settings
        ? typeof course.settings === "string"
          ? JSON.parse(course.settings)
          : course.settings
        : null;
      form.setFieldsValue(course);

      getProducts();
      getCertificates();
      getAccess();
    }
  }, [course]);

  // Utilizadores e grupos disponíveis e os que já têm acesso a este curso
  function getAccess() {
    setAccessLoaded(false);
    Promise.all([
      axios.get(endpoints.user.read),
      axios.get(endpoints.userGroup.read),
      axios.get(endpoints.course.accessUsers, { params: { id_course: course.id } }),
      axios.get(endpoints.course.accessGroups, { params: { id_course: course.id } }),
      axios.get(endpoints.course.read),
    ])
      .then(([users, groups, accessUsers, accessGroups, courses]) => {
        setLanguageCourses(courses.data.courses.filter((c) => c.id_lang === course.id_lang));
        setAllUsers(users.data.filter((u) => !u.is_deleted && u.id_role !== 1));
        setAllGroups(groups.data);
        setAccessUserIds(accessUsers.data.map((u) => u.id));
        setAccessGroupIds(accessGroups.data.map((g) => g.id));
        setAccessLoaded(true);
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: t("Failed to load the users and groups with access to this course") });
      });
  }

  // Function to get products from the API and set them in the state
  function getProducts() {
    axios
      .get(endpoints.product.read)
      .then((res) => {
        if (res.data.length > 0) {
          setProducts(
            res.data
              .filter((p) => p.is_deleted === 0)
              .map((p) => ({ value: p.id, label: p.name })),
          );
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function getCertificates() {
    axios
      .get(endpoints.course_certificate.read)
      .then((res) => {
        if (res.data.length > 0) {
          setCertificates(
            res.data
              .filter((c) => c.is_deleted === 0 && c.id_lang === course.id_lang)
              .map((c) => ({ value: c.id, label: c.name })),
          );
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Banner image e Thumbnail: imagens opcionais
  function renderImageField(key, label) {
    return (
      <div>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues[key] !== currentValues[key]
          }>
          {({ getFieldValue, getFieldError }) => (
            <>
              <MediaField
                label={label}
                value={getFieldValue(key)}
                error={media.selectionError(key) || getFieldError(key)[0]}
                placeholder={t("Add multimedia")}
                onOpen={() => media.openMedia(key)}
                onRemove={() => media.setMediaValue(key, null)}
              />
              <Form.Item name={key} hidden rules={[fileTypeRule("image", t)]}>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>
      </div>
    );
  }

  async function save(values) {
    setIsSaving(true);
    try {
      values.objection = values.objection
        ? JSON.stringify(values.objection)
        : null;
      // A key "country" do material só é guardada quando tem países selecionados
      values.material = values.material
        ? JSON.stringify(cleanMaterials(values.material))
        : null;
      // As datas de início e de fim são opcionais: o curso só tem janela de acesso se houver pelo menos uma
      if (values.settings) {
        const dates = values.settings.course_access_expiration_dates || {};
        values.settings.course_access_expiration = !!(dates.start_date || dates.end_date);
      }
      const restrictToPeople = !!values.settings?.restrict_to_users;
      values.settings = values.settings
        ? JSON.stringify(values.settings)
        : null;
      const res = await axios.post(endpoints.course.update, {
        data: values,
      });

      // Utilizadores e grupos com acesso (só se a lista atual carregou, para não apagar o que já existe)
      if (accessLoaded) {
        await axios.post(endpoints.course.setAccessUsers, { data: { id_course: course.id, id_users: accessUserIds } });
        await axios.post(endpoints.course.setAccessGroups, { data: { id_course: course.id, id_groups: accessGroupIds } });
      }
      if (restrictToPeople && accessLoaded && accessUserIds.length === 0 && accessGroupIds.length === 0) {
        toastApi.open({ type: "warning", content: t("The course is limited to users and groups, but none was selected: only administrators can access it") });
      }

      await createLog({
        id_user: user.id,
        action: "update",
        table_name: "course",
        meta_data: JSON.stringify(values),
        id_lang: selectedLanguage.id,
      });

      console.log(res);
      setIsDirty(false);
      onSaved?.({ name: values.name, internal_name: values.internal_name, status: values.status });
      toastApi.open({
        type: "success",
        content: t("Course settings updated successfully"),
      });
    } catch (err) {
      console.log(err);
      toastApi.open({
        type: "error",
        content: err.response?.status === 409 ? t("A course with this address already exists") : t("Failed to update course settings"),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Media
        mediaKey={media.mediaKey}
        open={media.isOpenMedia}
        close={media.closeMedia}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        <SettingsSectionNav items={SECTIONS.map((item) => ({ ...item, label: t(item.key) }))} />
        <div>
        <Form form={form} onFinish={save} layout="vertical" onValuesChange={() => setIsDirty(true)}>
          <Form.Item hidden name="id">
            <Input />
          </Form.Item>

          {/* Identificação e estado do curso (o endereço do curso é gerado a partir do nome) */}
          <SettingsSection
            id="general"
            icon={<LuSettings />}
            title={t("General")}
            description={t("Course identification and status")}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
              <Form.Item
                name="name"
                label={t("Course name")}
                className="mb-0!"
                tooltip={t("The name that students see")}
                rules={[requiredRule, uniqueRule(languageCourses, t("A course with this name already exists"), { excludeId: course?.id })]}>
                <Input size="large" placeholder={t("Enter course name")} />
              </Form.Item>
              <Form.Item
                name="internal_name"
                label={t("Internal name")}
                className="mb-0!"
                tooltip={t("Only the team sees it: used in the dashboard lists and reports")}
                rules={[
                  requiredRule,
                  uniqueRule(languageCourses, t("A course with this internal name already exists"), { field: "internal_name", excludeId: course?.id }),
                ]}>
                <Input size="large" placeholder={t("Enter internal course name")} />
              </Form.Item>
              <Form.Item
                name="slug"
                label={t("Address (slug)")}
                className="mb-0! lg:col-span-2"
                extra={t("Part of the course public link (/courses/...). Changing it changes the link: links already shared stop working")}
                rules={[
                  requiredRule,
                  { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: t("Only lowercase letters, numbers and hyphens (e.g. course-name)") },
                  uniqueRule(languageCourses, t("A course with this address already exists"), { field: "slug", excludeId: course?.id }),
                ]}>
                <Input size="large" placeholder={t("course-name")} />
              </Form.Item>
              <Form.Item
                name="status"
                label={t("Status")}
                className="mb-0!"
                tooltip={t("A draft course is not visible to students")}>
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
            </div>
          </SettingsSection>

          <SettingsSection
            id="duration"
            icon={<LuClock />}
            title={t("Course dates")}
            description={t("When the course opens and closes (optional)")}>
          {/* Datas de início e de fim do curso: opcionais. Sem datas, o curso está sempre disponível; com uma só,
              só se limita esse lado (só início = abre nessa data; só fim = fecha nessa data). */}
          <p className="text-[12px] text-[#8A8D98] mb-3!">
            {t("Leave empty for no limit. Outside these dates, students cannot access the course")}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            <Form.Item
              name={["settings", "course_access_expiration_dates", "start_date"]}
              label={t("Start date")}
              className="mb-0!"
              getValueProps={(value) => ({ value: value ? dayjs(value) : null })}>
              <DatePicker showTime size="large" className="w-full" allowClear placeholder={t("Select date")} />
            </Form.Item>
            <Form.Item
              name={["settings", "course_access_expiration_dates", "end_date"]}
              label={t("End date")}
              className="mb-0!"
              dependencies={[["settings", "course_access_expiration_dates", "start_date"]]}
              getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue(["settings", "course_access_expiration_dates", "start_date"]);
                    if (!value || !start || dayjs(value).isAfter(dayjs(start))) return Promise.resolve();
                    return Promise.reject(new Error(t("The end date must be after the start date")));
                  },
                }),
              ]}>
              <DatePicker showTime size="large" className="w-full" allowClear placeholder={t("Select date")} />
            </Form.Item>
          </div>
          </SettingsSection>

          <SettingsSection id="product" icon={<LuPill />} title={t("Product")} description={t("Change the product associated with this course")}>

          {/* Select Product */}
          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name={"id_product"}
              label={t("Product")}
              className="mb-0!">
              <Select
                size="large"
                className="w-full"
                placeholder={t("Select...")}
                allowClear
                showSearch={{
                  optionFilterProp: ["label"],
                }}
                options={products}
              />
            </Form.Item>
          </div>

          </SettingsSection>

          <SettingsSection
            id="access"
            icon={<LuLock />}
            title={t("Access")}
            description={t("Who can access the course. When more than one limit is active, the person has to meet all of them")}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
            {/* Limitar por país */}
            <div className="gap-4 flex flex-col">
              <Form.Item
                name={["settings", "country_limit"]}
                label={t("Country limit")}
                valuePropName="checked"
                className="mb-0!">
                <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.settings?.country_limit !== currentValues.settings?.country_limit
                }>
                {({ getFieldValue }) =>
                  getFieldValue("settings")?.country_limit ? (
                    <Form.Item name={["settings", "country"]} label={t("Country")} className="mb-0!">
                      <Select
                        mode="multiple"
                        size="large"
                        className="w-full"
                        placeholder={t("Select...")}
                        allowClear
                        showSearch={{ optionFilterProp: ["label"] }}
                        options={JSON.parse(
                          languages.filter((l) => l.id === course.id_lang)[0]?.country || "[]",
                        ).map((item) => ({ value: item, label: t(item) }))}
                      />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </div>

            {/* Limitar a utilizadores e grupos de utilizadores */}
            <div className="gap-4 flex flex-col">
              <Form.Item
                name={["settings", "restrict_to_users"]}
                label={t("Limit to users and groups")}
                valuePropName="checked"
                className="mb-0!">
                <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.settings?.restrict_to_users !== currentValues.settings?.restrict_to_users
                }>
                {({ getFieldValue }) =>
                  getFieldValue("settings")?.restrict_to_users ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="pb-2">{t("Users")}</p>
                        <Select
                          mode="multiple"
                          size="large"
                          className="w-full"
                          placeholder={t("Select users...")}
                          allowClear
                          optionFilterProp="label"
                          value={accessUserIds}
                          onChange={(ids) => {
                            setAccessUserIds(ids);
                            setIsDirty(true);
                          }}
                          options={allUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                        />
                      </div>
                      <div>
                        <p className="pb-2">{t("User groups")}</p>
                        <Select
                          mode="multiple"
                          size="large"
                          className="w-full"
                          placeholder={t("Select groups...")}
                          allowClear
                          optionFilterProp="label"
                          value={accessGroupIds}
                          onChange={(ids) => {
                            setAccessGroupIds(ids);
                            setIsDirty(true);
                          }}
                          options={allGroups.map((g) => ({ value: g.id, label: g.name }))}
                          notFoundContent={t("No groups yet. Create them in User groups")}
                        />
                      </div>
                      <p className="text-[12px] text-[#8A8D98] mb-0!">
                        {t("Only the selected users and the members of the selected groups can access this course")}
                      </p>
                    </div>
                  ) : null
                }
              </Form.Item>
            </div>
          </div>
          </SettingsSection>

          <SettingsSection id="display" icon={<LuImage />} title={t("Display and content options")} description={t("Controls the look and feel of the course and optional content settings")}>

          <div className="grid grid-cols-2 gap-8">
            {renderImageField("img", t("Banner image"))}
            {renderImageField("thumbnail", t("Thumbnail"))}
          </div>
          <p>{t("Materials")}</p>
          <Form.List name="material">
            {(fields, { add, remove }) => (
              <div className="grid grid-cols-4 gap-8 mt-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) =>
                        prevValues.material !== currentValues.material
                      }>
                      {({ getFieldValue }) => {
                        const path = ["material", field.name, "file"];
                        return (
                          <>
                            {/* o botão remove o material inteiro (ficheiro + nome) */}
                            <MediaField
                              type="file"
                              value={getFieldValue(path)}
                              error={media.selectionError(path)}
                              placeholder={t("Select file")}
                              onOpen={() =>
                                media.openMedia("material", field.name, "file")
                              }
                              onRemove={() => remove(field.name)}
                              alwaysRemovable
                            />
                            <Form.Item name={[field.name, "file"]} hidden>
                              <Input />
                            </Form.Item>
                          </>
                        );
                      }}
                    </Form.Item>
                    <Form.Item name={[field.name, "name"]}>
                      <Input size="large" placeholder={t("File name")} />
                    </Form.Item>
                    {/* Restrição de países do material (vazio = sem restrição); mesmos países do limite de país */}
                    <Form.Item name={[field.name, "country"]} className="-mt-2!">
                      <Select
                        mode="multiple"
                        size="large"
                        className="w-full"
                        placeholder={t("No country restriction")}
                        allowClear
                        showSearch={{ optionFilterProp: ["label"] }}
                        options={JSON.parse(
                          languages.filter((l) => l.id === course.id_lang)[0]
                            ?.country || "[]",
                        ).map((item) => ({ value: item, label: t(item) }))}
                      />
                    </Form.Item>
                  </div>
                ))}

                <div
                  className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                  onClick={() => add()}>
                  <div className="flex justify-center items-center flex-col p-10">
                    <AiOutlinePlus className="text-[30px]" />{" "}
                    <p className="text-[11px] text-center mt-2">
                      {t("Add material")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Form.List>
          </SettingsSection>

          <SettingsSection id="navigation" icon={<LuRoute />} title={t("Navigation")} description={t("Controls how students interact with the content and their navigational experience")}>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name={["settings", "progression_type"]}
              className="mb-0!">
              <Radio.Group>
                <Radio value="linear" className="mb-4!">
                  <p className="font-bold">{t("Linear")}</p>
                  <p className="text-[12px]">
                    {t(
                      "Student must progress through the course in the designated sequence. Linear Progress does not work with Open courses.",
                    )}
                  </p>
                </Radio>
                <Radio value="free">
                  <p className="font-bold">{t("Free form")}</p>
                  <p className="text-[12px]">
                    {t(
                      "Allows the student to move freely through the course without following the designated step sequence",
                    )}
                  </p>
                </Radio>
              </Radio.Group>
            </Form.Item>
          </div>
          </SettingsSection>


          <SettingsSection id="awards" icon={<LuAward />} title={t("Completion awards")} description={t("Controls the look and feel of the course and optional content settings")}>

          {/* Select certificated */}
          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name={"id_course_certificate"}
              label={t("Certificate")}
              className="mb-0!">
              <Select
                size="large"
                className="w-full"
                placeholder={t("Select...")}
                allowClear
                showSearch={{
                  optionFilterProp: ["label"],
                }}
                options={certificates}
              />
            </Form.Item>
          </div>

          </SettingsSection>

          <SettingsSection id="objection" icon={<LuBookOpen />} title={t("Objection book")}>
          <Form.Item
            name={["objection", "text"]}
            className="mb-0!"
            label={t("Description")}>
            <RichTextFormField placeholder={t("Write the content...")} richMedia />
          </Form.Item>
          <div className="mt-4">
            <Form.List name={["objection", "tabs"]}>
              {(fields, { add, remove }) => {
                const items = fields.map((field) => ({
                  key: field.name.toString(),
                  label: (
                    <div className="flex justify-center items-center">
                      {t("Objection no.")} {(field.name + 1).toString()}{" "}
                      <RxTrash
                        className="ml-2"
                        onClick={() => {
                          remove(field.name);
                          fields.splice(field.name, 1);
                          console.log(fields);
                        }}
                      />
                    </div>
                  ),
                  forceRender: true,
                  children: (
                    <Card>
                      {/* Form List interno */}
                      <Form.Item name={[field.name, "label"]} label={t("Label")}>
                        <Input size="large" />
                      </Form.Item>
                      <Form.List name={[field.name, "items"]}>
                        {(subFields, subOps) => (
                          <>
                            {subFields.map((sub) => (
                              <div className="p-6 h-full border border-dashed border-gray-300 mb-6 cursor-pointer flex flex-col justify-center items-center w-full overflow-hidden">
                                <Form.Item
                                  name={[sub.name, "title"]}
                                  className="w-full!"
                                  label={t("Title")}>
                                  <Input size="large" />
                                </Form.Item>
                                <Form.Item
                                  name={[sub.name, "text"]}
                                  className="w-full!"
                                  label={t("Text")}>
                                  <RichTextFormField placeholder={t("Write the content...")} richMedia />
                                </Form.Item>
                                <div className="absolute -top-1.25 right-0 w-5 h-5 z-999">
                                  <Button
                                    onClick={() => subOps.remove(field.name)}
                                    icon={<RxTrash />}></Button>
                                </div>
                              </div>
                            ))}

                            <div
                              className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-full w-full overflow-hidden"
                              onClick={() => subOps.add()}>
                              <div className="flex justify-center items-center flex-col p-10">
                                <AiOutlinePlus className="text-[30px]" />{" "}
                                <p className="text-[11px] text-center mt-2">
                                  {t("Add objection")}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </Form.List>
                    </Card>
                  ),
                }));

                return (
                  <Tabs
                    type="editable-card"
                    activeKey={activeKey}
                    items={items}
                    onChange={(key) => setActiveKey(key)}
                    onEdit={(target, action) => {
                      console.log(target);
                      console.log(action);
                      if (action === "add") {
                        const newIndex = fields.length;
                        add({ label: `Tab ${newIndex + 1}`, items: [] });
                        setActiveKey(String(newIndex));
                      } else if (action === "remove") {
                        remove(parseInt(target));
                        items.splice(parseInt(target), 1);
                      }
                    }}
                    addIcon={
                      <div className="p-4 flex gap-2 justify-center items-center">
                        <AiOutlinePlus />
                        {t("Add objection book")}
                      </div>
                    }
                  />
                );
              }}
            </Form.List>
          </div>
          </SettingsSection>
        </Form>

        {/* Rodapé fixo com o Guardar (components/admin/pageFooter.jsx), por baixo da área com scroll. O padding lateral
            alinha o botão com a borda direita dos cartões das secções. */}
        <PageFooter active={isActive} className="justify-end px-12 md:px-14">
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
