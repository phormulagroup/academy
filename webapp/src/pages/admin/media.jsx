import { useContext, useEffect, useRef, useState } from "react";
import useDebounced from "../../utils/useDebounced";
import { useConfirm } from "../../components/admin/confirmModal";
import { usePermission } from "../../utils/usePermission";
import { CopyOutlined, DeleteOutlined, InboxOutlined, SearchOutlined } from "@ant-design/icons";
import { LuCheck, LuCopy, LuEye, LuTrash2, LuX } from "react-icons/lu";
import dayjs from "dayjs";
import {
  Button,
  Input,
  Modal,
  Pagination,
  Progress,
  Select,
  Skeleton,
  Tooltip,
  Upload,
} from "antd";
import axios from "axios";
import { useTranslation } from "react-i18next";

import config from "../../utils/config";
import endpoints from "../../utils/endpoints";

import Delete from "../../components/admin/delete";
import upload from "../../utils/upload";
import { CHECKER, FileBadge, fileKind } from "../../utils/fileKind";
import { Context } from "../../utils/context";

const { Dragger } = Upload;

// Tempo mínimo que cada ficheiro fica visível como "a carregar": sem isto, um upload rápido troca para a
// pré-visualização tão depressa que o utilizador nem chega a perceber que aconteceu alguma coisa
const MIN_VISIBLE_MS = 600;

const getFileType = (name = "") => fileKind(name).type;

const mediaUrl = (name) => `${config.server_ip}/media/${encodeURIComponent(name)}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Botão redondo das ações de um cartão (aparecem ao passar o rato)
function CardAction({ title, icon, onClick, danger = false }) {
  return (
    <Tooltip title={title}>
      <Button
        size="small"
        shape="circle"
        danger={danger}
        icon={icon}
        aria-label={title}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="shadow!"
      />
    </Tooltip>
  );
}

function Media() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("media");
  const [selectedMedia, setSelectedMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [uploadingItems, setUploadingItems] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [confirm, confirmHolder] = useConfirm();

  // Ecrã de detalhes (pré-visualização, tipo, dimensões e tamanho), aberto ao clicar num ficheiro da grelha
  const [detailsItem, setDetailsItem] = useState(null);
  const [detailsInfo, setDetailsInfo] = useState({ sizeBytes: null, width: null, height: null });

  // Os ficheiros escolhidos numa mesma ação (um clique/drag) partilham o mesmo array fileList: usa-se essa
  // referência para saber quando começa um novo lote e dar 1 só resumo no fim, em vez de 1 mensagem por ficheiro
  const currentFileListRef = useRef(null);
  const currentBatchRef = useRef(null);

  const [media, setMedia] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState([]);

  // Paginação, pesquisa e tipo são feitos no servidor: a página só pede os 30 ficheiros que mostra
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);
  const debouncedSearch = useDebounced(search.trim());
  const requestRef = useRef(0);
  const selectedFilesRef = useRef({}); // id → ficheiro, para apagar vários mesmo noutras páginas

  // Mudar a pesquisa ou o filtro volta sempre à 1.ª página
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, kindFilter]);

  useEffect(() => {
    getData();
  }, [currentPage, debouncedSearch, kindFilter, reload]);

  function getData() {
    const request = ++requestRef.current;
    setIsLoading(true);
    axios
      .get(endpoints.media.list, { params: { page: currentPage, limit: itemsPerPage, search: debouncedSearch, kinds: kindFilter.join(",") } })
      .then((res) => {
        if (request !== requestRef.current) return;
        // Apagou-se o último ficheiro da última página: recua uma
        if (res.data.rows.length === 0 && currentPage > 1) return setCurrentPage(currentPage - 1);
        setMedia(res.data.rows);
        setTotal(res.data.total);
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: t("Failed to load media") });
      })
      .finally(() => request === requestRef.current && setIsLoading(false));
  }

  function getBatch(fileList) {
    if (currentFileListRef.current !== fileList) {
      currentFileListRef.current = fileList;
      currentBatchRef.current = { total: fileList.length, succeeded: 0, failed: 0, settled: 0 };
    }
    return currentBatchRef.current;
  }

  function settleBatch(batch, success) {
    batch.settled += 1;
    if (success) batch.succeeded += 1;
    else batch.failed += 1;

    if (batch.settled < batch.total) return;

    if (batch.failed === 0) {
      toastApi.open({
        type: "success",
        content:
          batch.total === 1
            ? t("The file was uploaded successfully.")
            : t("All {{total}} files were uploaded successfully.", { total: batch.total }),
      });
    } else if (batch.succeeded === 0) {
      toastApi.open({
        type: "error",
        content:
          batch.total === 1
            ? t("The file could not be uploaded.")
            : t("None of the {{total}} files could be uploaded.", { total: batch.total }),
      });
    } else {
      toastApi.open({
        type: "warning",
        content: t("{{succeeded}} of {{total}} files were uploaded successfully, but {{failed}} failed.", {
          succeeded: batch.succeeded,
          total: batch.total,
          failed: batch.failed,
        }),
      });
    }

    // A grelha principal já mostra os ficheiros carregados: a tira temporária de pré-visualização deixa de ser precisa
    refresh();
    setUploadingItems([]);
  }

  const props = {
    name: "file",
    multiple: true,
    showUploadList: false,
    customRequest: handleUpload,
    beforeUpload: (file, fileList) => {
      const uid = file.uid;
      const batch = getBatch(fileList);

      setUploadingItems((prev) => [...prev, { uid, name: file.name, status: "uploading", progress: 0 }]);

      return new Promise(async (resolve, reject) => {
        try {
          let compressedFile = await upload.compress(file);
          // A compressão pode devolver um novo File/Blob sem o uid original: reatribui-se para
          // continuar a conseguir encontrar este item na lista
          compressedFile.uid = uid;
          resolve(compressedFile);
        } catch (err) {
          console.log(err);
          setUploadingItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, status: "error" } : it)));
          settleBatch(batch, false);
          reject(false);
        }
      });
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };

  function handleUpload({ file, onSuccess, onError }) {
    const batch = currentBatchRef.current;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("data", JSON.stringify({ type: "multimedia" }));

    const uploadResult = axios
      .post(endpoints.media.singleUpload, formData, {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadingItems((prev) => prev.map((it) => (it.uid === file.uid ? { ...it, progress: percent } : it)));
        },
      })
      .then((res) => ({ ok: true, res }))
      .catch((err) => ({ ok: false, err }));

    Promise.all([uploadResult, wait(MIN_VISIBLE_MS)]).then(([result]) => {
      if (result.ok) {
        setUploadingItems((prev) =>
          prev.map((it) => (it.uid === file.uid ? { ...it, status: "done", fileName: result.res.data } : it)),
        );
        settleBatch(batch, true);
        onSuccess(result.res);
      } else {
        console.log(result.err);
        setUploadingItems((prev) => prev.map((it) => (it.uid === file.uid ? { ...it, status: "error" } : it)));
        settleBatch(batch, false);
        onError(result.err);
      }
    });
  }

  function handleCopyClipboard(name) {
    navigator.clipboard.writeText(mediaUrl(name));
    toastApi.open({ type: "success", content: t("Image link copied") });
  }

  function handleOpenDelete(item) {
    setSelectedMedia(item);
    setIsOpenDelete(true);
  }

  function handleDeleteSuccess(deletedItem) {
    toastApi.open({
      type: "success",
      content: t("Asset") + ` "${deletedItem?.name || deletedItem?.id}" ` + t("was removed successfully"),
    });
  }

  function handleCloseDelete() {
    setIsOpenDelete(false);
    refresh();
  }

  // O servidor não tem endpoint de detalhes: o tamanho vem do cabeçalho do ficheiro e as dimensões da própria imagem
  function handleOpenDetails(item) {
    setDetailsItem(item);
    setDetailsInfo({ sizeBytes: null, width: null, height: null });
    fetch(mediaUrl(item.name), { method: "HEAD" })
      .then((res) => {
        const length = Number(res.headers.get("content-length"));
        if (length) setDetailsInfo((prev) => ({ ...prev, sizeBytes: length }));
      })
      .catch(() => {});
  }

  function toggleSelect(item) {
    if (selectedFilesRef.current[item.id]) delete selectedFilesRef.current[item.id];
    else selectedFilesRef.current[item.id] = item;
    setSelectedIds(Object.keys(selectedFilesRef.current).map(Number));
  }

  function exitSelectMode() {
    setIsSelectMode(false);
    selectedFilesRef.current = {};
    setSelectedIds([]);
  }

  async function handleBulkDelete() {
    setIsBulkDeleting(true);
    try {
      const itemsToDelete = Object.values(selectedFilesRef.current);
      await Promise.all(
        itemsToDelete.map((item) =>
          axios.post(endpoints.media.delete, { data: { id: item.id, name: item.name } }),
        ),
      );
      toastApi.open({
        type: "success",
        content:
          itemsToDelete.length === 1
            ? t("File deleted successfully.")
            : t("{{total}} files deleted successfully.", { total: itemsToDelete.length }),
      });
      exitSelectMode();
      refresh();
    } catch (err) {
      console.log(err);
      toastApi.open({ type: "error", content: t("The selected files could not be deleted.") });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  const detailsType = detailsItem ? getFileType(detailsItem.name) : null;

  return (
    <div className="p-4 md:p-6 bg-white shadow rounded-[16px]">
      {confirmHolder}
      <Delete
        table="media"
        open={isOpenDelete}
        close={handleCloseDelete}
        data={selectedMedia}
        onDeleteSuccess={handleDeleteSuccess}
      />
      <Modal
        title={t("File details")}
        open={!!detailsItem}
        onCancel={() => setDetailsItem(null)}
        style={{ maxWidth: "92vw" }}
        footer={[
          <Button key="close" onClick={() => setDetailsItem(null)}>
            {t("Close")}
          </Button>,
        ]}>
        {detailsItem && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex justify-center items-center h-40 rounded-[12px] overflow-hidden" style={detailsType === "image" ? CHECKER : { background: "#F6F7F9" }}>
              {detailsType === "image" ? (
                <img
                  src={mediaUrl(detailsItem.name)}
                  alt={detailsItem.name}
                  className="max-h-full max-w-full object-contain"
                  onLoad={(e) =>
                    setDetailsInfo((prev) => ({
                      ...prev,
                      width: e.target.naturalWidth,
                      height: e.target.naturalHeight,
                    }))
                  }
                />
              ) : detailsType === "video" ? (
                <video
                  src={mediaUrl(detailsItem.name)}
                  controls
                  preload="metadata"
                  className="max-h-full max-w-full"
                />
              ) : (
                <FileBadge name={detailsItem.name} size={72} />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-[#8A8D98] mb-0!">{t("File name")}</p>
                <p className="text-[13px] font-medium mb-0! truncate">{detailsItem.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Tooltip title={t("Copy link")}>
                  <Button icon={<CopyOutlined />} onClick={() => handleCopyClipboard(detailsItem.name)} />
                </Tooltip>
                {perm.canDelete && (
                  <Tooltip title={t("Delete")}>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const item = detailsItem;
                        setDetailsItem(null);
                        handleOpenDelete(item);
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#F6F7F9] rounded-[10px] py-2 px-1">
                <p className="text-[11px] text-[#8A8D98] mb-0!">{t("Dimensions")}</p>
                <p className="text-[13px] font-medium mb-0!">
                  {detailsInfo.width && detailsInfo.height ? `${detailsInfo.width} × ${detailsInfo.height} px` : "—"}
                </p>
              </div>
              <div className="bg-[#F6F7F9] rounded-[10px] py-2 px-1">
                <p className="text-[11px] text-[#8A8D98] mb-0!">{t("Size")}</p>
                <p className="text-[13px] font-medium mb-0!">{formatBytes(detailsInfo.sizeBytes)}</p>
              </div>
              <div className="bg-[#F6F7F9] rounded-[10px] py-2 px-1">
                <p className="text-[11px] text-[#8A8D98] mb-0!">{t("Type")}</p>
                <p className="text-[13px] font-medium mb-0! uppercase">{detailsItem.name.split(".").pop()}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("Multimedia")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">
            {total === 1
              ? t("1 file")
              : t("{{total}} files", { total })}
            {search.trim() || kindFilter.length ? ` ${t("found")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <Input
            allowClear
            placeholder={t("Search by file name")}
            prefix={<SearchOutlined />}
            className="w-full sm:w-64!"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder={t("All types")}
            className="w-full sm:w-64!"
            value={kindFilter}
            onChange={(v) => setKindFilter(v || [])}
            options={[
              { label: t("Images"), value: "image" },
              { label: t("Videos"), value: "video" },
              { label: "PDF", value: "pdf" },
              { label: t("Presentations"), value: "presentation" },
              { label: t("Other"), value: "other" },
            ]}
          />
        </div>
        {isSelectMode ? (
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Button
              type="primary"
              loading={isBulkDeleting}
              disabled={selectedIds.length === 0}
              onClick={() =>
                confirm({
                  tone: "danger",
                  title: t("Delete files"),
                  description: t("Are you sure you want to delete {{total}} file(s)?", { total: selectedIds.length }),
                  okText: t("Delete"),
                  onOk: handleBulkDelete,
                })
              }>
              {t("Delete selected")}
              {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Button>
            <Button onClick={exitSelectMode}>{t("Cancel")}</Button>
          </div>
        ) : (
          <Button onClick={() => setIsSelectMode(true)}>{t("Bulk selection")}</Button>
        )}
      </div>
      {perm.canCreate && (
      <Dragger {...props} style={{ borderRadius: 12, background: "#FAFAFB", borderWidth: 2 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t("Click or drag file to this area to upload")}</p>
        <p className="ant-upload-hint">
          {t("Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.")}
        </p>
      </Dragger>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-6">
        {/* Ficheiros a carregar: o mesmo cartão, com a barra de progresso */}
        {uploadingItems.map((item) => (
          <div key={item.uid} className="rounded-xl border border-solid border-[#E5E7EB] bg-white overflow-hidden">
            <div className="relative aspect-[4/3] grid place-items-center bg-[#F6F7FB]">
              {item.status === "uploading" ? (
                <>
                  <Skeleton.Image active style={{ width: "100%", height: "100%" }} />
                  <Progress percent={item.progress} showInfo={false} className="absolute! bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-24px)]!" />
                </>
              ) : item.status === "error" ? (
                <div className="flex flex-col items-center gap-1 text-red-500">
                  <LuX className="text-[26px]" />
                  <p className="text-[12px] mb-0!">{t("Failed")}</p>
                </div>
              ) : getFileType(item.fileName) === "image" ? (
                <img src={mediaUrl(item.fileName)} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <FileBadge name={item.fileName} size={48} />
              )}
            </div>
            <div className="px-3 py-2 border-0 border-t border-solid border-[#F0F0F0]">
              <p className="text-[12px] font-medium mb-0! truncate" title={item.name}>
                {item.name}
              </p>
              <p className="text-[11px] text-[#8A8D98] mb-0!">{item.status === "uploading" ? t("Uploading") : item.status === "error" ? t("The file could not be uploaded.") : t("Uploaded")}</p>
            </div>
          </div>
        ))}
        {media.map((item) => {
          const { type, color, ext } = fileKind(item.name);
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              title={item.name}
              onClick={isSelectMode ? () => toggleSelect(item) : () => handleOpenDetails(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (isSelectMode ? toggleSelect(item) : handleOpenDetails(item));
              }}
              className={`group relative cursor-pointer rounded-xl border border-solid bg-white overflow-hidden transition ${isSelected ? "border-[#163986] ring-2 ring-[#163986]" : "border-[#E5E7EB] hover:border-[#163986]/50 hover:shadow-sm"}`}>
              <div className="relative aspect-[4/3] grid place-items-center" style={type === "image" ? CHECKER : { background: "#F6F7FB" }}>
                {type === "image" ? (
                  <img src={mediaUrl(item.name)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileBadge name={item.name} size={48} />
                    <span className="text-[11px] font-semibold uppercase" style={{ color }}>
                      {ext}
                    </span>
                  </div>
                )}
                {isSelectMode && (
                  <span className={`absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow ${isSelected ? "bg-[#163986] text-white" : "bg-black/25"}`}>{isSelected && <LuCheck />}</span>
                )}
                {/* Ações ao passar o rato (em ecrãs táteis ficam sempre à vista); não aparecem na seleção em massa */}
                {!isSelectMode && (
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap justify-end gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    <CardAction title={t("Details")} icon={<LuEye />} onClick={() => handleOpenDetails(item)} />
                    <CardAction title={t("Copy link")} icon={<LuCopy />} onClick={() => handleCopyClipboard(item.name)} />
                    {perm.canDelete && <CardAction title={t("Delete")} danger icon={<LuTrash2 />} onClick={() => handleOpenDelete(item)} />}
                  </div>
                )}
              </div>
              <div className="px-3 py-2 border-0 border-t border-solid border-[#F0F0F0]">
                <p className="text-[12px] font-medium mb-0! truncate">{item.name}</p>
                <p className="text-[11px] text-[#8A8D98] mb-0!">{item.created_at ? dayjs(item.created_at).format("DD/MM/YYYY") : ""}</p>
              </div>
            </div>
          );
        })}
        {!isLoading && media.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-8">{t("No files found")}</p>
        )}
        {total > itemsPerPage && (
          <div className="col-span-full mt-4">
            <Pagination
              align="center"
              showSizeChanger={false}
              onChange={(page) => setCurrentPage(page)}
              pageSize={itemsPerPage}
              current={currentPage}
              total={total}
              showTotal={(total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`}
            />
          </div>
        )}
        {isLoading && media.length === 0 && uploadingItems.length === 0 && (
          <div className="col-span-full flex justify-center py-8">
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Media;
