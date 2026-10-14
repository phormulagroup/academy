import { useContext, useEffect, useMemo, useRef, useState } from "react";
import useDebounced from "../../utils/useDebounced";
import { usePermission } from "../../utils/usePermission";
import {
  InboxOutlined,
  LinkOutlined,
  SwapRightOutlined,
  EyeOutlined,
  ExclamationCircleFilled,
  SearchOutlined,
} from "@ant-design/icons";
import {
  LuCheck,
  LuCopy,
  LuDownload,
  LuExternalLink,
  LuQrCode,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";
import { useConfirm } from "../../components/admin/confirmModal";
import {
  Alert,
  Upload,
  Pagination,
  Input,
  Modal,
  Button,
  QRCode,
  Select,
  Skeleton,
  Tag,
  ConfigProvider,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import axios from "axios";

import endpoints from "../../utils/endpoints";
import Delete from "../../components/admin/delete";
import BulkSelectionBar, { SelectionAction } from "../../components/admin/bulkSelectionBar";
import useBulkSelection, { fetchAllPages } from "../../utils/useBulkSelection";
import { Context } from "../../utils/context";
import { CHECKER, FileBadge } from "../../utils/fileKind";

const { Dragger } = Upload;

// Endereço permanente do PDF (vem do servidor): é o que o QRCode impresso aponta e nunca muda
const fileUrl = (item) => item.url;

const ACCEPTED = ["pdf", "mp4", "png", "jpg", "jpeg"];
const extOf = (name = "") => name.split(".").pop().toLowerCase();
const kindOf = (name) =>
  extOf(name) === "mp4" ? "video" : extOf(name) === "pdf" ? "pdf" : "image";

// Guarda um ficheiro (blob) com o nome dado
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatSize = (bytes) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Pré-visualização em grande (PDF, imagem ou vídeo), por cima do modal de aviso
function PreviewModal({ preview, onClose }) {
  if (!preview) return null;
  const kind = kindOf(preview.name);
  return (
    <Modal
      open
      centered
      width={900}
      footer={null}
      title={preview.name}
      onCancel={onClose}
      destroyOnHidden
      zIndex={1100}>
      <div className="h-[70vh] bg-gray-100 flex items-center justify-center">
        {kind === "video" ? (
          <video
            src={preview.url}
            controls
            autoPlay
            className="w-full h-full bg-black"
          />
        ) : kind === "image" ? (
          <img
            src={preview.url}
            alt={preview.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <iframe
            title={preview.name}
            src={preview.url}
            className="w-full h-full border-0"
          />
        )}
      </div>
    </Modal>
  );
}

// Cartão do ficheiro (atual ou novo): tipo, nome e botão de pré-visualização
function FileCard({ label, tone, name, meta, onPreview, t }) {
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-solid border-[#E5E7EB] bg-[#FAFAFB] p-4 flex flex-col items-center text-center gap-2">
      <Tag color={tone} className="m-0!">
        {label}
      </Tag>
      <div className="my-2">
        <FileBadge name={name} size={64} />
      </div>
      <p className="text-[13px] font-semibold break-all m-0">{name}</p>
      <p className="text-[12px] text-gray-500 m-0 min-h-4">{meta}</p>
      <Button icon={<EyeOutlined />} onClick={onPreview}>
        {t("Preview")}
      </Button>
    </div>
  );
}

function ReplaceModal({ dialog, onClose, t }) {
  const [preview, setPreview] = useState(null);
  const newUrl = useMemo(
    () => (dialog ? URL.createObjectURL(dialog.file) : null),
    [dialog],
  );

  useEffect(() => () => newUrl && URL.revokeObjectURL(newUrl), [newUrl]);

  if (!dialog) return null;
  const { oldItem, file } = dialog;
  const oldMeta = oldItem.updated_at
    ? `${formatSize(oldItem.size)} · ${dayjs(oldItem.updated_at).format("DD/MM/YYYY HH:mm")}`
    : "";

  return (
    <>
      <Modal
        open
        width={680}
        centered
        maskClosable={false}
        title={
          <span className="flex items-center gap-2">
            <ExclamationCircleFilled className="text-amber-500" />
            {t("This file already exists")}
          </span>
        }
        onCancel={() => onClose(false)}
        footer={[
          <Button key="cancel" onClick={() => onClose(false)}>
            {t("Cancel")}
          </Button>,
          <ConfigProvider
            key="ok"
            theme={{ token: { colorPrimary: "#00b9d6" } }}>
            <Button type="primary" onClick={() => onClose(true)}>
              {t("Replace")}
            </Button>
          </ConfigProvider>,
        ]}>
        <p className="mb-4">
          {t(
            "Uploading will replace the current file. The link and QR code will not change.",
          )}
        </p>
        <div className="flex items-stretch gap-3">
          <FileCard
            t={t}
            label={t("Current file")}
            tone="default"
            name={oldItem.name}
            meta={oldMeta}
            onPreview={() =>
              setPreview({
                name: oldItem.name,
                url: `${oldItem.url}?v=${new Date(oldItem.updated_at).getTime()}`,
              })
            }
          />
          <div className="flex items-center text-2xl text-gray-400">
            <SwapRightOutlined />
          </div>
          <FileCard
            t={t}
            label={t("New file")}
            tone="blue"
            name={file.name}
            meta={formatSize(file.size)}
            onPreview={() => setPreview({ name: file.name, url: newUrl })}
          />
        </div>
      </Modal>
      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function Iec() {
  const { t, toastApi } = useContext(Context);
  const [confirm, confirmHolder] = useConfirm();
  const perm = usePermission("iec");
  const [iecs, setIecs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [qrItem, setQrItem] = useState(null);
  const [replaceDialog, setReplaceDialog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState([]);
  const itemsPerPage = 30;
  const selection = useBulkSelection();
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Paginação e pesquisa são feitas no servidor: a página só pede os 30 IECs que mostra
  const [total, setTotal] = useState(0);
  // IECs ativos na biblioteca (sem filtros) e o máximo permitido pelo servidor
  const [usage, setUsage] = useState({ active: null, max: 100 });
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);
  const debouncedSearch = useDebounced(search.trim());
  const requestRef = useRef(0);

  // Mudar a pesquisa ou o filtro volta à 1.ª página
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
      .get(endpoints.iec.list, {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          kinds: kindFilter.join(","),
        },
      })
      .then((res) => {
        if (request !== requestRef.current) return;
        // Apagou-se o último ficheiro da última página: recua uma
        if (res.data.rows.length === 0 && currentPage > 1)
          return setCurrentPage(currentPage - 1);
        setIecs(res.data.rows);
        setTotal(res.data.total);
        if (res.data.max) setUsage({ active: res.data.active, max: res.data.max });
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: t("Failed to load IECs") });
      })
      .finally(() => request === requestRef.current && setIsLoading(false));
  }

  // Abre o modal de comparação e resolve com true/false conforme o utilizador confirme ou cancele
  // Em fila: com vários ficheiros a substituir, um modal de cada vez
  const confirmQueue = useRef(Promise.resolve());
  function confirmReplace(file, oldItem) {
    const ask = confirmQueue.current.then(
      () =>
        new Promise((resolve) => setReplaceDialog({ file, oldItem, resolve })),
    );
    confirmQueue.current = ask;
    return ask;
  }

  function closeReplace(confirmed) {
    replaceDialog.resolve(confirmed);
    setReplaceDialog(null);
  }

  // Um lote = os ficheiros largados/escolhidos de uma vez. Em vez de uma mensagem por ficheiro,
  // mostra-se um resumo único no fim e, havendo erros, um alerta com a lista.
  const batch = useRef({
    total: 0,
    pending: 0,
    ok: 0,
    replaced: 0,
    skipped: 0,
    errors: [],
    timer: null,
  });

  function batchStart() {
    const b = batch.current;
    if (b.pending === 0)
      Object.assign(b, {
        total: 0,
        ok: 0,
        replaced: 0,
        skipped: 0,
        errors: [],
      });
    b.total++;
    b.pending++;
  }

  function batchDone(result, name, reason) {
    const b = batch.current;
    if (result === "ok" || result === "replaced") b.ok++;
    if (result === "replaced") b.replaced++;
    if (result === "skipped") b.skipped++;
    if (result === "error") b.errors.push({ name, reason });
    b.pending--;
    // pequena espera: os ficheiros do mesmo lote chegam ao beforeUpload em instantes ligeiramente diferentes
    clearTimeout(b.timer);
    if (b.pending === 0) b.timer = setTimeout(batchFinish, 300);
  }

  function batchFinish() {
    const b = batch.current;
    if (b.pending !== 0) return;
    refresh();
    const extra = [
      b.replaced && `${b.replaced} ${t("replaced")}`,
      b.skipped && `${b.skipped} ${t("skipped")}`,
    ]
      .filter(Boolean)
      .join(", ");
    const counted = b.total - b.skipped;
    // Tudo cancelado (nada foi enviado nem falhou): não faz sentido um "0/0 com sucesso"
    if (counted === 0) {
      toastApi.open({
        key: "iec-upload",
        type: "info",
        content: t("Upload cancelled"),
      });
      return;
    }
    toastApi.open({
      key: "iec-upload",
      type: b.errors.length ? "warning" : "success",
      content: `${b.ok}/${counted} ${t("files uploaded successfully")}${extra ? ` (${extra})` : ""}`,
    });
    if (b.errors.length) {
      confirm({
        title: t("Some files could not be uploaded"),
        tone: "danger",
        icon: <LuTriangleAlert />,
        hideCancel: true,
        danger: false,
        okText: t("Close"),
        children: (
          <ul className="list-disc pl-5 mt-2">
            {b.errors.map((e) => (
              <li key={e.name}>
                <b>{e.name}</b>: {e.reason}
              </li>
            ))}
          </ul>
        ),
      });
    }
  }

  async function handleUpload({ file, onSuccess, onError }) {
    try {
      const { data: check } = await axios.post(endpoints.iec.check, {
        names: [file.name],
      });
      const exists = check.existing.length > 0;
      if (exists) {
        const oldItem = check.items?.find((i) => i.name === file.name) || {
          name: check.existing[0],
        };
        if (!(await confirmReplace(file, oldItem))) {
          onError(new Error("cancelled"));
          return batchDone("skipped", file.name);
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("replace", exists ? "1" : "0");
      let res;
      try {
        res = await axios.post(endpoints.iec.upload, formData);
      } catch (err) {
        // O servidor é quem decide: se afinal o ficheiro já existia, pede confirmação e repete com replace
        if (err.response?.status !== 409) throw err;
        const { data: again } = await axios
          .post(endpoints.iec.check, { names: [file.name] })
          .catch(() => ({ data: {} }));
        const oldItem = again.items?.find((i) => i.name === file.name) || {
          name: file.name,
        };
        if (!(await confirmReplace(file, oldItem))) {
          onError(new Error("cancelled"));
          return batchDone("skipped", file.name);
        }
        formData.set("replace", "1");
        res = await axios.post(endpoints.iec.upload, formData);
      }
      onSuccess(res.data);
      batchDone(res.data.replaced ? "replaced" : "ok", file.name);
    } catch (err) {
      console.log(err);
      onError(err);
      batchDone(
        "error",
        file.name,
        // Limite atingido no servidor (ex.: outro utilizador enviou IECs entretanto)
        err.response?.data?.limit
          ? t("IEC limit reached")
          : err.response?.data?.message || t("file upload failed."),
      );
    }
  }

  // Limite de IECs: antes de enviar, confirma (uma vez por lote) se os ficheiros novos cabem; substituir não conta.
  // O servidor volta a verificar em cada upload.
  const limitCheck = useRef({ fileList: null, promise: null });
  function checkLimit(fileList) {
    if (limitCheck.current.fileList !== fileList) {
      const names = fileList.map((f) => f.name).filter((n) => ACCEPTED.includes(extOf(n)));
      const promise = !names.length
        ? Promise.resolve(true)
        : axios
            .post(endpoints.iec.check, { names })
            .then(({ data }) => {
              const newCount = names.filter((n) => !data.existing.includes(n)).length;
              const available = Math.max(0, data.max - data.active);
              if (newCount <= available) return true;
              showLimitAlert({ newCount, available, max: data.max });
              return false;
            })
            .catch(() => true);
      limitCheck.current = { fileList, promise };
    }
    return limitCheck.current.promise;
  }

  function showLimitAlert({ newCount, available, max }) {
    confirm({
      tone: "warning",
      title: t("IEC limit reached"),
      description:
        available === 0
          ? t("The library already has {{max}} IECs, the maximum allowed. No more IECs can be added: delete some IECs to free up space.", { max })
          : t("You are trying to add {{count}} new IECs, but only {{available}} more can be added (maximum {{max}}). Delete some IECs or upload fewer files.", { count: newCount, available, max }),
      hideCancel: true,
      okText: t("Close"),
    });
  }

  const props = {
    name: "file",
    multiple: true,
    accept: ACCEPTED.map((e) => `.${e}`).join(","),
    showUploadList: false,
    customRequest: handleUpload,
    beforeUpload: async (file, fileList) => {
      if (!(await checkLimit(fileList))) return Upload.LIST_IGNORE;
      batchStart();
      if (ACCEPTED.includes(extOf(file.name))) return true;
      batchDone(
        "error",
        file.name,
        t("Only PDF, MP4, PNG and JPG files are allowed"),
      );
      return Upload.LIST_IGNORE;
    },
  };

  function handleCopyLink(item) {
    navigator.clipboard.writeText(fileUrl(item));
    toastApi.open({ type: "success", content: t("Link copied") });
  }

  function handleDownloadQr() {
    const canvas = document
      .getElementById("iec-qrcode")
      ?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${qrItem.name.replace(/\.[^.]+$/, "")}-qrcode.png`;
    a.click();
  }

  function handleOpenDelete(item) {
    setSelected(item);
    setIsOpenDelete(true);
  }

  function handleDeleteSuccess(deletedItem) {
    toastApi.open({
      type: "success",
      content: `IEC "${deletedItem?.name}" ${t("was removed successfully")}`,
    });
  }

  function handleCloseDelete() {
    setIsOpenDelete(false);
    refresh();
  }

  // Selecionar tudo = todos os IECs da pesquisa e do filtro atuais, em todas as páginas (não só os 30 à vista)
  function handleSelectAll() {
    const loadAll = () =>
      fetchAllPages(endpoints.iec.list, {
        search: debouncedSearch,
        kinds: kindFilter.join(","),
      });
    selection.selectAll(loadAll).catch((err) => {
      console.log(err);
      toastApi.open({ type: "error", content: t("Failed to load IECs") });
    });
  }

  // Vários IECs: um só ZIP gerado no servidor (AAAA-MM-DD_HHmmss_Bial_Regional_Academy_IECs.zip); um só IEC: o próprio ficheiro
  async function downloadZip(items) {
    setIsDownloading(true);
    toastApi.open({
      key: "iec-download",
      type: "info",
      duration: 0,
      content: t("Preparing the ZIP with {{total}} files", {
        total: items.length,
      }),
    });
    try {
      const res = await axios.post(
        endpoints.iec.zip,
        { data: { names: items.map((i) => i.name) } },
        { responseType: "blob" },
      );
      const fromHeader = /filename="([^"]+)"/.exec(
        res.headers["content-disposition"] || "",
      )?.[1];
      saveBlob(
        res.data,
        fromHeader ||
          `${dayjs().format("YYYY-MM-DD_HHmmss")}_Bial_Regional_Academy_IECs.zip`,
      );
      toastApi.open({
        key: "iec-download",
        type: "success",
        content: t("{{succeeded}} of {{total}} files downloaded", {
          succeeded: items.length,
          total: items.length,
        }),
      });
    } catch (err) {
      console.log(err);
      // A resposta de erro vem como blob: lê a mensagem do servidor (ex.: limite de 4 GB)
      const message = await err.response?.data
        ?.text?.()
        .then((txt) => JSON.parse(txt).message)
        .catch(() => null);
      toastApi.open({
        key: "iec-download",
        type: "error",
        content: message ? t(message) : t("Some files could not be downloaded"),
      });
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleBulkDownload() {
    const items = selection.items;
    if (items.length > 1) return downloadZip(items);
    const failed = [];
    setIsDownloading(true);
    for (let i = 0; i < items.length; i++) {
      toastApi.open({
        key: "iec-download",
        type: "info",
        duration: 0,
        content: t("Downloading {{current}} of {{total}}", {
          current: i + 1,
          total: items.length,
        }),
      });
      try {
        const res = await axios.get(endpoints.iec.file, {
          params: { name: items[i].name },
          responseType: "blob",
        });
        saveBlob(res.data, items[i].name);
        // pequena pausa: o browser ignora downloads seguidos demasiado depressa
        await wait(400);
      } catch (err) {
        console.log(err);
        failed.push(items[i].name);
      }
    }
    setIsDownloading(false);
    toastApi.open({
      key: "iec-download",
      type: failed.length ? "warning" : "success",
      content: t("{{succeeded}} of {{total}} files downloaded", {
        succeeded: items.length - failed.length,
        total: items.length,
      }),
    });
    if (failed.length) {
      confirm({
        title: t("Some files could not be downloaded"),
        tone: "danger",
        icon: <LuTriangleAlert />,
        hideCancel: true,
        danger: false,
        okText: t("Close"),
        children: (
          <ul className="list-disc pl-5 mt-2">
            {failed.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ),
      });
    }
  }

  // Apaga (move para _deleted) os selecionados, 100 nomes por pedido
  async function handleBulkDelete() {
    const names = selection.items.map((i) => i.name);
    setIsBulkDeleting(true);
    try {
      for (let i = 0; i < names.length; i += 100) {
        await axios.post(endpoints.iec.delete, {
          data: { names: names.slice(i, i + 100) },
        });
      }
      toastApi.open({
        type: "success",
        content:
          names.length === 1
            ? t("File deleted successfully.")
            : t("{{total}} files deleted successfully.", {
                total: names.length,
              }),
      });
      selection.exit();
    } catch (err) {
      console.log(err);
      toastApi.open({
        type: "error",
        content: t("The selected files could not be deleted."),
      });
    } finally {
      setIsBulkDeleting(false);
      refresh();
    }
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow rounded-[16px]">
      {confirmHolder}
      <Delete
        table="iec"
        open={isOpenDelete}
        close={handleCloseDelete}
        data={selected || {}}
        onDeleteSuccess={handleDeleteSuccess}
      />
      <ReplaceModal dialog={replaceDialog} onClose={closeReplace} t={t} />
      <Modal
        open={!!qrItem}
        onCancel={() => setQrItem(null)}
        title={qrItem?.name}
        width={380}
        footer={[
          <Button
            key="link"
            icon={<LinkOutlined />}
            onClick={() => handleCopyLink(qrItem)}>
            {t("Copy link")}
          </Button>,
          <Button key="download" type="primary" onClick={handleDownloadQr}>
            {t("Download QR code")}
          </Button>,
        ]}>
        {qrItem && (
          <div
            id="iec-qrcode"
            className="flex flex-col items-center gap-3 py-2">
            <QRCode
              value={fileUrl(qrItem)}
              size={280}
              errorLevel="H"
              bordered={false}
            />
            <p className="text-[12px] text-gray-500 break-all text-center">
              {fileUrl(qrItem)}
            </p>
          </div>
        )}
      </Modal>

      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold font-ryker">{t("IECs")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0! flex items-center gap-2 flex-wrap">
            <span>
              {isLoading && total === 0
                ? "…"
                : total === 1
                  ? t("1 file")
                  : t("{{total}} files", { total })}
              {(search.trim() || kindFilter.length) && !(isLoading && total === 0)
                ? ` ${t("found")}`
                : ""}
            </span>
            {usage.active != null && (
              <Tooltip title={t("IECs in the library / maximum allowed")}>
                <Tag
                  className="m-0! tabular-nums"
                  color={usage.active >= usage.max ? "red" : usage.active >= usage.max * 0.9 ? "orange" : "blue"}>
                  {usage.active}/{usage.max}
                </Tag>
              </Tooltip>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <Input
            allowClear
            className="w-full sm:w-64!"
            prefix={<SearchOutlined />}
            placeholder={t("Search by file name")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* Os mesmos tipos da Multimédia, só com os aceites nos IECs */}
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder={t("All types")}
            className="w-full sm:w-64!"
            value={kindFilter}
            onChange={(v) => setKindFilter(v || [])}
            options={[
              { label: "PDF", value: "pdf" },
              { label: `${t("Videos")} (MP4)`, value: "video" },
              { label: `${t("Images")} (PNG, JPG)`, value: "image" },
            ]}
          />
          {/* Mesmo texto e largura nos dois modos (só muda o estilo): entrar/sair da seleção não mexe nos filtros ao lado */}
          <Button
            type={selection.isSelectMode ? "primary" : "default"}
            aria-pressed={selection.isSelectMode}
            onClick={() => (selection.isSelectMode ? selection.exit() : selection.enter())}>
            {t("Bulk selection")}
          </Button>
        </div>
      </div>
      {/* Barra da seleção numa linha própria e com altura fixa: selecionar IECs não mexe no resto da página */}
      {selection.isSelectMode && (
        <div className="flex items-center min-h-8 mb-4">
          <BulkSelectionBar selection={selection} total={total} onSelectAll={() => handleSelectAll()}>
            <SelectionAction selection={selection}>
              <Button
                icon={<LuDownload />}
                loading={isDownloading}
                disabled={selection.count === 0 || selection.isSelectingAll}
                onClick={handleBulkDownload}>
                {t("Download selected")}
              </Button>
            </SelectionAction>
            {perm.canDelete && (
              <SelectionAction selection={selection}>
                <Button
                  type="primary"
                  loading={isBulkDeleting}
                  disabled={selection.count === 0 || selection.isSelectingAll || isDownloading}
                  onClick={() =>
                    confirm({
                      tone: "danger",
                      title: t("Delete files"),
                      description: t("Are you sure you want to delete {{total}} file(s)?", { total: selection.count }),
                      okText: t("Delete"),
                      onOk: handleBulkDelete,
                      children: (
                        <p className="mb-0! text-[13px] text-center text-[#5B5F6B]">
                          {t("The QR codes of these IECs will stop working.")}
                        </p>
                      ),
                    })
                  }>
                  {t("Delete selected")}
                </Button>
              </SelectionAction>
            )}
          </BulkSelectionBar>
        </div>
      )}
      <Alert
        type="info"
        showIcon
        closable
        className="mb-4! border-[#00b9d6]/30! bg-[#E6F9FC]!"
        title={t("To download one or more IECs, use {{action}}. When more than one IEC is downloaded, they come in a single ZIP file.", { action: `"${t("Bulk selection")}"` })}
      />
      {perm.canCreate && (
        <Dragger
          {...props}
          style={{ borderRadius: 12, background: "#FAFAFB", borderWidth: 2 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {t(
              "Click or drag PDF, MP4, PNG or JPG files to this area to upload",
            )}
          </p>
          <p className="ant-upload-hint">
            {t(
              "Uploading a file with an existing name replaces it. The QR code of each IEC never changes.",
            )}
          </p>
        </Dragger>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-6">
        {/* Enquanto carrega: esqueletos com a forma dos cartões */}
        {isLoading &&
          Array.from({ length: iecs.length || 12 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="rounded-xl border border-solid border-[#E5E7EB] bg-white overflow-hidden">
              <Skeleton.Node
                active
                style={{ width: "100%", height: 132, borderRadius: 0 }}>
                <span />
              </Skeleton.Node>
              <div className="px-3 py-2 border-0 border-t border-solid border-[#F0F0F0]">
                <Skeleton
                  active
                  title={false}
                  paragraph={{ rows: 2, width: ["80%", "50%"] }}
                />
              </div>
            </div>
          ))}
        {!isLoading &&
          iecs.map((item) => {
            const kind = kindOf(item.name);
            const isSelected = selection.isSelected(item);
            // Na seleção em massa, clicar no cartão seleciona/desmarca
            const selectProps = selection.isSelectMode
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => selection.toggle(item),
                  onKeyDown: (e) => e.key === "Enter" && selection.toggle(item),
                }
              : {};
            return (
              <div
                key={item.id}
                {...selectProps}
                className={`group relative rounded-xl border border-solid bg-white overflow-hidden transition ${selection.isSelectMode ? "cursor-pointer" : ""} ${isSelected ? "border-[#163986] ring-2 ring-[#163986]" : "border-[#E5E7EB] hover:border-[#163986]/50 hover:shadow-sm"}`}
                title={item.name}>
                {/* Imagens com miniatura; PDF e vídeo com o ícone do tipo (o mesmo da Multimédia) */}
                <div
                  className="relative aspect-[4/3] grid place-items-center"
                  style={
                    kind === "image" && !item.missing
                      ? CHECKER
                      : { background: "#F6F7FB" }
                  }>
                  {kind === "image" && !item.missing ? (
                    <img
                      src={fileUrl(item)}
                      alt=""
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <FileBadge name={item.name} size={48} />
                      <span className="text-[11px] font-semibold uppercase text-[#8A8D98]">
                        {extOf(item.name)}
                      </span>
                    </div>
                  )}
                  {item.missing && (
                    <Tag
                      color="red"
                      className={`absolute! top-2 m-0! ${selection.isSelectMode ? "left-10" : "left-2"}`}>
                      {t("File missing")}
                    </Tag>
                  )}
                  {selection.isSelectMode && (
                    <span
                      className={`absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow ${isSelected ? "bg-[#163986] text-white" : "bg-black/25"}`}>
                      {isSelected && <LuCheck />}
                    </span>
                  )}
                  {/* Ações ao passar o rato; não aparecem na seleção em massa */}
                  {!selection.isSelectMode && (
                    <div className="absolute top-2 left-2 right-2 flex flex-wrap justify-end gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                      <Tooltip title={t("QR code")}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<LuQrCode />}
                          aria-label={t("QR code")}
                          onClick={() => setQrItem(item)}
                          className="shadow!"
                        />
                      </Tooltip>
                      <Tooltip title={t("Copy link")}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<LuCopy />}
                          aria-label={t("Copy link")}
                          onClick={() => handleCopyLink(item)}
                          className="shadow!"
                        />
                      </Tooltip>
                      <Tooltip title={t("Open")}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<LuExternalLink />}
                          aria-label={t("Open")}
                          onClick={() => window.open(fileUrl(item), "_blank")}
                          className="shadow!"
                        />
                      </Tooltip>
                      {perm.canDelete && (
                        <Tooltip title={t("Delete")}>
                          <Button
                            size="small"
                            shape="circle"
                            danger
                            icon={<LuTrash2 />}
                            aria-label={t("Delete")}
                            onClick={() => handleOpenDelete(item)}
                            className="shadow!"
                          />
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-0 border-t border-solid border-[#F0F0F0]">
                  <p className="text-[12px] font-medium mb-0! truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-[#8A8D98] mb-0!">
                    {[
                      item.size ? formatSize(item.size) : null,
                      item.updated_at
                        ? dayjs(item.updated_at).format("DD/MM/YYYY")
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        {!isLoading && iecs.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-8">
            {t("No files found")}
          </p>
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
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Iec;
