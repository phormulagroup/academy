import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, {
  activityColumn,
  languageColumn,
  createdColumn,
} from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { createContext, useContext, useEffect, useMemo } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Space } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { LuGripVertical } from "react-icons/lu";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import Table from "../../components/admin/table";
import useListFilters, {
  includesText,
} from "../../components/admin/listFilters";
import PageFooter from "../../components/admin/pageFooter";
import Create from "../../components/admin/document/create";
import Update from "../../components/admin/document/update";
import Delete from "../../components/admin/delete";
import StatusTag from "../../utils/statusTag";
import { uniqueRule } from "../../utils/formFieldError";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import config from "../../utils/config";

// Linha arrastável (drag and drop); o pegador recebe os listeners pelo contexto
const RowContext = createContext({});

function DragHandle() {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...listeners}
      aria-label="Drag"
      className="flex h-8 w-8 cursor-grab items-center justify-center rounded-[8px] border-0 bg-transparent text-[#8A8D98] hover:bg-[#F2F3F5] hover:text-[#163986]">
      <LuGripVertical />
    </button>
  );
}

function SortableRow(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props["data-row-key"] });
  const style = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging
      ? { position: "relative", zIndex: 9999, background: "#F1F9FF" }
      : {}),
  };
  const contextValue = useMemo(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners],
  );
  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
}

export default function Language() {
  const { selectedLanguage, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("document");
  const [isLoading, setIsLoading] = useState(true);
  // Todos os documentos do idioma pela ordem atual (`original` é a ordem guardada)
  const [docs, setDocs] = useState([]);
  const [original, setOriginal] = useState([]);
  const [selectedData, setSelectedData] = useState({});
  const [isColumnSorted, setIsColumnSorted] = useState(false);

  // Anular/refazer e guardar
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.document.readByLang, {
        // O backoffice lista também os documentos inativos (apagados); vêm ordenados por position
        params: { id_lang: selectedLanguage.id, include_deleted: 1 },
      })
      .then((res) => {
        const list = res.data.map((doc) => ({
          ...doc,
          country: doc.country ? JSON.parse(doc.country) : null,
        }));
        setDocs(list);
        setOriginal(list);
        setHistory([]);
        setFuture([]);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  const isUnsaved =
    docs.map((d) => d.id).join() !== original.map((d) => d.id).join();

  const tableData = docs.map((doc, index) => ({
    ...doc,
    key: doc.id,
    country: doc.country
      ? doc.country.map((c) => t(c)).join(", ")
      : t("All countries"),
    img: (
      <div className="flex justify-start items-center">
        <img
          src={`${config.server_ip}/media/${doc.img}`}
          className="max-w-[100px] h-auto"
        />
      </div>
    ),
    is_deleted: <StatusTag isDeleted={doc.is_deleted} />,
    full_data: doc,
    sort: <DragHandle />,
    // Setas ↑ ↓ (pequenas, à direita) para mover o documento uma posição
    arrows: (
      <Space size={4}>
        <Button
          size="small"
          className="w-6! h-6! min-w-0! p-0!"
          icon={<ArrowUpOutlined className="text-[11px]" />}
          onClick={() => moveDoc(doc.id, "up")}
          disabled={index === 0}
        />
        <Button
          size="small"
          className="w-6! h-6! min-w-0! p-0!"
          icon={<ArrowDownOutlined className="text-[11px]" />}
          onClick={() => moveDoc(doc.id, "down")}
          disabled={index === docs.length - 1}
        />
      </Space>
    ),
    actions: (
      <div className="flex justify-end items-center">
        <RowActions
          items={[
            perm.canUpdate && {
              label: t("Update"),
              key: `${doc.id}-udpate`,
              icon: <FaRegEdit />,
              disabled: isUnsaved,
              onClick: () => openUpdate(doc),
            },
            perm.canDelete && {
              label: t("Delete"),
              key: `${doc.id}-delete`,
              icon: <FaRegTrashAlt />,
              disabled: isUnsaved,
              onClick: () => openDelete(doc),
            },
          ]}
        />
      </div>
    ),
  }));

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
  }

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  // Nome único (usado pelo Create e pelo Update): não pode existir outro documento ativo neste idioma
  // com o mesmo nome; no Update ignora o próprio documento (excludeId)
  const nameRule = (excludeId = null) =>
    uniqueRule(docs, t("A document with this name already exists"), {
      excludeId,
    });

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar, hasActiveFilters } = useListFilters([
    {
      key: "name",
      type: "text",
      primary: true,
      placeholder: t("Search by name..."),
      match: (row, v) => includesText(row.full_data.name, v),
    },
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
    {
      key: "country",
      type: "select",
      label: t("Country"),
      options: () =>
        [...new Set(docs.flatMap((doc) => doc.country || []))]
          .sort()
          .map((c) => ({ label: c, value: c })),
      match: (row, v) => (row.full_data.country || []).includes(v),
    },
  ]);

  // Só se ordena sobre a lista completa: com pesquisa, filtros ou ordenação por coluna a ordem visível não é a real
  const canSort = perm.canUpdate && !hasActiveFilters && !isColumnSorted;

  /* ---------- Undo/Redo (igual ao construtor) ---------- */
  const pushHistory = (state) => {
    setHistory((h) => [...h, state]);
    setFuture([]);
  };

  const undo = () => {
    if (!history.length) return;
    setFuture((f) => [docs, ...f]);
    setHistory((h) => h.slice(0, -1));
    setDocs(history[history.length - 1]);
  };

  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, docs]);
    setFuture((f) => f.slice(1));
    setDocs(future[0]);
  };

  /* ---------- Mover UMA posição (setas ↑↓) ---------- */
  function moveDoc(id, direction) {
    const idx = docs.findIndex((d) => d.id === id);
    const next = idx + (direction === "up" ? -1 : 1);
    if (idx < 0 || next < 0 || next >= docs.length) return;
    pushHistory(docs);
    setDocs(arrayMove(docs, idx, next));
  }

  /* ---------- Drag & Drop ---------- */
  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    pushHistory(docs);
    setDocs(
      arrayMove(
        docs,
        docs.findIndex((d) => d.id === active.id),
        docs.findIndex((d) => d.id === over.id),
      ),
    );
  }

  /* ---------- Guardar: position = índice na lista (como o construtor), só nos documentos que mudaram ---------- */
  async function save() {
    setIsSaving(true);
    try {
      // O update reescreve `country`: envia-se o valor atual para não o perder
      for (const [index, doc] of docs.entries()) {
        if (doc.position !== index)
          await axios.post(endpoints.document.update, {
            data: { id: doc.id, position: index, country: doc.country },
          });
      }
      getData();
      toastApi.success(t("State saved!"));
    } catch (err) {
      console.log(err);
      toastApi.error(t("Failed to save."));
    } finally {
      setIsSaving(false);
    }
  }

  const rows = filterRows(tableData);

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} nameRule={nameRule} />
      <Update
        data={selectedData}
        open={isOpenUpdate}
        close={closeAction}
        nameRule={nameRule}
      />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="document"
      />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Documents")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">
            {t("{{total}} documents", { total: rows.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <ExportButton
            table="documents"
            data={rows.map((r) => r.full_data)}
            columns={[
              { title: "ID", dataIndex: "id" },
              { title: "Name", dataIndex: "name" },
              { title: "Slug", dataIndex: "slug" },
              languageColumn,
              { title: "Country", dataIndex: "country" },
              activityColumn,
              createdColumn,
            ]}
          />
          <RefreshButton size="large" onClick={getData} disabled={isUnsaved} />
          {perm.canCreate && (
            <Button
              size="large"
              onClick={() => setIsOpenCreate(true)}
              icon={<AiOutlinePlus />}>
              {t("Add document")}
            </Button>
          )}
        </div>
      </div>
      <DndContext
        sensors={sensors}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}>
        <SortableContext
          items={rows.map((r) => r.id)}
          strategy={verticalListSortingStrategy}>
          <Table
            rowKey="id"
            components={canSort ? { body: { row: SortableRow } } : undefined}
            dataSource={rows}
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            onChange={(_pagination, _filters, sorter) =>
              setIsColumnSorted(!!sorter?.order)
            }
            columns={[
              {
                title: "",
                dataIndex: "sort",
                key: "sort",
                width: "50px",
                hidden: !canSort,
              },
              {
                title: "",
                dataIndex: "img",
                key: "img",
                width: "100px",
              },
              {
                title: t("Name"),
                dataIndex: "name",
                key: "name",
                sort: true,
                sortType: "text",
                width: 350,
              },
              {
                title: t("File"),
                dataIndex: "file",
                key: "file",
              },
              {
                title: t("Country"),
                dataIndex: "country",
                key: "country",
              },
              {
                title: t("Status"),
                dataIndex: "is_deleted",
                key: "is_deleted",
                width: "150px",
              },
              {
                title: "",
                dataIndex: "arrows",
                key: "arrows",
                width: "80px",
                hidden: !canSort,
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
      {/* Rodapé fixo com anular, refazer e guardar (o mesmo do construtor de cursos) */}
      {perm.canUpdate && (
        <PageFooter className="justify-end px-4 md:px-6">
          <Space wrap className="justify-end">
            {isUnsaved && (
              <span className="text-[12px] text-[#8A8D98]">
                {t("Unsaved changes")}
              </span>
            )}
            <Button onClick={undo} disabled={!history.length || isSaving}>
              {t("Undo")}
            </Button>
            <Button onClick={redo} disabled={!future.length || isSaving}>
              {t("Redo")}
            </Button>
            <Button
              type="primary"
              onClick={save}
              disabled={!isUnsaved || isSaving}
              loading={isSaving}>
              {t("Save")}
            </Button>
          </Space>
        </PageFooter>
      )}
    </div>
  );
}
