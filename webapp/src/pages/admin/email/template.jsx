import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";
import { Button, Table, Tag, Tooltip } from "antd";
import { FaRegTrashAlt } from "react-icons/fa";
import { CgDetailsMore } from "react-icons/cg";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import RefreshButton from "../../../components/admin/refreshButton";
import RowActions from "../../../components/admin/rowActions";
import useListFilters, { includesText } from "../../../components/admin/listFilters";
import Delete from "../../../components/admin/delete";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { AUDIENCES, templateType } from "../../../utils/emailTemplates";
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
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name or subject..."), match: (row, v) => includesText(row.name, v) || includesText(row.subject, v) },
    { key: "audience", type: "select", primary: true, label: t("Sent to"), options: [{ label: t("User"), value: "user" }, { label: t("Team"), value: "staff" }, { label: t("Chosen when sending"), value: "custom" }], match: (row, v) => row.kind.audience === v },
    { key: "active", type: "select", label: t("Is active"), options: [{ label: t("Yes"), value: 1 }, { label: t("No"), value: 0 }], match: (row, v) => (row.is_active ? 1 : 0) === v },
  ]);
  const rows = filterRows(data);

  return (
    <div className="p-2">
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="email" />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Templates")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} templates", { total: rows.length })} · {t("Each template is sent by an action of the platform")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <RefreshButton onClick={getData} />
        </div>
      </div>
      <Table
        dataSource={rows}
        loading={isLoading}
        // Larguras fixas: o nome e o assunto repartem o espaço que sobra e as restantes colunas têm o tamanho do seu conteúdo
        tableLayout="fixed"
        scroll={{ x: 960 }}
        pagination={{ placement: ["none", "bottomCenter"], showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        // A linha toda abre os detalhes, onde se edita tudo (nome, assunto e conteúdo)
        onRow={(record) => ({ className: "cursor-pointer", onClick: () => navigate(`/admin/templates/${record.id}`) })}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            width: "30%",
            ellipsis: true,
            render: (name, row) => (
              <div className="min-w-0">
                <p className="font-semibold mb-0! truncate">{name}</p>
                <p className="text-[12px] text-[#8A8D98] mb-0! truncate">{t(row.kind.description)}</p>
              </div>
            ),
          },
          { title: t("Subject"), dataIndex: "subject", key: "subject", width: "28%", ellipsis: true, render: (subject) => subject || <span className="text-[#B0B3BD]">{t("No subject")}</span> },
          {
            title: t("Type"),
            key: "kind",
            width: 210,
            render: (_, row) => (
              <Tooltip title={row.kind.system ? t("This e-mail is sent by the platform, so the template cannot be deleted") : undefined}>
                <Tag variant="outlined" color={row.kind.system ? "blue" : "default"} style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                  {t(row.kind.label)}
                </Tag>
              </Tooltip>
            ),
          },
          {
            title: t("Sent to"),
            key: "audience",
            width: 170,
            render: (_, row) => {
              const audience = AUDIENCES[row.kind.audience];
              return (
                <Tooltip title={t(audience.hint)}>
                  <Tag variant="outlined" color={audience.color} className="m-0!">
                    {t(audience.label)}
                  </Tag>
                </Tooltip>
              );
            },
          },
          {
            title: t("Last updated"),
            dataIndex: "modified_at",
            key: "modified_at",
            width: 190,
            sorter: (a, b) => dayjs(a.modified_at).valueOf() - dayjs(b.modified_at).valueOf(),
            render: (date) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
          },
          {
            title: t("Is active"),
            dataIndex: "is_active",
            key: "is_active",
            width: 110,
            render: (active) => (
              <Tag variant="outlined" color={active ? "green" : "red"}>
                {active ? t("Active") : t("Inactive")}
              </Tag>
            ),
          },
          {
            title: "",
            key: "actions",
            width: 64,
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
