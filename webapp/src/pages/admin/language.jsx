import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Progress, Tag, Tooltip } from "antd";
import { FaRegEdit, FaRegFile } from "react-icons/fa";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import Create from "../../components/admin/language/create";
import Update from "../../components/admin/language/update";
import TranslationsImport from "../../components/admin/import/translations";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import Translations from "../../components/admin/language/translations";
import { useTranslation } from "react-i18next";

function parseCountries(value) {
  try {
    const list = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Países do idioma: os primeiros como etiquetas e, se houver mais, "+N" com a lista completa ao passar o rato
function CountriesCell({ countries, t }) {
  if (!countries.length) return <span className="text-[#8A8D98]">—</span>;
  const shown = countries.slice(0, 3);
  const rest = countries.slice(3);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((c) => (
        <Tag key={c} className="m-0!">
          {t(c)}
        </Tag>
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map((c) => t(c)).join(", ")}>
          <Tag className="m-0! cursor-default">+{rest.length}</Tag>
        </Tooltip>
      )}
    </div>
  );
}

// Quantas traduções tem o idioma face ao total existente
function TranslationsCell({ row, t }) {
  const { translationCount: count, translationTotal: total, full_data: lang } = row;
  const missing = Math.max(0, total - count);
  const percent = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="min-w-40">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{count}</span>
        {lang.is_default === 1 ? <span className="text-[12px] text-[#8A8D98]">{t("Base language")}</span> : missing > 0 ? <span className="text-[12px] text-[#E67E00]">{t("{{count}} missing", { count: missing })}</span> : <span className="text-[12px] text-[#2F8351]">{t("Complete")}</span>}
      </div>
      <Progress percent={percent} showInfo={false} size="small" strokeColor={missing > 0 && lang.is_default !== 1 ? "#E67E00" : "#00B9D6"} />
    </div>
  );
}

export default function Language() {
  const { user } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("language");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenTranslations, setIsOpenTranslations] = useState(false);
   const [isOpenImport, setIsOpenImport] = useState(false);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.language.read)
      .then((res) => {
        setData(res.data);
        prepareData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function prepareData(array) {
    const aux = [];
    // Nº de traduções de cada idioma; a referência é o idioma com mais (o idioma base não guarda lista própria e conta como completo)
    const counts = array.map((l) => {
      try {
        return JSON.parse(l.translation || "[]").length;
      } catch {
        return 0;
      }
    });
    const reference = Math.max(0, ...counts);
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: i + 1,
        countries: parseCountries(array[i].country),
        translationCount: array[i].is_default === 1 && !counts[i] ? reference : counts[i],
        translationTotal: reference,
        flag: (
          <div className="flex justify-start items-center">
            <img src={array[i].flag} className="max-w-5" />
          </div>
        ),
        is_deleted: array[i].is_deleted ? (
          <Tag variant="outlined" color={"red"}>
            {t("Inactive")}
          </Tag>
        ) : (
          <Tag variant="outlined" color={"green"}>
            {t("Active")}
          </Tag>
        ),
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
                  perm.canUpdate && {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  array[i].is_default !== 1 && {
                    label: t("Translations"),
                    key: `${array[i].id}-translations`,
                    icon: <FaRegFile />,
                    onClick: () => openTranslations(array[i]),
                  },
                ]} />
          </div>
        ),
      });
    }

    setTableData(aux);
  }

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
  }

  function openTranslations(obj) {
    setSelectedData(obj);
    setIsOpenTranslations(true);
  }

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenTranslations(false);
    setIsOpenImport(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "name", type: "text", primary: true, placeholder: t("Search by name..."), match: (row, v) => includesText(row.full_data.name, v) },
  ]);

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} />
      <Update data={selectedData} open={isOpenUpdate} close={closeAction} />
      <Translations
        data={selectedData}
        defaultLanguage={data.filter((item) => item.is_default === 1)[0]}
        open={isOpenTranslations}
        close={closeAction}
      />
      <TranslationsImport open={isOpenImport} close={closeAction} />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Languages")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} languages", { total: filterRows(tableData).length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <ExportButton table="translations" data={filterRows(tableData).map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Name", dataIndex: "name" }, { title: "Code", dataIndex: "code" }, { title: "Default", dataIndex: "is_default", value: (row, { t }) => (row.is_default ? t("Yes") : t("No")) }, createdColumn]} />
          <RefreshButton size="large" onClick={getData} />
          <Button
            size="large"
           
            onClick={() => setIsOpenImport(true)}
          >
            {t("Import")}
          </Button>
          {perm.canCreate && (<Button
            size="large"
            onClick={() => setIsOpenCreate(true)}
            icon={<AiOutlinePlus />}
          >
            {t("Add Language")}
          </Button>)}
        </div>
      </div>
      <Table
        dataSource={filterRows(tableData)}
        loading={isLoading}
        columns={[
          {
            title: "",
            dataIndex: "flag",
            key: "flag",
            width: "40px",
          },
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            width: "20%",
            render: (name, row) => (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{name}</span>
                {row.full_data.code && <Tag className="m-0! uppercase">{row.full_data.code}</Tag>}
                {row.full_data.is_default === 1 && (
                  <Tag color="blue" className="m-0!">
                    {t("Default")}
                  </Tag>
                )}
              </div>
            ),
          },
          {
            title: t("Countries"),
            dataIndex: "countries",
            key: "countries",
            width: "30%",
            render: (countries) => <CountriesCell countries={countries} t={t} />,
          },
          {
            title: t("Translations"),
            dataIndex: "translationCount",
            key: "translationCount",
            sort: true,
            sortType: "number",
            width: "20%",
            render: (_, row) => <TranslationsCell row={row} t={t} />,
          },
          {
            title: t("Status"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            width: "10%",
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: "80px",
          },
        ]}
      />
    </div>
  );
}
