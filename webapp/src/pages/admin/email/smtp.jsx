import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Form, Input } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/table";
import Create from "../../../components/language/create";
import Update from "../../../components/language/update";
import Delete from "../../../components/delete";
import Logs from "../../../components/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import Translations from "../../../components/language/translations";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";

export default function SMTP() {
  const { user } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.settings.read)
      .then((res) => {
        console.log(res);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function submit(values) {
    console.log(values);
  }

  function sendTestEmail() {
    console.log(form.getFieldsValue());
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("SMTP")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} />
        </div>
      </div>
      <div className="p-6 bg-white shadow">
        <Form form={form} layout="vertical" onFinish={submit}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="name" label={t("Sender name")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="host" label={t("Host")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="port" label={t("Port")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="is_secure" label={t("Is secure")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="email" label={t("E-mail")} className="mb-0!">
              <Input size="large" type="email" />
            </Form.Item>
            <Form.Item name="password" label={t("Password")} className="mb-0!">
              <Input size="large" type="email" />
            </Form.Item>
          </div>
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button size="large" type="primary" onClick={form.submit}>
              {t("Save")}
            </Button>
            <Button size="large" onClick={sendTestEmail}>
              {t("Test")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
