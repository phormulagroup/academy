import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePermission } from "../../utils/usePermission";
import { InboxOutlined, LinkOutlined, SwapRightOutlined, EyeOutlined, ExclamationCircleFilled, SearchOutlined } from "@ant-design/icons";
import { LuCopy, LuExternalLink, LuQrCode, LuTrash2, LuTriangleAlert } from "react-icons/lu";
import { useConfirm } from "../../components/admin/confirmModal";
import { Upload, Pagination, Input, Modal, Button, QRCode, Tag, ConfigProvider, Tooltip } from "antd";
import dayjs from "dayjs";
import axios from "axios";

import endpoints from "../../utils/endpoints";
import Delete from "../../components/admin/delete";
import { Context } from "../../utils/context";
import { CHECKER, FileBadge } from "../../utils/fileKind";

const { Dragger } = Upload;

// Endereço permanente do PDF (vem do servidor): é o que o QRCode impresso aponta e nunca muda
const fileUrl = (item) => item.url;

const ACCEPTED = ["pdf", "mp4", "png", "jpg", "jpeg"];
const extOf = (name = "") => name.split(".").pop().toLowerCase();
const kindOf = (name) => (extOf(name) === "mp4" ? "video" : extOf(name) === "pdf" ? "pdf" : "image");

const formatSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);


// Pré-visualização em grande (PDF, imagem ou vídeo), por cima do modal de aviso
function PreviewModal({ preview, onClose }) {
  if (!preview) return null;
  const kind = kindOf(preview.name);
  return (
    <Modal open centered width={900} footer={null} title={preview.name} onCancel={onClose} destroyOnHidden zIndex={1100}>
      <div className="h-[70vh] bg-gray-100 flex items-center justify-center">
        {kind === "video" ? (
          <video src={preview.url} controls autoPlay className="w-full h-full bg-black" />
        ) : kind === "image" ? (
          <img src={preview.url} alt={preview.name} className="w-full h-full object-contain" />
        ) : (
          <iframe title={preview.name} src={preview.url} className="w-full h-full border-0" />
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
  const newUrl = useMemo(() => (dialog ? URL.createObjectURL(dialog.file) : null), [dialog]);

  useEffect(() => () => newUrl && URL.revokeObjectURL(newUrl), [newUrl]);

  if (!dialog) return null;
  const { oldItem, file } = dialog;
  const oldMeta = oldItem.updated_at ? `${formatSize(oldItem.size)} · ${dayjs(oldItem.updated_at).format("DD/MM/YYYY HH:mm")}` : "";

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
          <ConfigProvider key="ok" theme={{ token: { colorPrimary: "#00b9d6" } }}>
            <Button type="primary" onClick={() => onClose(true)}>
              {t("Replace")}
            </Button>
          </ConfigProvider>,
        ]}>
        <p className="mb-4">
          {t("Uploading will replace the current file. The link and QR code will not change.")}
        </p>
        <div className="flex items-stretch gap-3">
          <FileCard t={t} label={t("Current file")} tone="default" name={oldItem.name} meta={oldMeta} onPreview={() => setPreview({ name: oldItem.name, url: `${oldItem.url}?v=${new Date(oldItem.updated_at).getTime()}` })} />
          <div className="flex items-center text-2xl text-gray-400">
            <SwapRightOutlined />
          </div>
          <FileCard t={t} label={t("New file")} tone="blue" name={file.name} meta={formatSize(file.size)} onPreview={() => setPreview({ name: file.name, url: newUrl })} />
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
  const itemsPerPage = 32;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return iecs.filter((item) => !term || item.name.toLowerCase().includes(term));
  }, [iecs, search]);

  const minValue = (currentPage - 1) * itemsPerPage;

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.iec.read)
      .then((res) => setIecs(res.data))
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: t("Failed to load IECs") });
      })
      .finally(() => setIsLoading(false));
  }

  // Abre o modal de comparação e resolve com true/false conforme o utilizador confirme ou cancele
  // Em fila: com vários ficheiros a substituir, um modal de cada vez
  const confirmQueue = useRef(Promise.resolve());
  function confirmReplace(file, oldItem) {
    const ask = confirmQueue.current.then(() => new Promise((resolve) => setReplaceDialog({ file, oldItem, resolve })));
    confirmQueue.current = ask;
    return ask;
  }

  function closeReplace(confirmed) {
    replaceDialog.resolve(confirmed);
    setReplaceDialog(null);
  }

  // Um lote = os ficheiros largados/escolhidos de uma vez. Em vez de uma mensagem por ficheiro,
  // mostra-se um resumo único no fim e, havendo erros, um alerta com a lista.
  const batch = useRef({ total: 0, pending: 0, ok: 0, replaced: 0, skipped: 0, errors: [], timer: null });

  function batchStart() {
    const b = batch.current;
    if (b.pending === 0) Object.assign(b, { total: 0, ok: 0, replaced: 0, skipped: 0, errors: [] });
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
    getData();
    const extra = [b.replaced && `${b.replaced} ${t("replaced")}`, b.skipped && `${b.skipped} ${t("skipped")}`].filter(Boolean).join(", ");
    const counted = b.total - b.skipped;
    // Tudo cancelado (nada foi enviado nem falhou): não faz sentido um "0/0 com sucesso"
    if (counted === 0) {
      toastApi.open({ key: "iec-upload", type: "info", content: t("Upload cancelled") });
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
      const { data: check } = await axios.post(endpoints.iec.check, { names: [file.name] });
      const exists = check.existing.length > 0;
      if (exists) {
        const oldItem = iecs.find((i) => i.name === file.name) || { name: check.existing[0] };
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
        const oldItem = iecs.find((i) => i.name === file.name) || { name: file.name };
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
      batchDone("error", file.name, err.response?.data?.message || t("file upload failed."));
    }
  }

  const props = {
    name: "file",
    multiple: true,
    accept: ACCEPTED.map((e) => `.${e}`).join(","),
    showUploadList: false,
    customRequest: handleUpload,
    beforeUpload: (file) => {
      batchStart();
      if (ACCEPTED.includes(extOf(file.name))) return true;
      batchDone("error", file.name, t("Only PDF, MP4, PNG and JPG files are allowed"));
      return Upload.LIST_IGNORE;
    },
  };

  function handleCopyLink(item) {
    navigator.clipboard.writeText(fileUrl(item));
    toastApi.open({ type: "success", content: t("Link copied") });
  }

  function handleDownloadQr() {
    const canvas = document.getElementById("iec-qrcode")?.querySelector("canvas");
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
    getData();
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow rounded-[16px]">
      {confirmHolder}
      <Delete table="iec" open={isOpenDelete} close={handleCloseDelete} data={selected || {}} onDeleteSuccess={handleDeleteSuccess} />
      <ReplaceModal dialog={replaceDialog} onClose={closeReplace} t={t} />
      <Modal
        open={!!qrItem}
        onCancel={() => setQrItem(null)}
        title={qrItem?.name}
        width={380}
        footer={[
          <Button key="link" icon={<LinkOutlined />} onClick={() => handleCopyLink(qrItem)}>
            {t("Copy link")}
          </Button>,
          <Button key="download" type="primary" onClick={handleDownloadQr}>
            {t("Download QR code")}
          </Button>,
        ]}>
        {qrItem && (
          <div id="iec-qrcode" className="flex flex-col items-center gap-3 py-2">
            <QRCode value={fileUrl(qrItem)} size={280} errorLevel="H" bordered={false} />
            <p className="text-[12px] text-gray-500 break-all text-center">{fileUrl(qrItem)}</p>
          </div>
        )}
      </Modal>

      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold font-ryker">{t("IECs")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{filtered.length === 1 ? t("1 file") : t("{{total}} files", { total: filtered.length })}{search.trim() ? ` ${t("found")}` : ""}</p>
        </div>
        <Input
          allowClear
          className="w-full sm:w-64!"
          prefix={<SearchOutlined />}
          placeholder={t("Search by file name")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
      {perm.canCreate && (
        <Dragger {...props} style={{ borderRadius: 12, background: "#FAFAFB", borderWidth: 2 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t("Click or drag PDF, MP4, PNG or JPG files to this area to upload")}</p>
          <p className="ant-upload-hint">{t("Uploading a file with an existing name replaces it. The QR code of each IEC never changes.")}</p>
        </Dragger>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-6">
        {filtered.slice(minValue, minValue + itemsPerPage).map((item) => {
          const kind = kindOf(item.name);
          return (
            <div key={item.id} className="group relative rounded-xl border border-solid border-[#E5E7EB] bg-white overflow-hidden transition hover:border-[#163986]/50 hover:shadow-sm" title={item.name}>
              {/* Imagens com miniatura; PDF e vídeo com o ícone do tipo (o mesmo da Multimédia) */}
              <div className="relative aspect-[4/3] grid place-items-center" style={kind === "image" && !item.missing ? CHECKER : { background: "#F6F7FB" }}>
                {kind === "image" && !item.missing ? (
                  <img src={fileUrl(item)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileBadge name={item.name} size={48} />
                    <span className="text-[11px] font-semibold uppercase text-[#8A8D98]">{extOf(item.name)}</span>
                  </div>
                )}
                {item.missing && (
                  <Tag color="red" className="absolute! top-2 left-2 m-0!">
                    {t("File missing")}
                  </Tag>
                )}
                <div className="absolute top-2 left-2 right-2 flex flex-wrap justify-end gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                  <Tooltip title={t("QR code")}>
                    <Button size="small" shape="circle" icon={<LuQrCode />} aria-label={t("QR code")} onClick={() => setQrItem(item)} className="shadow!" />
                  </Tooltip>
                  <Tooltip title={t("Copy link")}>
                    <Button size="small" shape="circle" icon={<LuCopy />} aria-label={t("Copy link")} onClick={() => handleCopyLink(item)} className="shadow!" />
                  </Tooltip>
                  <Tooltip title={t("Open")}>
                    <Button size="small" shape="circle" icon={<LuExternalLink />} aria-label={t("Open")} onClick={() => window.open(fileUrl(item), "_blank")} className="shadow!" />
                  </Tooltip>
                  {perm.canDelete && (
                    <Tooltip title={t("Delete")}>
                      <Button size="small" shape="circle" danger icon={<LuTrash2 />} aria-label={t("Delete")} onClick={() => handleOpenDelete(item)} className="shadow!" />
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="px-3 py-2 border-0 border-t border-solid border-[#F0F0F0]">
                <p className="text-[12px] font-medium mb-0! truncate">{item.name}</p>
                <p className="text-[11px] text-[#8A8D98] mb-0!">{[item.size ? formatSize(item.size) : null, item.updated_at ? dayjs(item.updated_at).format("DD/MM/YYYY") : null].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          );
        })}
        {!isLoading && iecs.length > 0 && filtered.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">{t("No files found")}</p>}
        {filtered.length > 0 && (
          <div className="col-span-full mt-4">
            <Pagination align="center" showSizeChanger={false} onChange={setCurrentPage} pageSize={itemsPerPage} current={currentPage} total={filtered.length} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Iec;
