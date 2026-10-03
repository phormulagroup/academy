import { useMemo, useState } from "react";
import { Button, Checkbox, Empty, Input, Switch } from "antd";
import { LuSearch } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import countries from "../../../utils/countries.json";

// Para pesquisar sem acentos nem maiúsculas
const normalize = (s) => (s ?? "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Escolha de países para o Form.Item (value = lista, onChange): em vez de um select que cresce sem fim, uma lista com pesquisa,
// com altura fixa e scroll. Os países mostram-se no idioma da interface e guardam-se com o nome de origem.
// `options` limita a lista (por omissão, todos os países); `maxHeight` é a classe de altura da lista.
export default function CountriesPicker({ value = [], onChange, options: list = countries, maxHeight = "max-h-72" }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);

  const options = useMemo(() => [...list].map((c) => ({ value: c, label: t(c) })).sort((a, b) => a.label.localeCompare(b.label)), [t, list]);
  const selected = new Set(value);
  const term = normalize(search).trim();
  const visible = options.filter((o) => (!term || normalize(o.label).includes(term)) && (!onlySelected || selected.has(o.value)));
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.value));

  const toggle = (country, checked) => onChange?.(checked ? [...value, country] : value.filter((c) => c !== country));
  // Selecionar/limpar atua só nos países visíveis (por isso, com uma pesquisa, escolhe-se por grupos)
  const toggleVisible = () => {
    const ids = new Set(visible.map((o) => o.value));
    onChange?.(allVisibleSelected ? value.filter((c) => !ids.has(c)) : [...new Set([...value, ...visible.map((o) => o.value)])]);
  };

  return (
    <div className="rounded-xl border border-solid border-[#D0D4DC] bg-white">
      <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-[#F0F0F0] p-3">
        <Input allowClear className="min-w-48 flex-1" prefix={<LuSearch className="text-[#8A8D98]" />} placeholder={t("Search countries...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#5B5F6B]">
          <Switch size="small" checked={onlySelected} onChange={setOnlySelected} />
          {t("Only selected")}
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 bg-[#FAFAFB] px-3 py-2 text-[13px]">
        <span className="font-semibold text-[#163986]">{t("{{count}} selected", { count: value.length })}</span>
        <div className="flex gap-1">
          <Button type="link" size="small" disabled={!visible.length} onClick={toggleVisible}>
            {allVisibleSelected ? t("Clear") : term || onlySelected ? t("Select shown") : t("Select all")}
          </Button>
          {value.length > 0 && (
            <Button type="link" size="small" danger onClick={() => onChange?.([])}>
              {t("Clear all")}
            </Button>
          )}
        </div>
      </div>

      <div className={`${maxHeight} overflow-y-auto p-3`}>
        {visible.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("No countries found")} />
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((o) => (
              <Checkbox key={o.value} title={o.label} className="min-w-0 items-center! [&>span:last-child]:min-w-0 [&>span:last-child]:truncate" checked={selected.has(o.value)} onChange={(e) => toggle(o.value, e.target.checked)}>
                {o.label}
              </Checkbox>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
