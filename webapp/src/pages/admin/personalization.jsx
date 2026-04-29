import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Divider, Dropdown, Form, Input, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/language/create";
import Update from "../../components/admin/language/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import Translations from "../../components/admin/language/translations";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import TipTapFormField from "../../components/admin/tipTap/tipTapFormField";

export default function Personalization() {
  const { user, selectedLanguage, update } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [form] = Form.useForm();

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.personalization.readByLang, { params: { id_lang: selectedLanguage.id } })
      .then((res) => {
        setData(res.data.filter((s) => s.name === "homepage_text")[0]);
        if (res.data.filter((s) => s.name === "homepage_text")[0]) form.setFieldsValue(JSON.parse(res.data.filter((s) => s.name === "homepage_text")[0]?.json));
        else form.setFieldsValue({ text: "" });
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await update({ data: { id: data.id, json: JSON.stringify(values) }, table: "personalization" });
      setIsButtonLoading(false);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Personalization")}</p>
        </div>
        <div className="flex justify-center">
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
          <Button size="large" onClick={form.submit} type="primary" className="mr-2" loading={isButtonLoading}>
            {t("Save Changes")}
          </Button>
        </div>
      </div>
      <Form form={form} onFinish={submit} layout="vertical">
        <Divider />
        <p className="text-[18px] font-bold">{t("Homepage Text")}</p>
        <p className="text-[12px] italic mb-4 text-[#666]">{t("Set up the text for the homepage")}</p>
        <div className="flex flex-col gap-6 mb-4">
          <Form.Item name={"text"} className="mb-0!">
            <TipTapFormField />
          </Form.Item>
        </div>
      </Form>
    </div>
  );
}
