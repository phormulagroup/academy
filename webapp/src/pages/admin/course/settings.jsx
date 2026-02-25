import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Radio, Select, Switch, Tabs } from "antd";
import Constructor from "./constructor";
import { useParams } from "react-router-dom";
import Media from "../../../components/media/media";
import { AiOutlineFile, AiOutlinePlus } from "react-icons/ai";
import config from "../../../utils/config";
import { RxTrash } from "react-icons/rx";

import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapFormField from "../../../components/tipTap/tipTapFormField";

export default function Settings({ course }) {
  const { languages } = useContext(Context);
  const [isOpenMedia, setIsOpenMedia] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [mediaKeyInd, setMediaKeyInd] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (course) {
      course.objection = course.objection ? (typeof course.objection === "string" ? JSON.parse(course.objection) : course.objection) : null;
      course.material = course.material ? (typeof course.material === "string" ? JSON.parse(course.material) : course.material) : null;
      course.settings = course.settings ? (typeof course.settings === "string" ? JSON.parse(course.settings) : course.settings) : null;
      form.setFieldsValue(course);
      getCertificates();
    }
  }, [course]);

  function getCertificates() {
    axios
      .get(endpoints.course_certificate.read)
      .then((res) => {
        if (res.data.length > 0) {
          console.log(res.data);
          setCertificates(res.data.filter((c) => c.id_lang === course.id_lang).map((c) => ({ value: c.id, label: c.name })));
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function openMedia(k, i) {
    setMediaKey(k);
    if (i !== null || i !== undefined) setMediaKeyInd(i);
    setIsOpenMedia(true);
  }

  function closeMedia(res) {
    console.log(mediaKeyInd);
    if (res) {
      if (mediaKeyInd !== null) form.setFieldValue([mediaKey, mediaKeyInd, "file"], res[mediaKey]);
      else form.setFieldValue(mediaKey, res[mediaKey]);
    }

    setMediaKey(null);
    setMediaKeyInd(null);
    setIsOpenMedia(false);
  }

  async function save(values) {
    try {
      values.objection = values.objection ? JSON.stringify(values.objection) : null;
      values.material = values.material ? JSON.stringify(values.material) : null;
      values.settings = values.settings ? JSON.stringify(values.settings) : null;
      const res = await axios.post(endpoints.course.update, {
        data: values,
      });

      console.log(res);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="p-2">
      <Media mediaKey={mediaKey} open={isOpenMedia} close={closeMedia} />
      <div>
        <Form form={form} onFinish={save} layout="vertical">
          <Form.Item hidden name="id">
            <Input />
          </Form.Item>
          <p className="text-[18px] font-bold">{t("Information")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls additional information that users will see on course page")}</p>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="pb-[8px]">Duration</p>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name={["settings", "duration_hours"]} className="mb-0!">
                  <InputNumber size="large" suffix="hours" className="w-full!" />
                </Form.Item>
                <Form.Item name={["settings", "duration_minutes"]} className="mb-0!">
                  <InputNumber size="large" suffix="minutes" className="w-full!" />
                </Form.Item>
              </div>
            </div>

            <Form.Item name={["settings", "trainer"]} label={t("Trainer")} className="mb-0!">
              <Select
                size="large"
                className="w-full"
                placeholder="Selecione..."
                allowClear
                showSearch={{
                  optionFilterProp: ["label"],
                }}
                options={[]}
              />
            </Form.Item>

            <Form.Item name={["settings", "video"]} label={t("Video")} className="mb-0!">
              <InputNumber size="large" className="w-full!" />
            </Form.Item>
          </div>

          <Divider />
          <p className="text-[18px] font-bold">{t("Access")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls additional restrictions that enrollees need to meet to access the course")}</p>
          <div className="grid grid-cols-3 gap-8">
            <div className="gap-4 flex flex-col">
              <Form.Item name={["settings", "course_access_expiration"]} label={t("Course access expiration")} valuePropName="checked" className="mb-0!">
                <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.settings?.course_access_expiration !== currentValues.settings?.course_access_expiration}>
                {({ getFieldValue }) =>
                  getFieldValue("settings")?.course_access_expiration ? (
                    <div className="flex flex-col gap-4">
                      <Form.Item name={["settings", "course_access_expiration_dates", "start_date"]} label={t("Start date")} className="mb-0!">
                        <DatePicker showTime size="large" className="w-full" />
                      </Form.Item>
                      <Form.Item name={["settings", "course_access_expiration_dates", "end_date"]} label={t("End date")} className="mb-0!">
                        <DatePicker showTime size="large" className="w-full" />
                      </Form.Item>
                    </div>
                  ) : null
                }
              </Form.Item>
            </div>
            <div className="gap-4 flex flex-col">
              <Form.Item name={["settings", "country_limit"]} label={t("Country limit")} valuePropName="checked" className="mb-0!">
                <Switch size="large" checkedChildren={t("Yes")} unCheckedChildren={t("No")} />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.settings?.country_limit !== currentValues.settings?.country_limit}>
                {({ getFieldValue }) =>
                  getFieldValue("settings")?.country_limit ? (
                    <div className="flex flex-col gap-4">
                      <Form.Item name={["settings", "country"]} label={t("Country")} className="mb-0!">
                        <Select
                          mode="multiple"
                          size="large"
                          className="w-full"
                          placeholder="Selecione..."
                          allowClear
                          showSearch={{
                            optionFilterProp: ["label"],
                          }}
                          options={JSON.parse(languages.filter((l) => l.id === course.id_lang)[0].country).map((item) => ({ value: item, label: item }))}
                        />
                      </Form.Item>
                    </div>
                  ) : null
                }
              </Form.Item>
            </div>
            <Form.Item name={["settings", "student_limit"]} label={t("Student limit")} className="mb-0!">
              <InputNumber size="large" className="w-full!" placeholder="0" />
            </Form.Item>
          </div>

          <Divider />
          <p className="text-[18px] font-bold">{t("Display and content options")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the look and feel of the course and optional content settings")}</p>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.img !== currentValues.img}>
                {({ getFieldValue }) => (
                  <>
                    <p className="pb-2">{t("Banner image")}</p>
                    <div
                      className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                      onClick={() => openMedia("img")}
                      style={{
                        backgroundImage: `url(${config.server_ip}/media/${getFieldValue("img")})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                      }}
                    >
                      {!getFieldValue("img") ? (
                        <div className="flex justify-center items-center flex-col p-10">
                          <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add multimedia")}</p>
                        </div>
                      ) : null}
                    </div>

                    <Form.Item name="img" hidden>
                      <Input />
                    </Form.Item>
                  </>
                )}
              </Form.Item>
            </div>
            <div>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.thumbnail !== currentValues.thumbnail}>
                {({ getFieldValue }) => (
                  <>
                    <p className="pb-2">{t("Thumbnail")}</p>
                    <div
                      className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                      onClick={() => openMedia("thumbnail")}
                      style={{
                        backgroundImage: `url(${config.server_ip}/media/${getFieldValue("thumbnail")})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                      }}
                    >
                      {!getFieldValue("thumbnail") ? (
                        <div className="flex justify-center items-center flex-col p-10">
                          <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add multimedia")}</p>
                        </div>
                      ) : null}
                    </div>

                    <Form.Item name="thumbnail" hidden>
                      <Input />
                    </Form.Item>
                  </>
                )}
              </Form.Item>
            </div>
          </div>
          <p>Materials</p>
          <Form.List name="material">
            {(fields, { add, remove, move }) => (
              <div className="grid grid-cols-4 gap-8 mt-4">
                {fields.map((field) => (
                  <div>
                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.material !== currentValues.material}>
                      {({ getFieldValue }) => {
                        return (
                          <div className="relative">
                            <div
                              className="relative border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                              onClick={() => openMedia("material", field.name)}
                              style={{
                                backgroundSize: "contain",
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "center",
                              }}
                            >
                              {!getFieldValue("material")[field.name]?.file ? (
                                <div className="flex justify-center items-center flex-col p-10">
                                  <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Select file")}</p>
                                </div>
                              ) : (
                                <div className="flex justify-center items-center flex-col p-10">
                                  <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{getFieldValue("material")[field.name]?.file}</p>
                                </div>
                              )}
                            </div>

                            <Form.Item name={[field.name, "file"]} hidden>
                              <Input />
                            </Form.Item>
                            <div className="absolute -top-1.25 right-0 w-5 h-5 z-999">
                              <Button onClick={() => remove(field.name)} icon={<RxTrash />}></Button>
                            </div>
                          </div>
                        );
                      }}
                    </Form.Item>
                  </div>
                ))}

                <div className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden" onClick={() => add()}>
                  <div className="flex justify-center items-center flex-col p-10">
                    <AiOutlinePlus className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add material")}</p>
                  </div>
                </div>
              </div>
            )}
          </Form.List>
          <Divider />
          <p className="text-[18px] font-bold">{t("Navigation")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls how students interact with the content and their navigational experience")}</p>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item name={["settings", "progression_type"]} className="mb-0!">
              <Radio.Group>
                <Radio value="linear" className="mb-4!">
                  <p className="font-bold">{t("Linear")}</p>
                  <p className="text-[12px]">{t("Student must progress through the course in the designated sequence. Linear Progress does not work with Open courses.")}</p>
                </Radio>
                <Radio value="free">
                  <p className="font-bold">{t("Free form")}</p>
                  <p className="text-[12px]">{t("Allows the student to move freely through the course without following the designated step sequence")}</p>
                </Radio>
              </Radio.Group>
            </Form.Item>
          </div>
          <Divider />
          <p className="text-[18px] font-bold">{t("Enrollment")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls how students gain access to the course")}</p>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <Form.Item name={"enrollment"} className="mb-0!">
                <Radio.Group>
                  <Radio value="open" className="mb-4!">
                    <p className="font-bold">{t("Open")}</p>
                    <p className="text-[12px]">{t("The course is not protected. Any student can access its content without the need to be logged-in or enrolled.")}</p>
                  </Radio>
                  <Radio value="free" className="mb-4!">
                    <p className="font-bold">{t("Free")}</p>
                    <p className="text-[12px]">{t("The course is protected. Registration and enrolment are required in order to access the content.")}</p>
                  </Radio>
                  <Radio value="buy_now" className="mb-4!">
                    <p className="font-bold">{t("Buy now")}</p>
                    <p className="text-[12px]">
                      {t("The course is protected via the LearnDash built-in PayPal and/or Stripe. Students need to purchase the course (one-time fee) in order to gain access.")}
                    </p>
                  </Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.enrollment !== currentValues.enrollment}>
                {({ getFieldValue }) =>
                  getFieldValue("enrollment") === "buy_now" && (
                    <div>
                      <Form.Item name={["settings", "course_price"]} label={t("Course price")} className="mb-0! ml-6!">
                        <InputNumber size="large" className="w-full!" placeholder="0" suffix="€" />
                      </Form.Item>
                    </div>
                  )
                }
              </Form.Item>
            </div>
          </div>
          <Divider />
          <p className="text-[18px] font-bold">{t("Completion awards")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the look and feel of the course and optional content settings")}</p>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item name={"id_course_certificate"} label={t("Certificate")} className="mb-0!">
              <Select
                size="large"
                className="w-full"
                placeholder="Selecione..."
                allowClear
                showSearch={{
                  optionFilterProp: ["label"],
                }}
                options={certificates}
              />
            </Form.Item>
          </div>
          <Divider />
          <p className="text-[18px] font-bold mb-4">{t("Objection book")}</p>
          <Form.Item name={["objection", "text"]} className="mb-0!" label={t("Description")}>
            <TiptapFormField placeholder="Escreva o conteúdo..." />
          </Form.Item>
          <div>
            <Form.List name={["objection", "items"]}>
              {(fields, { add, remove, move }) => (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {fields.map((field) => (
                    <div>
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.objection !== currentValues.objection}>
                        {({ getFieldValue }) => {
                          return (
                            <div className="p-6 h-full border border-dashed border-gray-300 mb-6 cursor-pointer flex flex-col justify-center items-center w-full overflow-hidden">
                              <Form.Item name={[field.name, "title"]} className="w-full!" label={t("Title")}>
                                <Input size="large" />
                              </Form.Item>
                              <Form.Item name={[field.name, "text"]} className="w-full!" label={t("Text")}>
                                <Input size="large" />
                              </Form.Item>
                              <div className="absolute -top-1.25 right-0 w-5 h-5 z-999">
                                <Button onClick={() => remove(field.name)} icon={<RxTrash />}></Button>
                              </div>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </div>
                  ))}

                  <div className="border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-full w-full overflow-hidden" onClick={() => add()}>
                    <div className="flex justify-center items-center flex-col p-10">
                      <AiOutlinePlus className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add books")}</p>
                    </div>
                  </div>
                </div>
              )}
            </Form.List>
          </div>
        </Form>
        <Button className="mt-4" size="large" type="primary" onClick={form.submit}>
          Save
        </Button>
      </div>
    </div>
  );
}
