import axios from "axios";
import dayjs from "dayjs";
import RefreshButton from "../../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../../components/admin/export/exportButton";
import { usePermission } from "../../../utils/usePermission";
import { useContext, useEffect, useRef } from "react";
import { useState } from "react";
import { Avatar, Button, Input, Select, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FaCopy, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { CiCalendar } from "react-icons/ci";
import { CgDetailsMore } from "react-icons/cg";
import { AiOutlinePlus } from "react-icons/ai";

import Create from "../../../components/admin/course/create";
import Delete from "../../../components/admin/delete";
import Duplicate from "../../../components/admin/course/duplicate";
import RowActions from "../../../components/admin/rowActions";

import StatusTag from "../../../utils/statusTag";
import { uniqueRule } from "../../../utils/formFieldError";
import { Context } from "../../../utils/context";
import config from "../../../utils/config";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Datas de início e de fim do curso (opcionais), guardadas nas definições do curso
function courseDateFields(course) {
  let dates = {};
  try {
    const settings = typeof course.settings === "string" ? JSON.parse(course.settings) : course.settings;
    dates = settings?.course_access_expiration_dates || {};
  } catch {
    // definições inválidas: sem datas
  }
  const fmt = (value) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—");
  return {
    start_label: fmt(dates.start_date),
    end_label: fmt(dates.end_date),
    start_value: dates.start_date ? dayjs(dates.start_date).valueOf() : null,
    end_value: dates.end_date ? dayjs(dates.end_date).valueOf() : null,
  };
}

// Coluna da tabela → campo de ordenação aceite pela API (/course/list)
const SORT_FIELDS = { course_info: "internal_name", moduleCount: "moduleCount", topicCount: "topicCount", testCount: "testCount", start_label: "start", end_label: "end", is_deleted: "status" };

export default function Course() {
  const { user, selectedLanguage } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [products, setProducts] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  // Paginação, pesquisa, filtro e ordenação são feitos no servidor: a página só pede as linhas que mostra
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(undefined);
  const [sort, setSort] = useState({ field: "internal_name", order: "asc" });
  const requestRef = useRef(0);

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenDuplicate, setIsOpenDuplicate] = useState(false);


  const { t } = useTranslation();

  const perm = usePermission("course");

  const navigate = useNavigate();

  // A pesquisa só segue para o servidor 350 ms depois de se parar de escrever
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (user) getData();
  }, [user, selectedLanguage, page, pageSize, search, status, sort.field, sort.order]);

  // Produtos e identificação leve dos cursos (para nomes repetidos): carregam uma vez e depois de criar, duplicar ou apagar
  function getSupport() {
    axios.get(endpoints.product.read).then((res) => setProducts(res.data)).catch((err) => console.log(err));
    axios.get(endpoints.course.options).then((res) => setAllCourses(res.data)).catch((err) => console.log(err));
  }
  useEffect(() => {
    if (user) getSupport();
  }, [user]);

  const listParams = { id_lang: selectedLanguage.id, search, status, sort: sort.field, order: sort.order };

  function getData() {
    const request = ++requestRef.current;
    setIsLoading(true);
    axios
      .get(endpoints.course.list, { params: { ...listParams, page, limit: pageSize } })
      .then((res) => {
        if (request !== requestRef.current) return;
        setData(res.data.rows);
        setTotal(res.data.total);
        prepareData(res.data.rows);
      })
      .catch((err) => console.log(err))
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false);
      });
  }

  // Todas as linhas do filtro atual (para exportar), por páginas de 500
  async function fetchAllRows() {
    const rows = [];
    for (let p = 1; ; p++) {
      const res = await axios.get(endpoints.course.list, { params: { ...listParams, page: p, limit: 500 } });
      rows.push(...res.data.rows);
      if (rows.length >= res.data.total || res.data.rows.length === 0) return rows;
    }
  }

  function prepareData(array) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: array[i].id,
        course_info: (
          <div className="flex items-center">
            <Avatar
              shape="square"
              size={40}
              style={{ backgroundColor: "#163986" }}
              src={
                array[i].thumbnail
                  ? `${config.server_ip}/media/${array[i].thumbnail}`
                  : undefined
              }
              icon={<CiCalendar className="text-white/60" />}
              className="mr-2!"
            />
            <div className="min-w-0">
              <p className="mb-0!">{array[i].internal_name}</p>
              {array[i].name && array[i].name !== array[i].internal_name && (
                <p className="text-[12px] text-[#8A8D98] mb-0!">{array[i].name}</p>
              )}
            </div>
          </div>
        ),
        ...courseDateFields(array[i]),
        is_deleted: <StatusTag isDeleted={array[i].is_deleted} />,
        full_data: array[i],
        actions: (
          // stopPropagation: a linha toda abre os detalhes ao clicar (ver onRow); sem isto, abrir o menu abria também os detalhes
          <div className="flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
            <RowActions
              items={[
                {
                  // Atualizar e Detalhes são o mesmo ecrã: o separador Geral tem todos os campos de identificação e estado
                  label: perm.canUpdate ? t("Update") : t("Details"),
                  key: `${array[i].id}-details`,
                  icon: perm.canUpdate ? <FaRegEdit /> : <CgDetailsMore />,
                  onClick: () => navigate(`/admin/courses/${array[i].id}`),
                },
                perm.canCreate && {
                  label: t("Duplicate"),
                  key: `${array[i].id}-duplicate`,
                  icon: <FaCopy />,
                  onClick: () => openDuplicate(array[i]),
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

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function openDuplicate(obj) {
    setSelectedData(obj);
    setIsOpenDuplicate(true);
  }

  function closeAction(c) {
    if (c) {
      getData();
      getSupport();
    }
    setIsOpenDuplicate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  // Nome e nome interno únicos por idioma (usados pelo Create, Update e Duplicate): não pode existir outro curso
  // ativo no idioma com o mesmo valor; no Update ignora o próprio curso (excludeId); no Duplicate o idioma é o
  // escolhido no formulário (languageId)
  const coursesOfLanguage = (languageId) =>
    (allCourses.length > 0 ? allCourses : data).filter(
      (course) => course.id_lang === (languageId || selectedLanguage.id),
    );
  const nameRule = (excludeId = null, languageId = null) =>
    uniqueRule(
      coursesOfLanguage(languageId),
      t("A course with this name already exists"),
      { excludeId },
    );
  const internalNameRule = (excludeId = null, languageId = null) =>
    uniqueRule(
      coursesOfLanguage(languageId),
      t("A course with this internal name already exists"),
      {
        field: "internal_name",
        excludeId,
      },
    );

  const canSeeStatus = user.id_role === 1 || user.id_role === 2;
  const filteredData = tableData;
  const sortOrderOf = (field) => (sort.field === field ? (sort.order === "desc" ? "descend" : "ascend") : null);

  return (
    <div className="p-2">
      <Create
        open={isOpenCreate}
        close={closeAction}
        products={products}
        nameRule={nameRule}
        internalNameRule={internalNameRule}
      />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="course"
      />
      <Duplicate
        data={selectedData}
        open={isOpenDuplicate}
        close={closeAction}
        products={products}
        nameRule={nameRule}
        internalNameRule={internalNameRule}
      />
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("Courses")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">
            {t("{{total}} courses", { total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input allowClear className="w-60!" prefix={<SearchOutlined />} placeholder={t("Search by name...")} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          {canSeeStatus && (
            <Select
              allowClear
              className="w-36"
              placeholder={t("Status")}
              value={status}
              onChange={(v) => {
                setStatus(v ?? undefined);
                setPage(1);
              }}
              options={[{ label: t("Active"), value: "active" }, { label: t("Inactive"), value: "inactive" }]}
            />
          )}
          <ExportButton table="courses" data={filteredData.map((r) => r.full_data)} fetchAll={fetchAllRows} columns={[{ title: "ID", dataIndex: "id" }, { title: "Name", dataIndex: "name" }, { title: "Internal name", dataIndex: "internal_name" }, { title: "Slug", dataIndex: "slug" }, languageColumn, { title: "Status", dataIndex: "status" }, { title: "Start date", dataIndex: "start_label", value: (row) => courseDateFields(row).start_label }, { title: "End date", dataIndex: "end_label", value: (row) => courseDateFields(row).end_label }, activityColumn, createdColumn]} />
          <RefreshButton onClick={getData} />
          {perm.canCreate && (<Button
            type="primary"
            icon={<AiOutlinePlus />}
            onClick={() => setIsOpenCreate(true)}>
            <span className="hidden sm:inline">{t("Add course")}</span>
          </Button>)}
        </div>
      </div>
      <Table
        dataSource={filteredData}
        loading={isLoading}
        scroll={{ x: 50 }}
        pagination={{
          placement: ["none", "bottomCenter"],
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [15, 30, 50, 100],
          showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`,
        }}
        onChange={(pagination, _filters, sorter) => {
          if (pagination.pageSize !== pageSize) setPageSize(pagination.pageSize);
          const field = SORT_FIELDS[sorter?.columnKey ?? sorter?.field];
          const next = field && sorter.order ? { field, order: sorter.order === "descend" ? "desc" : "asc" } : { field: "internal_name", order: "asc" };
          if (next.field !== sort.field || next.order !== sort.order) {
            setSort(next);
            setPage(1);
          } else setPage(pagination.current);
        }}
        onRow={(record) => ({
          className: "cursor-pointer",
          onClick: () => navigate(`/admin/courses/${record.full_data.id}`),
        })}
        columns={[
          {
            title: t("Course"),
            dataIndex: "course_info",
            key: "course_info",
            sorter: true,
            sortOrder: sortOrderOf("internal_name"),
            width: "55%",
          },
          {
            title: t("Modules"),
            dataIndex: "moduleCount",
            key: "moduleCount",
            sorter: true,
            sortOrder: sortOrderOf("moduleCount"),
            width: "100px",
          },
          {
            title: t("Topics"),
            dataIndex: "topicCount",
            key: "topicCount",
            sorter: true,
            sortOrder: sortOrderOf("topicCount"),
            width: "100px",
          },
          {
            title: t("Tests"),
            dataIndex: "testCount",
            key: "testCount",
            sorter: true,
            sortOrder: sortOrderOf("testCount"),
            width: "100px",
          },
          {
            title: t("Start date"),
            dataIndex: "start_label",
            key: "start_label",
            onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }), // o título nunca quebra em duas linhas
            sorter: true,
            sortOrder: sortOrderOf("start"),
            width: "175px",
          },
          {
            title: t("End date"),
            dataIndex: "end_label",
            key: "end_label",
            onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }), // o título nunca quebra em duas linhas
            sorter: true,
            sortOrder: sortOrderOf("end"),
            width: "175px",
          },
          canSeeStatus && {
            title: t("Status"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            sorter: true,
            sortOrder: sortOrderOf("status"),
            width: "110px",
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
