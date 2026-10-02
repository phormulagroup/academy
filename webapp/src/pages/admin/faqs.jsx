import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import { DndContext } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LuGripVertical } from "react-icons/lu";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { createContext, useContext, useEffect, useMemo } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Image, Tag } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import Create from "../../components/admin/faqs/create";
import Update from "../../components/admin/faqs/update";
import Delete from "../../components/admin/delete";
import { uniqueRule } from "../../utils/formFieldError";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import config from "../../utils/config";
import i18n from "../../utils/i18n";

// Ordenar com drag and drop (exemplo do antd): cada linha é ordenável e o pegador de arrastar vem do contexto
const RowContext = createContext({});

function DragHandle() {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);
  return (
    <button type="button" ref={setActivatorNodeRef} {...listeners} aria-label="Drag" className="flex h-8 w-8 cursor-grab items-center justify-center rounded-[8px] border-0 bg-transparent text-[#8A8D98] hover:bg-[#F2F3F5] hover:text-[#163986]">
      <LuGripVertical />
    </button>
  );
}

function SortableRow(props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props["data-row-key"] });
  const style = { ...props.style, transform: CSS.Translate.toString(transform), transition, ...(isDragging ? { position: "relative", zIndex: 9999, background: "#F1F9FF" } : {}) };
  const contextValue = useMemo(() => ({ setActivatorNodeRef, listeners }), [setActivatorNodeRef, listeners]);
  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
}

export default function Faqs() {
  const { user, selectedLanguage, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("faqs");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenTranslations, setIsOpenTranslations] = useState(false);

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.faqs.readByLang, { params: { id_lang: selectedLanguage.id } })
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
        description: <div dangerouslySetInnerHTML={{ __html: array[i].description }} />,
        images:
          images.length > 0 ? (
            <div className="flex justify-start items-center gap-4">
              {images.map((item) => (
                <Image
                  width={100}
                  alt={item.img}
                  src={`${config.server_ip}/media/${item.img}`}
                  preview={{
                    mask: { blur: true },
                  }}
                />
              ))}
            </div>
          ) : null,
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
                  perm.canUpdate && {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
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

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
  }

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  // Título único (usado pelo Create e pelo Update): não pode existir outra FAQ ativa neste idioma com o
  // mesmo título; no Update ignora a própria FAQ (excludeId)
  const nameRule = (excludeId = null) =>
    uniqueRule(data, t("A faq with this title already exists"), { field: "title", excludeId });

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar, hasActiveFilters } = useListFilters([
    { key: "title", type: "text", primary: true, placeholder: t("Search by title..."), match: (row, v) => includesText(row.full_data.title, v) },
  ]);

  // Só se reordena a lista completa: com filtros ativos a ordem das linhas visíveis não diz respeito à lista toda
  const canSort = perm.canUpdate && !hasActiveFilters;

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const previous = tableData;
    const oldIndex = previous.findIndex((r) => r.id === active.id);
    const newIndex = previous.findIndex((r) => r.id === over.id);
    const next = arrayMove(previous, oldIndex, newIndex);
    setTableData(next);
    axios
      .post(endpoints.faqs.reorder, { data: { ids: next.map((r) => r.id) } })
      .then(() => toastApi.success(t("Order saved")))
      .catch((err) => {
        console.log(err);
        setTableData(previous);
        toastApi.error(err.response?.data?.message || t("Could not save the order"));
      });
  }

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} nameRule={nameRule} />
      <Update data={selectedData} open={isOpenUpdate} close={closeAction} nameRule={nameRule} />
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="faqs" />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Faqs")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} FAQs", { total: filterRows(tableData).length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <ExportButton table="faqs" data={filterRows(tableData).map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Title", dataIndex: "title" }, languageColumn, createdColumn]} />
          <RefreshButton size="large" onClick={getData} />
          {perm.canCreate && (<Button size="large" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            {t("Add faq")}
          </Button>)}
        </div>
      </div>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={filterRows(tableData).map((r) => r.id)} strategy={verticalListSortingStrategy}>
      <Table
        rowKey="id"
        components={canSort ? { body: { row: SortableRow } } : undefined}
        pagination={{ pageSize: 1000, hideOnSinglePage: true }}
        dataSource={filterRows(tableData)}
        loading={isLoading}
        columns={[
          ...(canSort ? [{ key: "sort", dataIndex: "sort", width: 56, render: () => <DragHandle /> }] : []),
          {
            title: t("Title"),
            dataIndex: "title",
            key: "title",
            sort: true,
            sortType: "text",
            width: "400px",
          },
          {
            title: t("Description"),
            dataIndex: "description",
            key: "description",
          },
          {
            title: t("Images"),
            dataIndex: "images",
            key: "images",
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: "80px",
          },
        ]}
      />
        </SortableContext>
      </DndContext>
    </div>
  );
}
