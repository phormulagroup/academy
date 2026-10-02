import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePermission } from "../../utils/usePermission";
import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  InboxOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Progress,
  Select,
  Skeleton,
  Tooltip,
  Upload,
} from "antd";
import axios from "axios";
import { RxCross2 } from "react-icons/rx";
import { useTranslation } from "react-i18next";

import config from "../../utils/config";
import endpoints from "../../utils/endpoints";

import Delete from "../../components/admin/delete";
import upload from "../../utils/upload";
import { Context } from "../../utils/context";

const { Dragger } = Upload;
const { Meta } = Card;

// Tempo mínimo que cada ficheiro fica visível como "a carregar": sem isto, um upload rápido troca para a
// pré-visualização tão depressa que o utilizador nem chega a perceber que aconteceu alguma coisa
const MIN_VISIBLE_MS = 600;

const EXTENSIONS = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"],
  pdf: ["pdf"],
  presentation: ["ppt", "pptx"],
  video: ["mp4", "mov", "webm", "avi", "mkv"],
};

function getFileType(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  return Object.keys(EXTENSIONS).find((k) => EXTENSIONS[k].includes(ext)) || "other";
}

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

// Ícone grande de um tipo de ficheiro sem pré-visualização como imagem
function KindIcon({ type, className }) {
  if (type === "pdf") return <FilePdfOutlined className={className} />;
  if (type === "presentation") return <FilePptOutlined className={className} />;
  if (type === "video") return <VideoCameraOutlined className={className} />;
  return <FileOutlined className={className} />;
}

function Media() {
  const { messageApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("media");
  const [selectedMedia, setSelectedMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [uploadingItems, setUploadingItems] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Ecrã de detalhes (pré-visualização, tipo, dimensões e tamanho), aberto ao clicar num ficheiro da grelha
  const [detailsItem, setDetailsItem] = useState(null);
  const [detailsInfo, setDetailsInfo] = useState({ sizeBytes: null, width: null, height: null });

  // Os ficheiros escolhidos numa mesma ação (um clique/drag) partilham o mesmo array fileList: usa-se essa
  // referência para saber quando começa um novo lote e dar 1 só resumo no fim, em vez de 1 mensagem por ficheiro
  const currentFileListRef = useRef(null);
  const currentBatchRef = useRef(null);

  const [media, setMedia] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 32;
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState([]);

  const filteredMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    return media.filter(
      (item) =>
        (kindFilter.length === 0 || kindFilter.includes(getFileType(item.name))) &&
        (!term || item.name.toLowerCase().includes(term)),
    );
  }, [media, search, kindFilter]);

  const minValue = (currentPage - 1) * itemsPerPage;

  // Mudar a pesquisa ou o filtro volta sempre à 1.ª página
  useEffect(() => {
    setCurrentPage(1);
  }, [search, kindFilter]);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.media.read)
      .then((res) => {
        setMedia(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        messageApi.open({ type: "error", content: t("Failed to load media") });
      });
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
      messageApi.open({
        type: "success",
        content:
          batch.total === 1
            ? t("The file was uploaded successfully.")
            : t("All {{total}} files were uploaded successfully.", { total: batch.total }),
      });
    } else if (batch.succeeded === 0) {
      messageApi.open({
        type: "error",
        content:
          batch.total === 1
            ? t("The file could not be uploaded.")
            : t("None of the {{total}} files could be uploaded.", { total: batch.total }),
      });
    } else {
      messageApi.open({
        type: "warning",
        content: t("{{succeeded}} of {{total}} files were uploaded successfully, but {{failed}} failed.", {
          succeeded: batch.succeeded,
          total: batch.total,
          failed: batch.failed,
        }),
      });
    }

    // A grelha principal já mostra os ficheiros carregados: a tira temporária de pré-visualização deixa de ser precisa
    getData();
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
    messageApi.open({ type: "success", content: t("Image link copied") });
  }

  function handleOpenDelete(item) {
    setSelectedMedia(item);
    setIsOpenDelete(true);
  }

  function handleDeleteSuccess(deletedItem) {
    messageApi.open({
      type: "success",
      content: t("Asset") + ` "${deletedItem?.name || deletedItem?.id}" ` + t("was removed successfully"),
    });
  }

  function handleCloseDelete() {
    setIsOpenDelete(false);
    getData();
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

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((_id) => _id !== id) : [...prev, id]));
  }

  function exitSelectMode() {
    setIsSelectMode(false);
    setSelectedIds([]);
  }

  async function handleBulkDelete() {
    setIsBulkDeleting(true);
    try {
      const itemsToDelete = media.filter((m) => selectedIds.includes(m.id));
      await Promise.all(
        itemsToDelete.map((item) =>
          axios.post(endpoints.media.delete, { data: { id: item.id, name: item.name } }),
        ),
      );
      messageApi.open({
        type: "success",
        content:
          itemsToDelete.length === 1
            ? t("File deleted successfully.")
            : t("{{total}} files deleted successfully.", { total: itemsToDelete.length }),
      });
      exitSelectMode();
      getData();
    } catch (err) {
      console.log(err);
      messageApi.open({ type: "error", content: t("The selected files could not be deleted.") });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  const detailsType = detailsItem ? getFileType(detailsItem.name) : null;

  return (
    <div className="p-4 md:p-6 bg-white shadow rounded-[16px]">
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
            <div className="flex justify-center items-center h-40 bg-[#F6F7F9] rounded-[12px] overflow-hidden">
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
                <KindIcon type={detailsType} className="text-[50px]" />
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
            {filteredMedia.length === 1
              ? t("1 file")
              : t("{{total}} files", { total: filteredMedia.length })}
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
            <Popconfirm
              title={t("Delete files")}
              description={t("Are you sure you want to delete {{total}} file(s)?", { total: selectedIds.length })}
              onConfirm={handleBulkDelete}
              okText={t("Yes")}
              cancelText={t("No")}
              disabled={selectedIds.length === 0}>
              <Button type="primary" loading={isBulkDeleting} disabled={selectedIds.length === 0}>
                {t("Delete selected")}
                {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              </Button>
            </Popconfirm>
            <Button onClick={exitSelectMode}>{t("Cancel")}</Button>
          </div>
        ) : (
          <Button onClick={() => setIsSelectMode(true)}>{t("Bulk selection")}</Button>
        )}
      </div>
      {perm.canCreate && (
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t("Click or drag file to this area to upload")}</p>
        <p className="ant-upload-hint">
          {t("Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.")}
        </p>
      </Dragger>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-6">
        {uploadingItems.map((item) => (
          <div key={item.uid}>
            <Card
              className="media-card"
              cover={
                <div className="relative flex! justify-center items-center h-25 w-full">
                  {item.status === "uploading" ? (
                    <>
                      <Skeleton.Image active style={{ width: "100%", height: "100%" }} />
                      <Progress
                        percent={item.progress}
                        showInfo={false}
                        className="absolute! bottom-1 left-1/2 -translate-x-1/2 w-[calc(100%-16px)]!"
                      />
                    </>
                  ) : item.status === "error" ? (
                    <Tooltip title={item.name}>
                      <div className="flex flex-col justify-center items-center h-full w-full text-red-500">
                        <RxCross2 className="text-[24px]" />
                        <p className="text-[11px] text-center mt-1">{t("Failed")}</p>
                      </div>
                    </Tooltip>
                  ) : getFileType(item.fileName) === "image" ? (
                    <Tooltip title={item.name}>
                      <img src={mediaUrl(item.fileName)} className="w-full h-full object-contain" />
                    </Tooltip>
                  ) : (
                    <Tooltip title={item.name}>
                      <KindIcon type={getFileType(item.fileName)} className="text-[40px]" />
                    </Tooltip>
                  )}
                </div>
              }
              actions={[
                <EyeOutlined key="details" className="opacity-30!" />,
                <CopyOutlined key="copy" className="opacity-30!" />,
                <DeleteOutlined key="delete" className="opacity-30!" />,
              ].filter(Boolean)}>
              <Meta title={<p className="font-normal! text-[12px] line-clamp-1">{item.name}</p>} />
            </Card>
          </div>
        ))}
        {filteredMedia.slice(minValue, minValue + itemsPerPage).map((item) => {
          const type = getFileType(item.name);
          const isSelected = selectedIds.includes(item.id);
          return (
            <div key={item.id}>
              <Card
                className={`media-card${isSelected ? " media-card-selected" : ""}`}
                cover={
                  <div
                    className="relative flex! justify-center items-center h-25 w-full cursor-pointer"
                    onClick={isSelectMode ? () => toggleSelect(item.id) : () => handleOpenDetails(item)}>
                    {isSelectMode && (
                      <div
                        className={`absolute! top-2 right-2 z-10 w-6 h-6 rounded-[4px] border-2 border-white flex justify-center items-center ${isSelected ? "bg-[#163986]" : "bg-black/20"}`}>
                        {isSelected && <CheckOutlined className="text-white text-[12px]" />}
                      </div>
                    )}
                    {type === "image" ? (
                      <div
                        className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${mediaUrl(item.name)})` }}></div>
                    ) : (
                      <KindIcon type={type} className="text-[50px]" />
                    )}
                  </div>
                }
                actions={[
                  <Tooltip key="details" title={t("Details")}>
                    <EyeOutlined onClick={() => handleOpenDetails(item)} />
                  </Tooltip>,
                  <CopyOutlined key="copy" onClick={() => handleCopyClipboard(item.name)} />,
                  perm.canDelete && <DeleteOutlined key="delete" onClick={() => handleOpenDelete(item)} />,
                ].filter(Boolean)}>
                <Meta title={<p className="font-normal! text-[12px] line-clamp-1">{item.name}</p>} />
              </Card>
            </div>
          );
        })}
        {media.length > 0 && filteredMedia.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-8">{t("No files found")}</p>
        )}
        {filteredMedia.length > 0 && (
          <div className="col-span-full mt-4">
            <Pagination
              align="center"
              showSizeChanger={false}
              onChange={setCurrentPage}
              pageSize={itemsPerPage}
              current={currentPage}
              total={filteredMedia.length}
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
