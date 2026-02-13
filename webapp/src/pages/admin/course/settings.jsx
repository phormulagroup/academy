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
    if (course) form.setFieldsValue(course);
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
    try {
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
          <p>{t("Course materials")}</p>
          <div>
            <Form.List name="materials">
              {(fields, { add, remove, move }) => (
                <div className="grid grid-cols-4 gap-8 mt-4">
                  {fields.map((field) => (
                    <div>
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.materials !== currentValues.materials}>
                        {({ getFieldValue }) => {
                          console.log(getFieldValue("materials"));
                          return (
                            <div className="relative">
                              <div
                                className="relative border border-dashed border-gray-300 mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                                onClick={() => openMedia("materials", field.name)}
                                style={{
                                  backgroundImage: `url(${config.server_ip}/media/${getFieldValue("materials")[field.name]?.file})`,
                                  backgroundSize: "contain",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                }}
                              >
                                {!getFieldValue("materials")[field.name]?.file ? (
                                  <div className="flex justify-center items-center flex-col p-10">
                                    <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Select file")}</p>
                                  </div>
                                ) : null}
                              </div>

                              <Form.Item name={[field.name, "file"]} hidden>
                                <Input />
                              </Form.Item>
                              <div className="absolute top-[-5px] right-0 w-[20px] h-[20px] z-999">
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
          <p>{t("Objection book")}</p>
          <Form.Item
            name={"content"}
            className="mb-0!"
            label={t("Description")}
            ules={[
              { required: true, message: "Conteúdo é obrigatório" },
              {
                validator: (_, html) => {
                  const text = (html || "").replace(/<[^>]*>/g, "").trim();
                  return text ? Promise.resolve() : Promise.reject("Escreva algo no conteúdo");
                },
              },
            ]}
            normalize={(html) => html || "<p></p>"}
          >
            {/* O AntD injeta value/onChange no filho */}
            <TiptapFormField placeholder="Escreva o conteúdo..." />
          </Form.Item>
          <div>
            <Form.Item name={["objection", "text"]} hidden>
              <Input />
            </Form.Item>
            <Form.List name={["objection", "items"]}>
              {(fields, { add, remove, move }) => (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {fields.map((field) => (
                    <div>
                      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.objection !== currentValues.objection}>
                        {({ getFieldValue }) => {
                          console.log(getFieldValue("objection"));
                          const editor = useEditor({ extensions: [TextStyleKit, StarterKit], content: getFieldValue(["objection", "items", field.name, "description"]) });
                          return (
                            <div className="p-6 h-full border border-dashed border-gray-300 mb-6 cursor-pointer flex flex-col justify-center items-center w-full overflow-hidden">
                              <Form.Item name={[field.name, "title"]} className="w-full!" label={t("Title")}>
                                <Input size="large" />
                              </Form.Item>
                              <div className="absolute top-[-5px] right-0 w-[20px] h-[20px] z-999">
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
