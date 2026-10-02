import axios from "axios";
import dayjs from "dayjs";
import RefreshButton from "../../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../../components/admin/export/exportButton";
import { usePermission } from "../../../utils/usePermission";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Avatar, Button, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FaCopy, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { CiCalendar } from "react-icons/ci";
import { CgDetailsMore } from "react-icons/cg";
import { AiOutlinePlus } from "react-icons/ai";

import Create from "../../../components/admin/course/create";
import Delete from "../../../components/admin/delete";
import Duplicate from "../../../components/admin/course/duplicate";
import useListFilters, { includesText } from "../../../components/admin/listFilters";
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

export default function Course() {
  const { user, selectedLanguage } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [products, setProducts] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenDuplicate, setIsOpenDuplicate] = useState(false);


  const { t } = useTranslation();

  const perm = usePermission("course");

  const navigate = useNavigate();

  useEffect(() => {
    if (user) getData();
  }, [user, selectedLanguage]);

  function getData() {
    setIsLoading(true);
    // Buscar todos os cursos (incluindo deletados) para a tabela admin
    axios
      .get(endpoints.course.read)
      .then((res) => {
        // Filtrar apenas os cursos do idioma selecionado (incluindo deletados)
        const languageFilteredCourses = res.data.courses.filter(
          (course) => course.id_lang === selectedLanguage.id,
        );
        setData(languageFilteredCourses);
        setProducts(res.data.products);
        prepareData(languageFilteredCourses, res.data);
        setAllCourses(res.data.courses); // Manter todos os cursos para validação
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  // Módulos, tópicos e testes de cada curso (a API devolve as listas completas, não contagens)
  function countContent(courseId, { modules = [], topics = [], tests = [] }) {
    const moduleIds = modules
      .filter((m) => m.id_course === courseId && !m.is_deleted)
      .map((m) => m.id);
    return {
      moduleCount: moduleIds.length,
      topicCount: topics.filter((tp) => moduleIds.includes(tp.id_course_module)).length,
      testCount: tests.filter((ts) => moduleIds.includes(ts.id_course_module)).length,
    };
  }

  function prepareData(array, content) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        ...countContent(array[i].id, content),
        key: i + 1,
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
  // Pesquisa e estado ficam à vista na barra do cabeçalho (são só dois filtros, não precisam de gaveta)
  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name..."), match: (row, v) => includesText(row.full_data.internal_name, v) || includesText(row.full_data.name, v) },
    ...(canSeeStatus
      ? [{ key: "status", type: "select", primary: true, label: t("Status"), options: [{ label: t("Active"), value: 0 }, { label: t("Inactive"), value: 1 }], match: (row, v) => row.full_data.is_deleted === v }]
      : []),
  ]);
  const filteredData = filterRows(tableData);

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
            {t("{{total}} courses", { total: filteredData.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          <ExportButton table="courses" data={filteredData.map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Name", dataIndex: "name" }, { title: "Internal name", dataIndex: "internal_name" }, { title: "Slug", dataIndex: "slug" }, languageColumn, { title: "Status", dataIndex: "status" }, { title: "Start date", dataIndex: "start_label", value: (row) => courseDateFields(row).start_label }, { title: "End date", dataIndex: "end_label", value: (row) => courseDateFields(row).end_label }, activityColumn, createdColumn]} />
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
          showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`,
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
            sorter: (a, b) =>
              (a.full_data.internal_name || "").localeCompare(
                b.full_data.internal_name || "",
              ),
            width: "55%",
          },
          {
            title: t("Modules"),
            dataIndex: "moduleCount",
            key: "moduleCount",
            sorter: (a, b) => a.moduleCount - b.moduleCount,
            width: "100px",
          },
          {
            title: t("Topics"),
            dataIndex: "topicCount",
            key: "topicCount",
            sorter: (a, b) => a.topicCount - b.topicCount,
            width: "100px",
          },
          {
            title: t("Tests"),
            dataIndex: "testCount",
            key: "testCount",
            sorter: (a, b) => a.testCount - b.testCount,
            width: "100px",
          },
          {
            title: t("Start date"),
            dataIndex: "start_label",
            key: "start_label",
            onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }), // o título nunca quebra em duas linhas
            sorter: (a, b) => (a.start_value || 0) - (b.start_value || 0),
            width: "175px",
          },
          {
            title: t("End date"),
            dataIndex: "end_label",
            key: "end_label",
            onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }), // o título nunca quebra em duas linhas
            sorter: (a, b) => (a.end_value || 0) - (b.end_value || 0),
            width: "175px",
          },
          canSeeStatus && {
            title: t("Status"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            sorter: (a, b) =>
              (a.full_data.is_deleted ? 1 : 0) - (b.full_data.is_deleted ? 1 : 0),
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
