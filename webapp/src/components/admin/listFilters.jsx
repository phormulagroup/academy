import { useState } from "react";
import { Badge, Button, Input, Select, Tooltip } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import FiltersDrawer from "./filtersDrawer";

const isEmpty = (value) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

// Comparação de texto sem maiúsculas/minúsculas, para as pesquisas
export const includesText = (value, term) => String(value ?? "").toLowerCase().includes(String(term).trim().toLowerCase());

// Pesquisa e filtros de uma listagem, fora da tabela (em vez de um pesquisar/filtrar em cada coluna).
// Os campos `primary` (1 ou 2, os mais importantes) ficam sempre à vista e aplicam-se logo; os restantes ficam numa
// gaveta "Mais filtros", que só se aplica ao clicar em "Aplicar". Sem campos secundários, o botão não aparece.
//
// definitions: [{ key, label, type: "text" | "select", placeholder, primary, options, match(row, value) }]
//   options: lista { label, value } ou função que a devolve (para opções que dependem dos dados).
// Devolve { filterRows, toolbar }: filterRows(rows) devolve as linhas que cumprem os filtros e toolbar são os campos a
// pôr no cabeçalho da página, na mesma linha dos botões de atualizar e adicionar.
export default function useListFilters(definitions) {
  const { t } = useTranslation();
  const [applied, setApplied] = useState({});
  const [draft, setDraft] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const primary = definitions.filter((d) => d.primary);
  const extra = definitions.filter((d) => !d.primary);
  const extraKeys = extra.map((d) => d.key);
  const extraCount = extraKeys.filter((key) => !isEmpty(applied[key])).length;

  function filterRows(rows) {
    return rows.filter((row) => definitions.every((d) => isEmpty(applied[d.key]) || d.match(row, applied[d.key])));
  }

  const optionsOf = (d) => (typeof d.options === "function" ? d.options() : d.options) || [];

  function renderField(d, values, onChange, className) {
    if (d.type === "select") {
      return (
        <Select
          key={d.key}
          allowClear
          showSearch={{ optionFilterProp: "label" }}
          className={className}
          placeholder={d.placeholder || d.label}
          value={values[d.key]}
          onChange={(value) => onChange(d.key, value ?? undefined)}
          options={optionsOf(d)}
        />
      );
    }
    return (
      <Input
        key={d.key}
        allowClear
        prefix={<SearchOutlined />}
        className={className}
        placeholder={d.placeholder || d.label}
        value={values[d.key]}
        onChange={(e) => onChange(d.key, e.target.value)}
      />
    );
  }

  function toggleDrawer(open) {
    if (open) setDraft(applied);
    setIsOpen(open);
  }

  function applyDrawer() {
    setApplied((prev) => ({ ...prev, ...Object.fromEntries(extraKeys.map((key) => [key, draft[key]])) }));
    setIsOpen(false);
  }

  function clearDrawer() {
    setDraft((prev) => ({ ...prev, ...Object.fromEntries(extraKeys.map((key) => [key, undefined])) }));
    setApplied((prev) => ({ ...prev, ...Object.fromEntries(extraKeys.map((key) => [key, undefined])) }));
    setIsOpen(false);
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {primary.map((d) => renderField(d, applied, (key, value) => setApplied((prev) => ({ ...prev, [key]: value })), d.type === "select" ? "w-full sm:w-[200px]!" : "w-full sm:w-[300px]!"))}
      {extra.length > 0 && (
        <>
          <Badge count={extraCount} size="small">
            <Tooltip title={t("Filter the list by more fields")}>
              <Button icon={<FilterOutlined />} onClick={() => toggleDrawer(true)}>
                {t("More filters")}
              </Button>
            </Tooltip>
          </Badge>
          <FiltersDrawer title={t("More filters")} open={isOpen} onClose={() => toggleDrawer(false)} onApply={applyDrawer} onClear={clearDrawer}>
            {extra.map((d) => (
              <div key={d.key}>
                <p className="text-sm text-[#6B6B6B] pb-2">{d.label}</p>
                {renderField(d, draft, (key, value) => setDraft((prev) => ({ ...prev, [key]: value })), "w-full")}
              </div>
            ))}
          </FiltersDrawer>
        </>
      )}
    </div>
  );

  return { filterRows, toolbar, hasActiveFilters: Object.values(applied).some((v) => !isEmpty(v)) };
}
