import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Tag } from "antd";
import SubmissionStatus, { replyState } from "../../utils/submissionStatus";
import { FaRegTrashAlt } from "react-icons/fa";
import { CgDetailsMore } from "react-icons/cg";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";

export default function FormSubmission() {
  const { user, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("form_submission");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenTranslations, setIsOpenTranslations] = useState(false);

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.form.readByLang, { params: { id_lang: selectedLanguage.id } })
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
      let images = array[i].images ? JSON.parse(array[i].images) : [];

      aux.push({
        ...array[i],
        key: i + 1,
        message: <div className="line-clamp-2 break-words">{array[i].message}</div>,
        reply_status: <SubmissionStatus sent={array[i].replies_sent} failed={array[i].replies_failed} t={t} />,
        acceptance: array[i].acceptance ? <Tag variant="outlined" color="green" className="m-0!">{t("Accepted")}</Tag> : <Tag className="m-0!">{t("Not given")}</Tag>,
        full_data: array[i],
        actions: (
          // stopPropagation: a linha toda abre os detalhes ao clicar (ver onRow)
          <div className="flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
            <RowActions items={[
                  { label: t("Details"), key: `${array[i].id}-details`, icon: <CgDetailsMore />, onClick: () => navigate(`/admin/answers/${array[i].id}`) },
                  perm.canDelete && {
                    label: t("Delete"),
                    key: `${array[i].id}-delete`,
                    icon: <FaRegTrashAlt />,
                    onClick: () => openDelete(array[i]),
                  },
                ]} />
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
    if (c) {
      getData();
    }
    setIsOpenDelete(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "subject", type: "text", primary: true, placeholder: t("Search by subject..."), match: (row, v) => includesText(row.full_data.subject, v) },
    // Só há estado de resposta depois de correr a migração (as linhas deixam de ter replies_sent)
    ...(data.some((r) => "replies_sent" in r) ? [{ key: "reply", type: "select", primary: true, label: t("Status"), options: [{ label: t("Waiting for reply"), value: "waiting" }, { label: t("Answered"), value: "answered" }, { label: t("Reply failed"), value: "failed" }], match: (row, v) => replyState(row.full_data.replies_sent, row.full_data.replies_failed) === v }] : []),
    { key: "name", type: "text", label: t("Name"), placeholder: t("Search by name..."), match: (row, v) => includesText(row.full_data.name, v) },
    { key: "email", type: "text", label: t("E-mail"), placeholder: t("Search by e-mail..."), match: (row, v) => includesText(row.full_data.email, v) },
  ]);

  return (
    <div className="p-2">
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="form" />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold">{t("Form Submissions")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} submissions", { total: filterRows(tableData).length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <ExportButton table="answers" data={filterRows(tableData).map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Subject", dataIndex: "subject" }, { title: "Name", dataIndex: "name" }, { title: "E-mail", dataIndex: "email" }, { title: "Message", dataIndex: "message" }, languageColumn, createdColumn]} />
          <RefreshButton size="large" onClick={getData} />
        </div>
      </div>
      <Table
        dataSource={filterRows(tableData)}
        loading={isLoading}
        tableLayout="fixed"
        scroll={{ x: 1100 }}
        // A linha toda abre os detalhes (mensagem completa e dados de quem enviou)
        onRow={(record) => ({ className: "cursor-pointer", onClick: () => navigate(`/admin/answers/${record.id}`) })}
        columns={[
          {
            title: t("Subject"),
            dataIndex: "subject",
            key: "subject",
            sort: true,
            sortType: "text",
            width: "18%",
            ellipsis: true,
            render: (subject) => subject || <span className="text-[#B0B3BD]">{t("No subject")}</span>,
          },
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            width: "13%",
            ellipsis: true,
          },
          {
            title: t("E-mail"),
            dataIndex: "email",
            key: "email",
            width: "18%",
            ellipsis: true,
          },
          {
            title: t("Message"),
            dataIndex: "message",
            key: "message",
            width: "22%",
          },
          ...(data.some((r) => "replies_sent" in r) ? [{ title: t("Status"), dataIndex: "reply_status", key: "reply_status", width: 150 }] : []),
          {
            title: t("Received"),
            dataIndex: "created_at",
            key: "created_at",
            width: 150,
            sorter: (a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
            defaultSortOrder: "descend",
            render: (date) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: 64,
          },
        ]}
      />
    </div>
  );
}
