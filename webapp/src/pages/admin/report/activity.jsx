import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
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

export default function ReportActivity({ data }) {
  const { user, selectedLanguage } = useContext(Context);

  const { t } = useTranslation();

  useEffect(() => {
    if (data) prepareData();
  }, [data]);

  function prepareData() {
    console.log(data);
  }

  return (
    <div className="p-2">
      <div>
        <p>activity</p>
      </div>
    </div>
  );
}
