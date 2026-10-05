import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { Select, Spin } from "antd";
import { useTranslation } from "react-i18next";

import endpoints from "../../utils/endpoints";
import useDebounced from "../../utils/useDebounced";

const label = (u) => `${u.name} (${u.email})`;

// Seletor de pessoas com pesquisa no servidor (em vez de carregar todos os utilizadores): escreve-se e aparecem até 30 resultados.
// `value`: ids escolhidos (modo múltiplo) ou um id; `known`: pessoas já conhecidas ({ id, name, email }) para mostrar o nome de quem
// já está escolhido; `excludeIds`: não mostra estas pessoas nos resultados; `idLang`: limita a um idioma.
export default function UserSelect({ value, onChange, known = [], excludeIds = [], idLang, multiple = true, placeholder, className = "w-full", size = "large" }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState({}); // id → pessoa, de tudo o que já foi visto
  const q = useDebounced(search);
  const requestRef = useRef(0);

  const remember = (list) => setLoaded((prev) => ({ ...prev, ...Object.fromEntries(list.map((u) => [u.id, u])) }));
  const knownKey = known.map((u) => u.id).join(",");
  useEffect(() => remember(known), [knownKey]);

  // Pesquisa (também com a caixa vazia: as primeiras pessoas por nome)
  useEffect(() => {
    const request = ++requestRef.current;
    setIsLoading(true);
    axios
      .get(endpoints.user.search, { params: { q, id_lang: idLang } })
      .then((res) => {
        if (request !== requestRef.current) return;
        setResults(res.data);
        remember(res.data);
      })
      .catch(() => {})
      .finally(() => request === requestRef.current && setIsLoading(false));
  }, [q, idLang]);

  // Quem já estava escolhido mas não veio nos resultados: pede os nomes por id
  const selected = multiple ? value || [] : value ? [value] : [];
  const missingKey = selected.filter((id) => !loaded[id]).join(",");
  useEffect(() => {
    if (!missingKey) return;
    axios.get(endpoints.user.search, { params: { ids: missingKey } }).then((res) => remember(res.data)).catch(() => {});
  }, [missingKey]);

  const selectedKey = selected.join(",");
  const excludeKey = excludeIds.join(",");
  const options = useMemo(() => {
    const byId = new Map();
    results.filter((u) => !excludeIds.includes(u.id)).forEach((u) => byId.set(u.id, u));
    selected.forEach((id) => loaded[id] && byId.set(id, loaded[id]));
    return [...byId.values()].map((u) => ({ value: u.id, label: label(u) }));
  }, [results, loaded, selectedKey, excludeKey]);

  return (
    <Select
      mode={multiple ? "multiple" : undefined}
      size={size}
      className={className}
      showSearch
      filterOption={false}
      allowClear
      placeholder={placeholder || t("Search user...")}
      value={value}
      onChange={onChange}
      onSearch={setSearch}
      onOpenChange={(open) => !open && setSearch("")}
      notFoundContent={isLoading ? <Spin size="small" /> : t("No users found")}
      options={options}
    />
  );
}
