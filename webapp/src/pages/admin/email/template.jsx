import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import Update from "../../../components/admin/language/update";
import Delete from "../../../components/admin/delete";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";

import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import { useNavigate } from "react-router-dom";

export default function Template() {
  const { user } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenDelete, setIsOpenDelete] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.email.read)
      .then((res) => {
        setData(res.data);
        prepareData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function prepareData(array) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: i + 1,
        flag: (
          <div className="flex justify-start items-center">
            <img src={array[i].flag} className="max-w-5" />
          </div>
        ),
        is_active: array[i].is_active ? (
          <Tag variant="outlined" color={"green"}>
            {t("Active")}
          </Tag>
        ) : (
          <Tag variant="outlined" color={"red"}>
            {t("Inactive")}
          </Tag>
        ),
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <Dropdown
              trigger={"click"}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    label: "Update",
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => navigate(`/admin/templates/${array[i].id}`),
                  },
                  {
                    label: "Delete",
                    key: `${array[i].id}-delete`,
                    icon: <FaRegTrashAlt />,
                    onClick: () => openDelete(array[i]),
                  },
                ],
              }}
            >
              <Button>
                <IoMdMore />
              </Button>
            </Dropdown>
          </div>
        ),
      });
    }

    setTableData(aux);
  }

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    console.log(c);
    if (c) {
      getData();
    }

    setIsOpenDelete(false);
  }

  return (
    <div className="p-2">
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="language" />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Templates")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            search: "name",
            width: "80%",
          },
          {
            title: t("Is active"),
            dataIndex: "is_active",
            key: "is_active",
            width: "40px",
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: "80px",
          },
        ]}
      />
    </div>
  );
}
