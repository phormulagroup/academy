import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Divider, Form, Input, Tabs } from "antd";
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
  const [isOpenMedia, setIsOpenMedia] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [mediaKeyInd, setMediaKeyInd] = useState(null);
  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (course) {
      course.objection = course.objection ? (typeof course.objection === "string" ? JSON.parse(course.objection) : course.objection) : null;
      course.material = course.material ? (typeof course.material === "string" ? JSON.parse(course.material) : course.material) : null;
      form.setFieldsValue(course);
    }
  }, [course]);

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
    console.log(values);
    try {
      values.objection = values.objection ? JSON.stringify(values.objection) : null;
      values.material = values.material ? JSON.stringify(values.material) : null;
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
          <div className="grid grid-cols-2 gap-8">
            <div>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.img !== currentValues.img}>
                {({ getFieldValue }) => (
                  <>
                    <p className="pb-2">{t("Image")}</p>
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
          <Divider />
          <p className="text-[18px] font-bold mb-4">{t("Course material")}</p>
          <div>
            <Form.List name="material">
              {(fields, { add, remove, move }) => (
                <div className="grid grid-cols-4 gap-8 mt-4">
                  {fields.map((field) => (
                    <div>
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.material !== currentValues.material}>
                        {({ getFieldValue }) => {
                          console.log(getFieldValue("material"));
                          return (
                            <div className="relative">
                              <div
                                className="relative border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                                onClick={() => openMedia("material", field.name)}
                                style={{
                                  backgroundImage: `url(${config.server_ip}/media/${getFieldValue("material")[field.name]?.file})`,
                                  backgroundSize: "contain",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                }}
                              >
                                {!getFieldValue("material")[field.name]?.file ? (
                                  <div className="flex justify-center items-center flex-col p-10">
                                    <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Select file")}</p>
                                  </div>
                                ) : null}
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
                      <AiOutlinePlus className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add material")}</p>
                    </div>
                  </div>
                </div>
              )}
            </Form.List>
          </div>
        </Form>
        <Button onClick={form.submit}>Save</Button>
      </div>
    </div>
  );
}
