import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tabs, Tag } from "antd";
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
import { useNavigate } from "react-router-dom";
import ReportCourse from "./course";
import ReportTest from "./test";
import ReportStudent from "./student";

export default function Report() {
  const { user, selectedLanguage } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

  const { t } = useTranslation();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course.report, { params: { id_lang: selectedLanguage.id } })
      .then((res) => {
        setData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Reports")}</p>
        </div>
      </div>
      <div>
        <Tabs
          size="large"
          type="card"
          className="tabs-report"
          items={[
            {
              key: "1",
              label: t("Course reports"),
              forceRender: true,
              children: <ReportCourse data={data} />,
            },
            {
              key: "2",
              label: t("Test reports"),
              forceRender: true,
              children: <ReportTest data={data} />,
            },
          ]}
        />
      </div>
      <div className="mt-4">
        <Tabs
          size="large"
          type="card"
          className="tabs-report"
          items={[
            {
              key: "3",
              label: t("Students progress"),
              forceRender: true,
              children: <ReportStudent data={data} />,
            },
            {
              key: "4",
              label: t("Tests progress"),
              forceRender: true,
              children: <ReportTest data={data} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
