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
import { Link, useNavigate } from "react-router-dom";
import config from "../../../utils/config";

export default function StudentProgress({ data }) {
  const { user, selectedLanguage } = useContext(Context);

  const { t } = useTranslation();

  useEffect(() => {
    if (data) prepareData();
  }, [data]);

  function prepareData() {
    console.log(data);
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 bg-white rounded-[5px] p-4">
        <div className="col-span-4">
          <p className="font-bold">{t("Students")}</p>
        </div>
        {data.users &&
          data.users.map((u) => (
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
          ))}
      </div>
    </div>
  );
}
