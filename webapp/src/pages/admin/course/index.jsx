import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaCopy, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import Create from "../../../components/admin/course/create";
import Update from "../../../components/admin/course/update";
import Delete from "../../../components/admin/delete";

import StatusTag from "../../../utils/statusTag";
import { uniqueRule } from "../../../utils/formFieldError";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RxReload } from "react-icons/rx";
import Duplicate from "../../../components/admin/course/duplicate";

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
  const { t } = useTranslation();

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
        prepareData(languageFilteredCourses);
        setAllCourses(res.data.courses); // Manter todos os cursos para validação
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
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
                    onClick: () => navigate(`/admin/courses/${array[i].id}`),
                  },
                  {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  {
                    label: t("Duplicate"),
                    key: `${array[i].id}-duplicate`,
                    icon: <FaCopy />,
                    onClick: () => openDuplicate(array[i]),
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

  return (
    <div className="p-2">
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Courses")}</p>
        </div>
        <div className="flex justify-center">
          <Button
            size="large"
            onClick={getData}
            loading={isLoading}
            icon={<RxReload />}
            className="mr-2"
          />
          <Button size="large" onClick={() => setIsOpenCreate(true)}>
            {t("Add course")}
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
            dataIndex: "internal_name",
            key: "internal_name",
            sort: true,
            sortType: "text",
            search: "internal_name",
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
