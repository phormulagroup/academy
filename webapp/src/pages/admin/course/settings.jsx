import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Form, Input, Tabs } from "antd";
import Constructor from "./constructor";
import { useParams } from "react-router-dom";
import Media from "../../../components/media/media";
import { AiOutlineFile } from "react-icons/ai";
import config from "../../../utils/config";

export default function Settings({ course }) {
  const [isOpenMedia, setIsOpenMedia] = useState(false);
  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (course) form.setFieldsValue(course);
  }, [course]);

  function closeMedia(res) {
    if (res) {
      form.setFieldValue("img", res["img"]);
    }

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
      <Media mediaKey={"img"} open={isOpenMedia} close={closeMedia} />
      <div>
        <Form form={form} onFinish={save}>
          <Form.Item hidden name="id">
            <Input />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.img !== currentValues.img}>
            {({ getFieldValue }) => (
              <>
                <p className="pb-2">{t("Image")}</p>
                <div
                  className="border border-dashed border-gray-300 rounded-lg mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden"
                  onClick={() => setIsOpenMedia(true)}
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
        </Form>
        <Button onClick={form.submit}>Save</Button>
      </div>
    </div>
  );
}
