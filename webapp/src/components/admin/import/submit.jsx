import { useContext, useState } from "react";
import { Button, Progress, Switch, Table, Tag } from "antd";
import axios from "axios";
import * as XLSX from "xlsx";
import { LuCircleCheck, LuDownload, LuMail, LuTriangleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

const CHUNK_SIZE = 200;

const REASONS = {
  missing_name: "Missing name",
  invalid_email: "Invalid e-mail",
  already_exists: "E-mail already registered",
  invalid_language: "Unknown language",
  invalid_country: "Country not available for the language",
  invalid_gender: "Invalid gender",
  invalid_academic_background: "Invalid academic background",
  invalid_date: "Invalid date",
};

const StatCard = ({ icon, value, label, color }) => (
  <div className="flex flex-1 flex-col items-center gap-1 rounded-[15px] px-6 py-4" style={{ backgroundColor: `${color}14` }}>
    <div className="text-[20px]" style={{ color }}>
      {icon}
    </div>
    <p className="mb-0! text-[28px] font-bold" style={{ color }}>
      {value}
    </p>
    <p className="mb-0! text-center text-[12px] text-[#8A8D98]">{label}</p>
  </div>
);

// Último passo: confirma o que vai ser importado, importa em lotes (com progresso) e mostra o resultado, incluindo as linhas
// ignoradas e o motivo de cada uma.
export default function Submit({ table, fields, rows, prev, onDone }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [sendEmails, setSendEmails] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const columns = Object.keys(rows[0] ?? {});
  const tableColumns = columns.map((key) => ({ title: key, dataIndex: key, key, ellipsis: true, render: (v) => (v === null || v === undefined || v === "" ? <span className="text-[#BFBFBF]">—</span> : String(v)) }));

  async function handleImport() {
    setIsImporting(true);
    setProgress(0);
    const total = { inserted: [], skipped: [], emails: sendEmails ? { sent: 0, failed: 0 } : null };
    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const res = await axios.post(endpoints.import[table], { data: { values: rows.slice(i, i + CHUNK_SIZE), sendEmails } });
        total.inserted.push(...res.data.inserted);
        total.skipped.push(...res.data.skipped);
        if (total.emails && res.data.emails) {
          total.emails.sent += res.data.emails.sent;
          total.emails.failed += res.data.emails.failed;
        }
        setProgress(Math.round((Math.min(i + CHUNK_SIZE, rows.length) * 100) / rows.length));
      }
      setResult(total);
      toastApi.success(t("Import finished: {{inserted}} new, {{skipped}} skipped.", { inserted: total.inserted.length, skipped: total.skipped.length }));
    } catch (err) {
      console.log(err);
      // Os lotes anteriores já ficaram guardados: mostra o que foi feito até aqui
      if (total.inserted.length > 0 || total.skipped.length > 0) setResult(total);
      toastApi.error(err.response?.data?.message || t("Could not import the data. Please try again."));
    } finally {
      setIsImporting(false);
    }
  }

  function downloadSkipped() {
    const data = result.skipped.map(({ row, reason }) => ({ ...row, [t("Reason")]: t(REASONS[reason] ?? reason) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Skipped");
    XLSX.writeFile(workbook, `${table}-import-skipped.xlsx`);
  }

  if (isImporting) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <Progress type="line" percent={progress} className="max-w-[420px]!" strokeColor="#163986" />
        <p className="mb-0! text-[#8A8D98]">{t("Importing the data, please wait...")}</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#2F835114]">
          <LuCircleCheck className="text-[26px] text-[#2F8351]" />
        </div>
        <p className="mb-0! text-center text-[26px] font-bold">{t("Import finished")}</p>
        <p className="mb-6! mt-1 text-center text-[#8A8D98]">{t("The data was processed")}</p>
        <div className="mb-6 flex w-full max-w-[640px] gap-3">
          <StatCard icon={<LuCircleCheck />} value={result.inserted.length} label={t("Imported")} color="#2F8351" />
          <StatCard icon={<LuTriangleAlert />} value={result.skipped.length} label={t("Skipped")} color="#D97706" />
          {result.emails && <StatCard icon={<LuMail />} value={`${result.emails.sent}/${result.inserted.length}`} label={t("E-mails sent")} color="#163986" />}
        </div>

        {result.emails && result.emails.failed > 0 && <p className="mb-4! text-center text-[13px] text-[#D97706]">{t("{{count}} e-mails could not be sent. Those users can use \"Forgot password\" to set their password.", { count: result.emails.failed })}</p>}

        {result.skipped.length > 0 && (
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="mb-0! font-bold">{t("Skipped rows")}</p>
              <Button icon={<LuDownload />} onClick={downloadSkipped}>
                {t("Download skipped rows")}
              </Button>
            </div>
            <Table
              size="small"
              pagination={{ pageSize: 5 }}
              rowKey={(_, index) => index}
              scroll={{ x: "max-content" }}
              dataSource={result.skipped}
              columns={[
                { title: t("E-mail"), key: "email", render: (_, s) => s.row.email ?? "—" },
                { title: t("Name"), key: "name", render: (_, s) => s.row.name ?? ([s.row.first_name, s.row.last_name].filter(Boolean).join(" ") || "—") },
                { title: t("Reason"), key: "reason", render: (_, s) => <Tag color="orange">{t(REASONS[s.reason] ?? s.reason)}</Tag> },
              ]}
            />
          </div>
        )}

        <Button type="primary" className="mt-6" onClick={onDone}>
          {t("Done")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-0! text-center text-[26px] font-bold">{t("Import data")}</p>
      <p className="mb-4! mt-2 text-center">{t("Check that all the data is correct")}</p>
      <Table size="small" columns={tableColumns} dataSource={rows.map((r, i) => ({ ...r, __rowKey: i }))} rowKey="__rowKey" scroll={{ x: "max-content" }} pagination={{ pageSize: 5 }} />

      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-1 rounded-[15px] bg-[#F6F7F9] px-6 py-4">
          <p className="mb-0! text-[28px] font-bold">{rows.length}</p>
          <p className="mb-0! text-[12px] text-[#8A8D98]">{t("Row(s) to import")}</p>
        </div>
      </div>

      {table === "user" && (
        <div className="mx-auto mt-6 flex max-w-[560px] items-center justify-between gap-4 rounded-[12px] border border-solid border-[#E5E7EB] p-4">
          <div>
            <p className="mb-0! font-medium">{t("Send an access e-mail to the new users")}</p>
            <p className="mb-0! text-[12px] text-[#8A8D98]">{t("They receive a code to choose their password. New users are approved and active.")}</p>
          </div>
          <Switch checked={sendEmails} onChange={setSendEmails} />
        </div>
      )}

      <div className="mt-6 flex items-center justify-center">
        <Button className="mr-2" onClick={prev}>
          {t("Previous")}
        </Button>
        <Button type="primary" onClick={handleImport}>
          {t("Import")}
        </Button>
      </div>
    </div>
  );
}
