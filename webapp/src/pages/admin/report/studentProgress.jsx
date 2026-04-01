import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Empty, Form, Input, Select, Spin, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";
import { RxReload } from "react-icons/rx";

import Table from "../../../components/admin/table";
import Delete from "../../../components/admin/delete";
import Create from "../../../components/admin/certificate/create";
import Logs from "../../../components/admin/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import config from "../../../utils/config";

export default function StudentProgress({ data }) {
  const { languages, selectedLanguage } = useContext(Context);
  const [countries, setCountries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFilteredData(data.users);
    }
  }, [data]);

  useEffect(() => {
    setCountries(JSON.parse(languages.filter((l) => l.id === selectedLanguage.id)[0].country));
  }, [selectedLanguage]);

  function filterData(values) {
    setIsSearching(true);
    console.log(values);
    let newData = Object.assign([], data.users);

    if (values.country && values.country.length > 0) newData = newData.filter((n) => values.country.includes(n.country));
    if (values.student)
      newData = newData.filter(
        (n) => n.name.toLowerCase().includes(values.student.toLowerCase()) || n.email.toLowerCase().includes(values.student.toLowerCase()) || n.id.toString() === values.student,
      );

    setFilteredData(newData);
    setIsSearching(false);
  }

  return (
    <div className="p-4">
      <Form form={form} layout="vertical" onFinish={filterData}>
        <div className="grid grid-cols-4 gap-8 mb-4 mt-4">
          <div></div>
          <Form.Item name="country" label={t("Country")} className="mb-0!">
            <Select
              mode="multiple"
              allowClear
              size="large"
              className="w-full"
              placeholder={t("Select country")}
              showSearch={{
                optionFilterProp: ["label"],
              }}
              options={countries.map((c) => ({
                label: c,
                value: c,
              }))}
            />
          </Form.Item>
          <Form.Item name="student" label={t("Student")} className="mb-0!">
            <Input size="large" placeholder={t("Search for name, ID or e-mail")} allowClear />
          </Form.Item>
          <div className="flex justify-center items-end">
            <Button className="w-full" size="large" onClick={form.submit} type="primary">
              {t("Search")}
            </Button>
          </div>
        </div>
      </Form>
      <div className="grid grid-cols-4 gap-4 bg-white rounded-[5px] p-4">
        <div className="col-span-4">
          <p className="font-bold">{t("Students")}</p>
        </div>
        {filteredData.length > 0 ? (
          filteredData.map((u) => (
            <Link to={`/admin/users/${u.id}`}>
              <div className="bg-white border border-solid border-[#707070] rounded-[5px] p-4 flex justify-start items-center">
                <div
                  className="w-10 h-10 min-w-10 min-h-10 rounded-full bg-center bg-cover flex justify-center items-center mr-2"
                  style={{ backgroundImage: u.img ? `url(${config.server_ip}/media/${u.img})` : "none", backgroundColor: u.img ? "transparent" : "#ccc" }}
                >
                  {!u.img && (
                    <p className="text-black">
                      {u.name.split(" ")[0][0]}
                      {u.name.split(" ")[1][0]}
                    </p>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-black">{u.name}</p>
                  <p className="text-[11px] text-black underline">{u.email}</p>
                  <p className="text-[11px] text-black">ID: {u.id}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-4">{isSearching ? <Spin spinning={true} /> : <Empty />}</div>
        )}
      </div>
    </div>
  );
}
