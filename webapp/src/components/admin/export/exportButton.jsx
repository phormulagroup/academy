import { useState } from "react";
import { Button, Tooltip } from "antd";
import { LuDownload } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import ExportTable from "./export";

// Botão de exportar para o cabeçalho de uma listagem: abre a janela de exportação com as linhas atuais (já filtradas)
// Com listas paginadas no servidor, `fetchAll` (async, devolve todas as linhas do filtro atual) é chamado ao clicar; `data` é então só o que está à vista.
export default function ExportButton({ data, columns, table, fetchAll }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  async function openExport() {
    if (!fetchAll) return setOpen(true);
    setIsFetching(true);
    try {
      setAll(await fetchAll());
      setOpen(true);
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <>
      <Tooltip title={t("Export the list to Excel or CSV")}>
        <Button icon={<LuDownload />} loading={isFetching} disabled={!fetchAll && (!data || data.length === 0)} onClick={openExport} aria-label={t("Export")} />
      </Tooltip>
      <ExportTable open={open} close={() => setOpen(false)} data={fetchAll ? (all ?? []) : data} table={table} columns={columns} />
    </>
  );
}

// Colunas usadas por várias listagens
export const activityColumn = { title: "Activity", dataIndex: "is_deleted", value: (row, { t }) => (row.is_deleted ? t("Inactive") : t("Active")) };
export const languageColumn = { title: "Language", dataIndex: "id_lang", value: (row, { languages }) => languages?.find((l) => l.id === row.id_lang)?.code?.toUpperCase() ?? "" };
export const createdColumn = { title: "Created at", dataIndex: "created_at", value: (row) => (row.created_at ? String(row.created_at).replace("T", " ").slice(0, 19) : "") };
