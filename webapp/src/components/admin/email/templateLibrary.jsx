import axios from "axios";
import dayjs from "dayjs";
import mjml2html from "mjml-browser";
import { Button, Empty, Modal, Popconfirm, Segmented, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { LuBookmark, LuLayoutTemplate, LuTrash2, LuUsers } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import endpoints from "../../../utils/endpoints";
import { toastRef } from "../../../utils/notify";
import { builtInTemplates } from "./grapesTemplates";

const CARD_W = 300; // largura do cartão; o e-mail (600 px) mostra-se reduzido a esta largura
const SCALE = CARD_W / 600;

// Miniatura de um e-mail: o HTML numa moldura de 600 px reduzida (só para ver, sem cliques)
function Thumb({ html }) {
  return (
    <div className="relative overflow-hidden bg-[#F4F5F7]" style={{ width: CARD_W, height: 300 }}>
      <iframe title="preview" sandbox="" srcDoc={html} scrolling="no" tabIndex={-1} style={{ width: 600, height: 300 / SCALE, border: 0, transform: `scale(${SCALE})`, transformOrigin: "top left", pointerEvents: "none", background: "#fff" }} />
    </div>
  );
}

function TemplateCard({ name, description, html, footer, onUse, useLabel }) {
  return (
    <div className="rounded-xl border border-solid border-[#E5E7EB] bg-white overflow-hidden flex flex-col" style={{ width: CARD_W }}>
      <Thumb html={html} />
      <div className="p-3 flex flex-col gap-2 border-0 border-t border-solid border-[#F0F0F0] flex-1">
        <div className="min-w-0">
          <div className="font-semibold text-[14px] truncate">{name}</div>
          {description && <div className="text-[12px] text-[#8A8D98] line-clamp-2">{description}</div>}
        </div>
        {footer}
        <Button type="primary" block className="mt-auto" onClick={onUse}>
          {useLabel}
        </Button>
      </div>
    </div>
  );
}

// Galeria e biblioteca da equipa do editor de e-mails: modelos prontos, modelos guardados e blocos guardados.
// `start`: aberta ao criar um e-mail novo (escolher por onde começar). `onUseBuiltIn(mjml)` / `onUseSaved(id)`: aplicam o modelo.
export default function TemplateLibrary({ open, start, canEdit, onClose, onUseBuiltIn, onUseSaved, onChanged, initialTab = "gallery" }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(initialTab);
  const [saved, setSaved] = useState({ templates: [], blocks: [], available: true });
  const [isLoading, setIsLoading] = useState(false);

  // As miniaturas dos modelos prontos compilam-se uma vez (MJML → HTML) quando a galeria abre
  const gallery = useMemo(() => {
    if (!open) return [];
    return builtInTemplates(t).map((tpl) => {
      let html = "";
      try {
        html = mjml2html(tpl.mjml, { validationLevel: "skip", minify: false }).html;
      } catch (err) {
        console.error(err);
      }
      return { ...tpl, html };
    });
  }, [open, t]);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      load();
    }
  }, [open]);

  function load() {
    setIsLoading(true);
    axios
      .get(endpoints.emailLibrary.read)
      .then((res) => setSaved({ templates: res.data.rows.filter((r) => r.kind === "template"), blocks: res.data.rows.filter((r) => r.kind === "block"), available: res.data.available !== false }))
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  async function rename(row, name) {
    if (!name?.trim() || name.trim() === row.name) return;
    try {
      await axios.post(endpoints.emailLibrary.update, { data: { id: row.id, name } });
      load();
      onChanged?.();
    } catch (err) {
      toastRef.current?.error(err.response?.data?.message || t("Something went wrong, try again later."));
    }
  }

  async function remove(row) {
    try {
      await axios.post(endpoints.emailLibrary.delete, { data: { id: row.id } });
      toastRef.current?.success(t("Deleted"));
      load();
      onChanged?.();
    } catch (err) {
      toastRef.current?.error(err.response?.data?.message || t("Something went wrong, try again later."));
    }
  }

  const manage = (row) =>
    canEdit ? (
      <div className="flex items-center justify-between gap-2 text-[12px] text-[#8A8D98]">
        <span className="truncate">
          {row.created_by_name ? `${row.created_by_name} · ` : ""}
          {dayjs(row.created_at).format("DD/MM/YYYY")}
        </span>
        <Popconfirm title={t("Delete this item for the whole team?")} okText={t("Delete")} okButtonProps={{ danger: true }} cancelText={t("Cancel")} onConfirm={() => remove(row)}>
          <Button type="text" danger size="small" icon={<LuTrash2 />} aria-label={t("Delete")} />
        </Popconfirm>
      </div>
    ) : null;

  const unavailable = !saved.available;

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={1000} style={{ top: 24 }} title={start ? t("Start from a template") : t("Templates and saved blocks")} destroyOnHidden>
      {start && <p className="text-[13px] text-[#8A8D98] mt-0!">{t("Choose a ready-made e-mail to start from, or close this window to start from the basic one. You can change everything afterwards")}</p>}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "gallery", label: <span className="inline-flex items-center gap-1.5"><LuLayoutTemplate /> {t("Gallery")}</span> },
          { value: "team", label: <span className="inline-flex items-center gap-1.5"><LuUsers /> {t("Team templates")} ({saved.templates.length})</span> },
          { value: "blocks", label: <span className="inline-flex items-center gap-1.5"><LuBookmark /> {t("Saved blocks")} ({saved.blocks.length})</span> },
        ]}
      />
      <div className="mt-4 min-h-[360px] max-h-[68vh] overflow-auto pr-1">
        {tab === "gallery" && (
          <div className="flex flex-wrap gap-4">
            {gallery.map((tpl) => (
              <TemplateCard key={tpl.id} name={tpl.name} description={tpl.description} html={tpl.html} useLabel={t("Use this template")} onUse={() => onUseBuiltIn(tpl.mjml)} />
            ))}
          </div>
        )}

        {tab !== "gallery" && isLoading && <Spin className="w-full! py-16!" />}
        {tab !== "gallery" && !isLoading && unavailable && <Empty className="py-12" description={t("The team library is not available yet")} />}

        {tab === "team" && !isLoading && !unavailable &&
          (saved.templates.length === 0 ? (
            <Empty className="py-12" description={t("No templates saved by the team yet. Use \"Save as template\" in the editor toolbar")} />
          ) : (
            <div className="flex flex-wrap gap-4">
              {saved.templates.map((row) => (
                <TemplateCard
                  key={row.id}
                  name={canEdit ? <Typography.Text editable={{ onChange: (name) => rename(row, name), triggerType: ["icon"], tooltip: t("Rename") }}>{row.name}</Typography.Text> : row.name}
                  html={row.html || ""}
                  footer={manage(row)}
                  useLabel={t("Use this template")}
                  onUse={() => onUseSaved(row.id)}
                />
              ))}
            </div>
          ))}

        {tab === "blocks" && !isLoading && !unavailable &&
          (saved.blocks.length === 0 ? (
            <Empty className="py-12" description={t("No blocks saved yet. Select a section in the e-mail and use the bookmark button in its toolbar")} />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-[#8A8D98] mb-2!">{t("Saved blocks appear in the blocks panel, in the \"Saved blocks\" group. Drag them into the e-mail")}</p>
              {saved.blocks.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-solid border-[#E5E7EB] px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] truncate">{canEdit ? <Typography.Text editable={{ onChange: (name) => rename(row, name), triggerType: ["icon"], tooltip: t("Rename") }}>{row.name}</Typography.Text> : row.name}</div>
                    <div className="text-[12px] text-[#8A8D98]">
                      {row.created_by_name ? `${row.created_by_name} · ` : ""}
                      {dayjs(row.created_at).format("DD/MM/YYYY")}
                    </div>
                  </div>
                  {canEdit && (
                    <Popconfirm title={t("Delete this item for the whole team?")} okText={t("Delete")} okButtonProps={{ danger: true }} cancelText={t("Cancel")} onConfirm={() => remove(row)}>
                      <Button type="text" danger icon={<LuTrash2 />} aria-label={t("Delete")} />
                    </Popconfirm>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </Modal>
  );
}
