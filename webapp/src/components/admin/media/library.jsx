import { Button, Empty, Image, Input, Pagination, Segmented, Select, Skeleton, Tooltip } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuEye, LuFile, LuSearch, LuUpload } from "react-icons/lu";
import axios from "axios";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";
import { toastRef } from "../../../utils/notify";
import { usePermission } from "../../../utils/usePermission";
import { CHECKER, FileBadge, fileKind } from "../../../utils/fileKind";
import { uploadMediaFiles } from "./upload";
import useDebounced from "../../../utils/useDebounced";

const PAGE_SIZE = 18;
const kindOf = (name = "") => fileKind(name).type;
const urlOf = (name) => `${config.server_ip}/media/${encodeURIComponent(name)}`;

function FileIcon({ name }) {
  const { color, ext } = fileKind(name);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <FileBadge name={name} size={44} />
      <span className="text-[11px] font-semibold uppercase" style={{ color }}>
        {ext}
      </span>
    </div>
  );
}

function Library({ mediaKey, fileType, close }) {
  const { t } = useTranslation();
  const perm = usePermission("media");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [uploading, setUploading] = useState(null); // { done, total }
  const [isDragging, setIsDragging] = useState(false);
  const fileInput = useRef(null);

  // Paginação, pesquisa, tipo e ordenação são feitos no servidor: só se pede a página que se vê
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, image: 0, pdf: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const debouncedSearch = useDebounced(search.trim());
  const requestRef = useRef(0);
  const pendingSelect = useRef(null); // ficheiro acabado de carregar: fica escolhido quando a lista voltar
  const [reload, setReload] = useState(0);

  // O campo pode aceitar só um tipo (imagem ou PDF); no resto, "Imagens" ou "Documentos" (tudo o que não é imagem)
  const kinds = fileType === "image" ? "image" : fileType === "pdf" ? "pdf" : kind === "image" ? "image" : kind === "doc" ? "pdf,presentation,video,other" : "";

  useEffect(() => setPage(1), [debouncedSearch, kind, sort]);

  function getData() {
    const request = ++requestRef.current;
    setIsLoading(true);
    axios
      .get(endpoints.media.list, { params: { page, limit: PAGE_SIZE, search: debouncedSearch, kinds, sort, counts: 1 } })
      .then((res) => {
        if (request !== requestRef.current) return;
        setData(res.data.rows);
        setTotal(res.data.total);
        setCounts(res.data.counts);
        if (pendingSelect.current) {
          const name = pendingSelect.current;
          pendingSelect.current = null;
          setSelected(name);
          setSelectedItem(res.data.rows.find((item) => item.name === name) ?? null);
        }
      })
      .catch((err) => console.log(err))
      .finally(() => request === requestRef.current && setIsLoading(false));
  }

  useEffect(() => {
    getData();
  }, [page, debouncedSearch, kinds, sort, reload]);

  const visible = data;
  const choose = (name = selected) => name && close({ [mediaKey]: name });
  const select = (item) => {
    setSelected(item.name);
    setSelectedItem(item);
  };

  async function handleFiles(files) {
    if (!files?.length) return;
    setUploading({ done: 0, total: files.length });
    const { uploaded, failed } = await uploadMediaFiles(files, (done, total) => setUploading({ done, total }));
    setUploading(null);
    if (uploaded.length) {
      toastRef.current?.success(uploaded.length === 1 ? t("File uploaded successfully.") : t("{{count}} files uploaded successfully.", { count: uploaded.length }));
      // Volta à lista completa, dos mais recentes, para o ficheiro novo aparecer (e ficar escolhido)
      pendingSelect.current = uploaded[0];
      setKind("all");
      setSearch("");
      setSort("newest");
      setPage(1);
      setReload((n) => n + 1);
    }
    if (failed.length) toastRef.current?.error(`${t("The upload failed")}: ${failed.join(", ")}`);
  }


  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (!perm.canCreate || !e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!perm.canCreate) return;
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}>
      {isDragging && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-[#163986] bg-[#163986]/10 text-[#163986] font-semibold pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <LuUpload className="text-[34px]" />
            {t("Drop the files to upload them")}
          </div>
        </div>
      )}

      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
        <Input allowClear className="max-w-xs" size="large" prefix={<LuSearch className="text-[#8A8D98]" />} placeholder={t("Search by file name...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        {!fileType && (
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: `${t("All")} (${counts.all})` },
              { value: "image", label: `${t("Images")} (${counts.image})` },
              { value: "doc", label: `${t("Documents")} (${counts.all - counts.image})` },
            ]}
          />
        )}
        <Select
          value={sort}
          onChange={setSort}
          className="w-40"
          options={[
            { value: "newest", label: t("Newest first") },
            { value: "oldest", label: t("Oldest first") },
            { value: "name", label: t("Name (A-Z)") },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          {uploading && (
            <span className="text-[13px] text-[#8A8D98]">
              {t("Uploading")} {Math.min(uploading.done + 1, uploading.total)}/{uploading.total}...
            </span>
          )}
          {perm.canCreate && (
            <>
              <input ref={fileInput} type="file" multiple hidden accept={fileType === "image" ? "image/*" : fileType === "pdf" ? "application/pdf" : undefined} onChange={(e) => handleFiles(e.target.files).then(() => (e.target.value = ""))} />
              <Button icon={<LuUpload />} loading={!!uploading} onClick={() => fileInput.current?.click()}>
                {t("Upload")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grelha */}
      <div className="min-h-[330px]">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton.Node key={i} active style={{ width: "100%", height: 130 }}>
                <span />
              </Skeleton.Node>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Empty className="py-12" description={counts.all === 0 ? t("The library has no files yet") : t("No files match your search")}>
            {counts.all === 0 && perm.canCreate && (
              <Button type="primary" icon={<LuUpload />} onClick={() => fileInput.current?.click()}>
                {t("Upload files")}
              </Button>
            )}
          </Empty>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {visible.map((item) => {
              const isImage = kindOf(item.name) === "image";
              const isSelected = item.name === selected;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  title={item.name}
                  onClick={() => select(item)}
                  onDoubleClick={() => choose(item.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") choose(item.name);
                    if (e.key === " ") {
                      e.preventDefault();
                      select(item);
                    }
                  }}
                  className={`group relative cursor-pointer rounded-xl border bg-white overflow-hidden transition ${isSelected ? "border-[#163986] ring-2 ring-[#163986]" : "border-[#E5E7EB] hover:border-[#163986]/50 hover:shadow-sm"}`}>
                  <div className="aspect-[4/3] grid place-items-center" style={isImage ? CHECKER : { background: "#F6F7FB" }}>
                    {isImage ? <img src={urlOf(item.name)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <FileIcon name={item.name} />}
                  </div>
                  <div className="px-2.5 py-2 border-0 border-t border-solid border-[#F0F0F0]">
                    <p className="text-[12px] font-medium mb-0! truncate">{item.name}</p>
                    <p className="text-[11px] text-[#8A8D98] mb-0!">{item.created_at ? dayjs(item.created_at).format("DD/MM/YYYY") : ""}</p>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-[#163986] text-white">
                      <LuCheck />
                    </span>
                  )}
                  {isImage && (
                    <Tooltip title={t("Preview")}>
                      <button
                        type="button"
                        aria-label={t("Preview")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSrc(urlOf(item.name));
                        }}
                        className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[#163986] shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer border-0">
                        <LuEye />
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Image style={{ display: "none" }} preview={{ src: previewSrc, open: !!previewSrc, onOpenChange: (open) => !open && setPreviewSrc(null) }} />

      {total > PAGE_SIZE && <Pagination className="mt-4" align="center" size="small" current={page} pageSize={PAGE_SIZE} total={total} showSizeChanger={false} onChange={setPage} />}

      {/* Rodapé: o que está escolhido */}
      <div className="mt-5 pt-4 border-0 border-t border-solid border-[#F0F0F0] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {selectedItem ? (
            <>
              <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden grid place-items-center border border-solid border-[#E5E7EB]" style={kindOf(selectedItem.name) === "image" ? CHECKER : { background: "#F6F7FB" }}>
                {kindOf(selectedItem.name) === "image" ? <img src={urlOf(selectedItem.name)} alt="" className="max-h-full max-w-full object-contain" /> : <LuFile className="text-[#8A8D98]" />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold mb-0! truncate">{selectedItem.name}</p>
                <p className="text-[12px] text-[#8A8D98] mb-0!">{selectedItem.created_at ? dayjs(selectedItem.created_at).format("DD/MM/YYYY HH:mm") : ""}</p>
              </div>
            </>
          ) : (
            <span className="text-[13px] text-[#8A8D98]">{t("Select a file. Double click to choose it right away")}</span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => close()}>{t("Cancel")}</Button>
          <Button type="primary" disabled={!selected} onClick={() => choose()}>
            {t("Choose")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Library;
