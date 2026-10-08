import axios from "axios";
import RefreshButton from "../../../components/admin/refreshButton";
import ExportButton, {
  activityColumn,
  languageColumn,
  createdColumn,
} from "../../../components/admin/export/exportButton";
import { usePermission } from "../../../utils/usePermission";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FaRegTrashAlt } from "react-icons/fa";
import { CgDetailsMore } from "react-icons/cg";
import { AiOutlinePlus } from "react-icons/ai";

import Delete from "../../../components/admin/delete";
import Create from "../../../components/admin/certificate/create";
import Logs from "../../../components/admin/logs";
import useListFilters, {
  includesText,
} from "../../../components/admin/listFilters";
import RowActions from "../../../components/admin/rowActions";

import StatusTag from "../../../utils/statusTag";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { uniqueRule } from "../../../utils/formFieldError";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { hasFullAccess } from "../../../utils/roles";

export default function Certificate() {
  const { user, toastApi, selectedLanguage } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

  const { t } = useTranslation();

  const perm = usePermission("certificate");

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
          // stopPropagation: a linha toda abre os detalhes ao clicar (ver onRow)
          <div
            className="flex justify-end items-center"
            onClick={(e) => e.stopPropagation()}>
            <RowActions
              items={[
                {
                  label: t("Details"),
                  key: `${array[i].id}-details`,
                  icon: <CgDetailsMore />,
                  onClick: () => navigate(`/admin/certificate/${array[i].id}`),
                },
                perm.canDelete && {
                  label: t("Delete"),
                  key: `${array[i].id}-delete`,
                  icon: <FaRegTrashAlt />,
                  onClick: () => openDelete(array[i]),
                },
              ]}
            />
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
    if (c) {
      getData();
    }

    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  function handleDeleteSuccess(deletedItem) {
    toastApi.open({
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

  const canSeeStatus = hasFullAccess(user) || user.id_role === 2;
  // Pesquisa e estado ficam à vista na barra do cabeçalho (são só dois filtros, não precisam de gaveta)
  const { filterRows, toolbar } = useListFilters([
    {
      key: "q",
      type: "text",
      primary: true,
      placeholder: t("Search by name..."),
      match: (row, v) => includesText(row.full_data.name, v),
    },
    ...(canSeeStatus
      ? [
          {
            key: "status",
            type: "select",
            primary: true,
            label: t("Status"),
            options: [
              { label: t("Active"), value: 0 },
              { label: t("Inactive"), value: 1 },
            ],
            match: (row, v) => row.full_data.is_deleted === v,
          },
        ]
      : []),
  ]);
  const filteredData = filterRows(tableData);

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
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("Certificates")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">
            {t("{{total}} certificates", { total: filteredData.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          <ExportButton
            table="certificates"
            data={filteredData.map((r) => r.full_data)}
            columns={[
              { title: "ID", dataIndex: "id" },
              { title: "Name", dataIndex: "name" },
              languageColumn,
              activityColumn,
              createdColumn,
            ]}
          />
          <RefreshButton onClick={getData} />
          {perm.canCreate && (
            <Button
              type="primary"
              icon={<AiOutlinePlus />}
              onClick={() => setIsOpenCreate(true)}>
              <span className="hidden sm:inline">{t("Add")}</span>
            </Button>
          )}
        </div>
      </div>
      <Table
        dataSource={filteredData}
        loading={isLoading}
        scroll={{ x: 50 }}
        pagination={{
          placement: ["none", "bottomCenter"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} ${t("of")} ${total}`,
        }}
        onRow={(record) => ({
          className: "cursor-pointer",
          onClick: () => navigate(`/admin/certificate/${record.full_data.id}`),
        })}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) =>
              (a.full_data.name || "").localeCompare(b.full_data.name || ""),
            width: "80%",
          },
          canSeeStatus && {
            title: t("Status"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            sorter: (a, b) =>
              (a.full_data.is_deleted ? 1 : 0) -
              (b.full_data.is_deleted ? 1 : 0),
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
          },
        ].filter(Boolean)}
      />
    </div>
  );
}
