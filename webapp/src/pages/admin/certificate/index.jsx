import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { RxReload } from "react-icons/rx";

import Table from "../../../components/admin/table";
import Delete from "../../../components/admin/delete";
import Create from "../../../components/admin/certificate/create";
import Logs from "../../../components/admin/logs";

import StatusTag from "../../../utils/statusTag";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { uniqueRule } from "../../../utils/formFieldError";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function Certificate() {
  const { user, messageApi, selectedLanguage } = useContext(Context);
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
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course_certificate.read)
      .then((res) => {
        // Apenas os certificados do idioma selecionado no backoffice (incluindo os inativos)
        const languageCertificates = res.data.filter(
          (certificate) => certificate.id_lang === selectedLanguage.id,
        );
        setData(languageCertificates);
        prepareData(languageCertificates);
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
        is_deleted: <StatusTag isDeleted={array[i].is_deleted} />,
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <Dropdown
              trigger={"click"}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    label: t("Details"),
                    key: `${array[i].id}-details`,
                    icon: <FaRegEdit />,
                    onClick: () =>
                      navigate(`/admin/certificate/${array[i].id}`),
                  },
                  {
                    label: t("Delete"),
                    key: `${array[i].id}-delete`,
                    icon: <FaRegTrashAlt />,
                    onClick: () => openDelete(array[i]),
                  },
                ],
              }}>
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

  function openDelete(data) {
    setSelectedData(data);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    console.log(c);
    if (c) {
      getData();
    }

    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  function handleDeleteSuccess(deletedItem) {
    messageApi.open({
      type: "success",
      content:
        t("Certificate") +
        ` "${deletedItem?.name || deletedItem?.id}" ` +
        t("was removed successfully"),
    });
  }

  // Nome único: não pode existir outro certificado ativo neste idioma com o mesmo nome
  const nameRule = (excludeId = null) =>
    uniqueRule(data, t("A certificate with this name already exists"), {
      excludeId,
    });

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} nameRule={nameRule} />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="course_certificate"
        onDeleteSuccess={handleDeleteSuccess}
      />
      <Logs
        table={"course"}
        id_client={selectedData.id}
        open={isOpenLogs}
        close={() => setIsOpenLogs(false)}
      />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Certificates")}</p>
        </div>
        <div>
          <Button
            size="large"
            onClick={getData}
            icon={<RxReload />}
            className="mr-2"
          />
          <Button size="large" onClick={() => setIsOpenCreate(true)}>
            {t("Add")}
          </Button>
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        pagination={{ pageSize: 10 }}
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
          (user.id_role === 1 || user.id_role === 2) && {
            title: t("Status"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            filters: [
              { text: t("Active"), value: 0 },
              { text: t("Inactive"), value: 1 },
            ],
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
          },
        ]}
      />
    </div>
  );
}
