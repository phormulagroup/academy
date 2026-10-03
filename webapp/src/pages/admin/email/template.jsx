import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";
import { Button, Table, Tag, Tooltip } from "antd";
import { FaRegTrashAlt } from "react-icons/fa";
import { CgDetailsMore } from "react-icons/cg";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import RefreshButton from "../../../components/admin/refreshButton";
import RowActions from "../../../components/admin/rowActions";
import useListFilters, { includesText } from "../../../components/admin/listFilters";
import Delete from "../../../components/admin/delete";
import Create from "../../../components/admin/template/create";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { templateType } from "../../../utils/emailTemplates";
import { usePermission } from "../../../utils/usePermission";

export default function Template() {
  const { selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("email_template");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [selectedData, setSelectedData] = useState({});
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenCreate, setIsOpenCreate] = useState(false);

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.email.readByLang, { params: { id_lang: selectedLanguage.id } })
      .then((res) => setData(res.data.map((row) => ({ ...row, key: row.id, kind: templateType(row.name_key) }))))
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  function closeAction(c) {
    if (c) getData();
    setIsOpenDelete(false);
    setIsOpenCreate(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name or subject..."), match: (row, v) => includesText(row.name, v) || includesText(row.subject, v) },
    {
      key: "kind",
      type: "select",
      primary: true,
      label: t("Type"),
      options: [
        { label: t("Sent by the platform"), value: "system" },
        { label: t("Custom"), value: "custom" },
      ],
      match: (row, v) => (row.kind.system ? "system" : "custom") === v,
    },
    { key: "active", type: "select", label: t("Is active"), options: [{ label: t("Yes"), value: 1 }, { label: t("No"), value: 0 }], match: (row, v) => (row.is_active ? 1 : 0) === v },
  ]);
  const rows = filterRows(data);

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} />
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="email" />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Templates")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} templates", { total: rows.length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <RefreshButton onClick={getData} />
          {perm.canCreate && (
            <Button type="primary" icon={<AiOutlinePlus />} onClick={() => setIsOpenCreate(true)}>
              <span className="hidden sm:inline">{t("Add")}</span>
            </Button>
          )}
        </div>
      </div>
      <Table
        dataSource={rows}
        loading={isLoading}
        scroll={{ x: 700 }}
        pagination={{ placement: ["none", "bottomCenter"], showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        // A linha toda abre os detalhes, onde se edita tudo (nome, assunto e conteúdo)
        onRow={(record) => ({ className: "cursor-pointer", onClick: () => navigate(`/admin/templates/${record.id}`) })}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            render: (name, row) => (
              <div className="min-w-0">
                <p className="font-semibold mb-0! truncate">{name}</p>
                <p className="text-[12px] text-[#8A8D98] mb-0! truncate">{t(row.kind.description)}</p>
              </div>
            ),
          },
          { title: t("Subject"), dataIndex: "subject", key: "subject", ellipsis: true, render: (subject) => subject || <span className="text-[#B0B3BD]">{t("No subject")}</span> },
          {
            title: t("Type"),
            key: "kind",
            width: 190,
            render: (_, row) => (
              <Tooltip title={row.kind.system ? t("This e-mail is sent by the platform, so the template cannot be deleted") : undefined}>
                <Tag variant="outlined" color={row.kind.system ? "blue" : "default"}>
                  {t(row.kind.label)}
                </Tag>
              </Tooltip>
            ),
          },
          {
            title: t("Last updated"),
            dataIndex: "modified_at",
            key: "modified_at",
            width: 150,
            sorter: (a, b) => dayjs(a.modified_at).valueOf() - dayjs(b.modified_at).valueOf(),
            render: (date) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
          },
          {
            title: t("Is active"),
            dataIndex: "is_active",
            key: "is_active",
            width: 100,
            render: (active) => (
              <Tag variant="outlined" color={active ? "green" : "red"}>
                {active ? t("Active") : t("Inactive")}
              </Tag>
            ),
          },
          {
            title: "",
            key: "actions",
            width: 70,
            render: (_, row) => (
              // stopPropagation: a linha toda abre os detalhes ao clicar (ver onRow)
              <div className="flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
                <RowActions
                  items={[
                    { label: t("Details"), key: `${row.id}-details`, icon: <CgDetailsMore />, onClick: () => navigate(`/admin/templates/${row.id}`) },
                    perm.canDelete &&
                      !row.kind.system && {
                        label: t("Delete"),
                        key: `${row.id}-delete`,
                        icon: <FaRegTrashAlt />,
                        danger: true,
                        onClick: () => {
                          setSelectedData(row);
                          setIsOpenDelete(true);
                        },
                      },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
