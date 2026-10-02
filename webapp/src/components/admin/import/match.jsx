import { useMemo, useState } from "react";
import { Alert, Button, Popconfirm, Select, Table, Tag } from "antd";
import { RxArrowRight } from "react-icons/rx";
import { FaFileExcel, FaRegTrashAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const PREVIEW_ROWS = 5;
const normalize = (value) => String(value ?? "").trim().toLowerCase();

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Segundo passo: associar cada coluna do ficheiro a um campo. As colunas com o nome do campo (ou da sua etiqueta) já vêm associadas;
// o que ficar sem campo é ignorado. Mostra uma pré-visualização com o campo a que cada coluna ficou ligada.
export default function MatchColumns({ file, fields, fileColumns, rows, onRemoveFile, prev, next }) {
  const { t } = useTranslation();

  const [mapping, setMapping] = useState(() =>
    Object.fromEntries(
      fileColumns.map((col) => {
        const key = normalize(col);
        const field = fields.find((f) => normalize(f.Field) === key || normalize(t(f.label)) === key);
        return [col, field?.Field];
      }),
    ),
  );

  const used = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const mappedCount = used.size;
  const hasEmail = used.has("email");
  const hasName = used.has("name") || (used.has("first_name") && used.has("last_name"));
  const canContinue = hasEmail && hasName;

  const previewColumns = fileColumns.map((col) => ({
    key: col,
    dataIndex: col,
    width: 180,
    ellipsis: true,
    title: (
      <div className="flex min-w-0 flex-col items-start gap-1">
        <span className="max-w-full truncate font-semibold">{col}</span>
        {mapping[col] ? (
          <Tag color="green" className="m-0! max-w-full truncate">
            → {mapping[col]}
          </Tag>
        ) : (
          <Tag className="m-0!">{t("Ignored")}</Tag>
        )}
      </div>
    ),
    render: (value) => (value === null || value === undefined || value === "" ? <span className="text-[#BFBFBF]">—</span> : String(value)),
  }));

  function submit() {
    const mapped = rows.map((row) => {
      const out = {};
      fileColumns.forEach((col) => {
        if (mapping[col]) out[mapping[col]] = row[col];
      });
      return out;
    });
    next(mapped);
  }

  return (
    <div>
      <p className="mb-0! text-center text-[26px] font-bold">{t("Match columns")}</p>
      <p className="mb-4! mt-2 text-center">{t("Confirm which field each column of your file corresponds to")}</p>

      {file && (
        <div className="mb-4 flex items-center gap-3 rounded-[12px] bg-[#F6F7F9] px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white text-[20px] text-[#163986]">
            <FaFileExcel />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-0! truncate font-medium">{file.name}</p>
            <p className="mb-0! text-[12px] text-[#8A8D98]">
              {t("{{count}} rows", { count: rows.length })} · {t("{{count}} columns", { count: fileColumns.length })}
              {file.size ? ` · ${formatFileSize(file.size)}` : ""}
            </p>
          </div>
          <Popconfirm title={t("Remove file?")} description={t("Goes back to the upload step to choose another file.")} okText={t("Remove")} cancelText={t("Cancel")} okButtonProps={{ danger: true }} onConfirm={onRemoveFile}>
            <Button danger type="text" icon={<FaRegTrashAlt />}>
              {t("Remove")}
            </Button>
          </Popconfirm>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="mb-0! text-[13px] font-medium text-[#8A8D98]">{t("Preview (first {{shown}} of {{total}} rows)", { shown: Math.min(PREVIEW_ROWS, rows.length), total: rows.length })}</p>
        <Tag color={mappedCount === fileColumns.length ? "green" : "default"} className="m-0!">
          {t("{{mapped}}/{{total}} columns matched", { mapped: fileColumns.filter((c) => mapping[c]).length, total: fileColumns.length })}
        </Tag>
      </div>
      <Table className="mb-6" size="small" bordered pagination={false} columns={previewColumns} dataSource={rows.slice(0, PREVIEW_ROWS).map((row, index) => ({ ...row, __rowKey: index }))} rowKey="__rowKey" scroll={{ x: "max-content" }} />

      <div className="flex flex-col gap-2">
        {fileColumns.map((col) => (
          <div key={col} className="flex items-center gap-4 rounded-[12px] bg-[#F6F7F9] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="mb-0! text-[11px] text-[#8A8D98]">{t("File column")}</p>
              <p className="mb-0! truncate font-medium">{col}</p>
            </div>
            <RxArrowRight className="shrink-0 text-[18px] text-[#8A8D98]" />
            <div className="min-w-0 flex-1">
              <p className="mb-0! text-[11px] text-[#8A8D98]">{t("Field")}</p>
              <Select
                className="w-full"
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                placeholder={t("Ignore this column")}
                value={mapping[col]}
                onChange={(value) => setMapping((prevMapping) => ({ ...prevMapping, [col]: value }))}
                options={fields.map((f) => ({
                  value: f.Field,
                  label: `${f.Field} · ${t(f.label)}`,
                  // Cada campo só pode ficar ligado a uma coluna
                  disabled: used.has(f.Field) && mapping[col] !== f.Field,
                }))}
              />
            </div>
          </div>
        ))}
      </div>

      {!canContinue && (
        <Alert className="mt-4" type="warning" showIcon title={t("Match the required fields to continue")} description={t("The e-mail and the name (first and last name, or the full name) are required.")} />
      )}

      <div className="mt-6 flex items-center justify-center">
        <Button className="mr-2" onClick={prev}>
          {t("Previous")}
        </Button>
        <Button type="primary" disabled={!canContinue} onClick={submit}>
          {t("Next")}
        </Button>
      </div>
    </div>
  );
}
