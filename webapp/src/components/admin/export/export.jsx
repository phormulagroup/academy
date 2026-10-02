import { useContext, useMemo, useState } from "react";
import { Button, Checkbox, Drawer } from "antd";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import { LuDownload, LuFileSpreadsheet, LuFileText } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import { columnExcelWidths } from "../../../utils/columns";

const FORMATS = [
  { value: "xlsx", label: "Excel", hint: "XLSX file", icon: <LuFileSpreadsheet /> },
  { value: "csv", label: "CSV", hint: "Text separated by ; for Excel or other apps", icon: <LuFileText /> },
];
const STORAGE = (table) => `export:${table}`;

// Última escolha desta listagem (colunas e formato): o storage pode não estar disponível (janela privada), por isso nunca é obrigatório
function loadChoice(table) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE(table))) ?? {};
  } catch {
    return {};
  }
}

// Deixa o browser mostrar o "a carregar" do botão antes do trabalho síncrono pesado do XLSX
const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

// As páginas de relatório põem por vezes JSX na célula (ex.: <b>12</b>): na exportação só interessa o texto lá dentro
function cellValue(row, column, ctx) {
  let value = column.value ? column.value(row, ctx) : row[column.key];
  if (typeof value === "object" && value?.props && value.props?.children) value = value.props.children;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return Array.isArray(value) ? value.join(" ") : JSON.stringify(value);
  return value;
}

// CSV com ";" e BOM UTF-8, o que o Excel em português espera para abrir acentos e colunas corretamente
function toCsv(rows) {
  const escape = (value) => {
    const text = String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(escape).join(";")).join("\r\n");
}

// Exporta uma listagem para Excel ou CSV. `data` são as linhas (o que está filtrado na página) e `columns` as colunas possíveis:
// { title, dataIndex (ou key), value?: (linha, { t, languages }) => valor }. O formato e as colunas escolhidas ficam guardados para a próxima vez.
export default function ExportTable({ open, close, data, table, columns = [] }) {
  const { toastApi, languages } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  // O que o utilizador alterou nesta janela; até lá vale a última escolha (todas as colunas da primeira vez)
  const [edited, setEdited] = useState(null);
  const [editedFormat, setEditedFormat] = useState(null);

  const fields = useMemo(
    () =>
      columns
        .filter((c) => c.dataIndex || c.key || c.value)
        .map((c) => ({ key: c.dataIndex || c.key, title: typeof c.title === "string" ? t(c.title) : String(c.dataIndex || c.key), value: c.value })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, t],
  );
  const saved = useMemo(() => (open ? loadChoice(table) : {}), [open, table]);

  const selected = edited ?? new Set(fields.filter((f) => !saved.columns || saved.columns.includes(f.key)).map((f) => f.key));
  const format = editedFormat ?? saved.format ?? "xlsx";
  const chosen = fields.filter((f) => selected.has(f.key));

  function toggle(key, on) {
    const next = new Set(selected);
    if (on) next.add(key);
    else next.delete(key);
    setEdited(next);
  }

  async function handleExport() {
    setIsLoading(true);
    try {
      await nextFrame();
      const fileName = `${dayjs().format("YYYY-MM-DD")}_${dayjs().format("HHmmss")}_${table}Export.${format}`;
      const rows = [chosen.map((f) => f.title), ...(data || []).map((row) => chosen.map((f) => cellValue(row, f, { t, languages })))];

      if (format === "csv") {
        saveAs(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), fileName);
      } else {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet["!cols"] = chosen.map((f) => columnExcelWidths.columns[f.key] || columnExcelWidths.defaultWidth);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
        saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName);
      }

      try {
        localStorage.setItem(STORAGE(table), JSON.stringify({ format, columns: chosen.map((f) => f.key) }));
      } catch {
        // só esta visita
      }
      toastApi.success(t("File \"{{name}}\" exported successfully.", { name: fileName }));
      close();
    } catch (err) {
      console.log(err);
      toastApi.error(t("Could not generate the export file. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Drawer
      title={t("Export")}
      size={720}
      open={open}
      onClose={() => close()}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (!visible) {
          setEdited(null);
          setEditedFormat(null);
        }
      }}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm text-[#8A8D98]">
            {t("{{count}} records", { count: data?.length || 0 })} · {t("{{count}} columns", { count: chosen.length })} · {format === "xlsx" ? "Excel" : "CSV"}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => close()}>{t("Cancel")}</Button>
            <Button type="primary" icon={<LuDownload />} loading={isLoading} disabled={!chosen.length || !data?.length} onClick={handleExport}>
              {t("Export")}
            </Button>
          </div>
        </div>
      }>
      <div className="flex flex-col gap-8">
        <section>
          <p className="mb-3! text-xs font-semibold uppercase">{t("Format")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FORMATS.map((option) => {
              const on = format === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEditedFormat(option.value)}
                  className={`flex cursor-pointer items-center gap-3 rounded-[15px] border border-solid bg-white p-3 text-left transition-colors ${on ? "border-[#163986] bg-[#163986]/5" : "border-[#D9D9D9] hover:border-[#8A8D98]"}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-xl ${on ? "bg-[#163986] text-white" : "bg-[#F6F7F9] text-[#8A8D98]"}`}>{option.icon}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs text-[#8A8D98]">{t(option.hint)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3 pb-3">
            <p className="m-0 text-xs font-semibold uppercase">
              {t("Columns")} ({chosen.length}/{fields.length})
            </p>
            <span className="flex gap-3">
              <Button type="link" size="small" className="px-0! text-[#00b9d6]! hover:text-[#163986]!" onClick={() => setEdited(new Set(fields.map((f) => f.key)))}>
                {t("All")}
              </Button>
              <Button type="link" size="small" className="px-0! text-[#00b9d6]! hover:text-[#163986]!" onClick={() => setEdited(new Set())}>
                {t("None")}
              </Button>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fields.map((field) => {
              const on = selected.has(field.key);
              return (
                <label key={field.key} className={`flex cursor-pointer items-center gap-3 rounded-[10px] border border-solid px-3 py-2 text-sm transition-colors ${on ? "border-[#163986] bg-[#163986]/5" : "border-[#D9D9D9] bg-white hover:border-[#8A8D98]"}`}>
                  <Checkbox checked={on} onChange={(event) => toggle(field.key, event.target.checked)} />
                  <span className="min-w-0 truncate">{field.title}</span>
                </label>
              );
            })}
          </div>
        </section>
      </div>
    </Drawer>
  );
}
