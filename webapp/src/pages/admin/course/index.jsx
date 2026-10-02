import axios from "axios";
import { usePermission } from "../../../utils/usePermission";
import { useContext, useEffect, useMemo } from "react";
import { useState } from "react";
import { Avatar, Badge, Button, Input, Select, Table } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { FaCopy, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { CiCalendar } from "react-icons/ci";
import { CgDetailsMore } from "react-icons/cg";
import { RxReload } from "react-icons/rx";
import { AiOutlinePlus } from "react-icons/ai";

import Create from "../../../components/admin/course/create";
import Update from "../../../components/admin/course/update";
import Delete from "../../../components/admin/delete";
import Duplicate from "../../../components/admin/course/duplicate";
import FiltersDrawer from "../../../components/admin/filtersDrawer";
import RowActions from "../../../components/admin/rowActions";

import StatusTag from "../../../utils/statusTag";
import { uniqueRule } from "../../../utils/formFieldError";
import { Context } from "../../../utils/context";
import config from "../../../utils/config";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Filtros de pesquisa/estado: vivem dentro do FiltersDrawer e só se aplicam ao clicar em "Aplicar"
const EMPTY_FILTERS = { search: "", status: null };

export default function Course() {
  const { user, selectedLanguage } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [products, setProducts] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenDuplicate, setIsOpenDuplicate] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
        is_deleted: <StatusTag isDeleted={array[i].is_deleted} />,
        full_data: array[i],
        actions: (
          // stopPropagation: a linha toda abre os detalhes ao clicar (ver onRow); sem isto, abrir o menu abria também os detalhes
          <div className="flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
            <RowActions
              items={[
                {
                  label: t("Details"),
                  key: `${array[i].id}-details`,
                  icon: <CgDetailsMore />,
                  onClick: () => navigate(`/admin/courses/${array[i].id}`),
                },
                perm.canUpdate && {
                  label: t("Update"),
                  key: `${array[i].id}-udpate`,
                  icon: <FaRegEdit />,
                  onClick: () => openUpdate(array[i]),
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

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
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
    setIsOpenUpdate(false);
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
  const activeFiltersCount = Object.values(appliedFilters).filter(
    (v) => v !== null && v !== "" && v !== undefined,
  ).length;

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }
  function toggleFilters(open) {
    if (open) setFilters(appliedFilters);
    setIsFiltersOpen(open);
  }
  function applyFilters() {
    setAppliedFilters(filters);
    setIsFiltersOpen(false);
  }
  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setIsFiltersOpen(false);
  }

  const filteredData = useMemo(() => {
    const term = appliedFilters.search.trim().toLowerCase();
    return tableData.filter((row) => {
      if (
        term &&
        !`${row.full_data.internal_name || ""} ${row.full_data.name || ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (
        appliedFilters.status !== null &&
        row.full_data.is_deleted !== appliedFilters.status
      )
        return false;
      return true;
    });
  }, [tableData, appliedFilters]);

  return (
    <div className="p-6 bg-white shadow rounded-[16px]">
      <Create
        open={isOpenCreate}
        close={closeAction}
        products={products}
        nameRule={nameRule}
        internalNameRule={internalNameRule}
      />
      <Update
        data={selectedData}
        open={isOpenUpdate}
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
      <FiltersDrawer
        open={isFiltersOpen}
        onClose={() => toggleFilters(false)}
        onApply={applyFilters}
        onClear={clearFilters}>
        <div>
          <p className="text-sm text-[#6B6B6B] pb-2">{t("Search")}</p>
          <Input
            allowClear
            placeholder={t("Search by name...")}
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>
        {canSeeStatus && (
          <div>
            <p className="text-sm text-[#6B6B6B] pb-2">{t("Status")}</p>
            <Select
              allowClear
              className="w-full"
              placeholder={t("Status")}
              value={filters.status ?? undefined}
              onChange={(value) => updateFilter("status", value ?? null)}
              options={[
                { label: t("Active"), value: 0 },
                { label: t("Inactive"), value: 1 },
              ]}
            />
          </div>
        )}
      </FiltersDrawer>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("Courses")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">
            {t("{{total}} courses", { total: filteredData.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge count={activeFiltersCount} size="small">
            <Button
              icon={<FilterOutlined />}
              onClick={() => toggleFilters(true)}
              aria-label={t("Filters")}
              title={t("Filters")}
            />
          </Badge>
          <Button
            onClick={getData}
            icon={<RxReload />}
            aria-label={t("Refresh")}
            title={t("Refresh")}
          />
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
