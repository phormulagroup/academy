import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Modal, Select } from "antd";
import countries from "../../../utils/countries.json";

import { Context } from "../../../utils/context";
import Media from "../media/media";
import { useTranslation } from "react-i18next";
import TipTapFormField from "../tipTap/tipTapFormField";
import { AiOutlineFile } from "react-icons/ai";
import config from "../../../utils/config";

export default function CertificateForm({ form, data, submit, preview }) {
  const { create } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    console.log(data);
  }, [data]);

  function openMedia(key) {
    setMediaKey(key);
    setIsOpenMedia(true);
  }

  function closeMedia(res) {
    if (res) {
      form.setFieldValue(mediaKey, res[mediaKey]);
    }

    setMediaKey(null);
    setIsOpenMedia(false);
  }

  return (
    <div className="flex flex-col">
      <Media mediaKey={mediaKey} open={isOpenMedia} close={closeMedia} />
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        validateMessages={{
          required: "Este campo é obrigatório!",
        }}
        onValuesChange={preview}
      >
        <Form.Item name="id" hidden>
          <Input size="large" />
        </Form.Item>
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.background !== currentValues.background}>
          {({ getFieldValue }) => (
            <>
              <p className="pb-2">{t("Background")}</p>
              <div
                className="border border-dashed border-gray-300 rounded-lg mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden bg-contain! bg-center! bg-no-repeat!"
                onClick={() => openMedia("background")}
                style={{ background: `url(${config.server_ip}/media/${getFieldValue("background")})` }}
              >
                {!getFieldValue("background") ? (
                  <div className="flex justify-center items-center flex-col p-10">
                    <AiOutlineFile className="text-[30px]" /> <p className="text-[11px] text-center mt-2">{t("Add multimedia")}</p>
                  </div>
                ) : null}
              </div>

              <Form.Item name="background" hidden>
                <Input />
              </Form.Item>
            </>
          )}
        </Form.Item>
        <Form.Item name={"text"} className="mb-0!" label={t("Text")}>
          <TipTapFormField placeholder="Escreva o conteúdo..." />
        </Form.Item>
      </Form>
    </div>
  );
}
