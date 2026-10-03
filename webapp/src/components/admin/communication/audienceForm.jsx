import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Radio, Select, Spin, Tag } from "antd";
import { LuUsers } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import endpoints from "../../../utils/endpoints";

// Resumo do público numa frase curta (lista de comunicações e detalhes)
export function audienceSummary(audience, t) {
  const a = audience || {};
  const parts = [];
  if (a.scope === "selected") {
    const n = (a.users?.length || 0) + (a.groups?.length || 0) + (a.courses?.length || 0);
    parts.push(t("{{count}} selected", { count: n }));
  } else {
    parts.push(t("All users"));
  }
  const filters = (a.roles?.length || 0) + (a.countries?.length || 0) + (a.languages?.length || 0);
  if (filters > 0) parts.push(t("{{count}} filters", { count: filters }));
  return parts.join(" · ");
}

// Público de uma comunicação: "todos" ou "selecionados" (utilizadores, grupos e cursos) + filtros que restringem (função, país,
// idioma). Mostra o número de destinatários a atualizar-se ao vivo e alguns exemplos.
export default function AudienceForm({ value, onChange, disabled }) {
  const { t } = useTranslation();
  const audience = { scope: "all", users: [], groups: [], courses: [], roles: [], countries: [], languages: [], ...value };
  const [options, setOptions] = useState({ groups: [], courses: [], roles: [], countries: [], languages: [] });
  const [userOptions, setUserOptions] = useState([]);
  const [count, setCount] = useState(null);
  const [isCounting, setIsCounting] = useState(false);
  const searchTimer = useRef(null);
  const countTimer = useRef(null);

  useEffect(() => {
    axios.get(endpoints.communication.options).then((res) => setOptions(res.data)).catch(() => {});
  }, []);

  // Nomes dos utilizadores já escolhidos (só guardamos os ids)
  const idsKey = (audience.users || []).join(",");
  useEffect(() => {
    if (!audience.users?.length) return;
    axios
      .post(endpoints.communication.usersByIds, { data: { ids: audience.users } })
      .then((res) => setUserOptions((prev) => [...new Map([...prev, ...res.data].map((u) => [u.id, u])).values()]))
      .catch(() => {});
  }, [idsKey]);

  // Número de destinatários: com atraso, para não pedir a cada clique
  const audienceKey = JSON.stringify(audience);
  useEffect(() => {
    clearTimeout(countTimer.current);
    setIsCounting(true);
    countTimer.current = setTimeout(() => {
      axios
        .post(endpoints.communication.audience, { data: { audience } })
        .then((res) => setCount(res.data))
        .catch(() => setCount(null))
        .finally(() => setIsCounting(false));
    }, 500);
    return () => clearTimeout(countTimer.current);
  }, [audienceKey]);

  const set = (patch) => onChange?.({ ...audience, ...patch });

  function searchUsers(q) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      axios
        .get(endpoints.communication.users, { params: { q } })
        .then((res) => setUserOptions((prev) => [...new Map([...prev, ...res.data].map((u) => [u.id, u])).values()]))
        .catch(() => {});
    }, 300);
  }

  const multi = (placeholder, key, list, label = (i) => i.name) => (
    <Select
      mode="multiple"
      allowClear
      disabled={disabled}
      placeholder={placeholder}
      value={audience[key]}
      onChange={(v) => set({ [key]: v })}
      options={list.map((i) => ({ value: i.id ?? i, label: label(i) }))}
      optionFilterProp="label"
      className="w-full"
      maxTagCount="responsive"
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <Radio.Group value={audience.scope} onChange={(e) => set({ scope: e.target.value })} disabled={disabled}>
        <Radio.Button value="all">{t("All users")}</Radio.Button>
        <Radio.Button value="selected">{t("Selected users")}</Radio.Button>
      </Radio.Group>

      {audience.scope === "selected" && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#8A8D98] mb-0!">{t("Sent to the people you pick, the members of the groups and everyone with access to the courses")}</p>
          <Select
            mode="multiple"
            showSearch
            filterOption={false}
            disabled={disabled}
            placeholder={t("Search users by name or e-mail")}
            value={audience.users}
            onSearch={searchUsers}
            onFocus={() => userOptions.length === 0 && searchUsers("")}
            onChange={(v) => set({ users: v })}
            options={userOptions.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
            className="w-full"
            maxTagCount="responsive"
          />
          {multi(t("User groups"), "groups", options.groups)}
          {multi(t("Courses (everyone with access)"), "courses", options.courses, (c) => c.internal_name || c.name)}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-[#8A8D98] mb-0!">{t("Narrow the audience (optional)")}</p>
        {multi(t("Role"), "roles", options.roles)}
        {multi(t("Language"), "languages", options.languages)}
        {multi(t("Country"), "countries", options.countries.map((c) => ({ id: c, name: c })))}
      </div>

      <div className="rounded-lg bg-[#F6F7FB] p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <LuUsers className="text-[#163986]" />
          {isCounting && !count ? (
            <Spin size="small" />
          ) : (
            <span className="font-semibold text-[#163986]">{t("{{count}} recipients", { count: count?.total ?? 0 })}</span>
          )}
          {isCounting && count && <Spin size="small" />}
        </div>
        {count?.sample?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {count.sample.map((u) => (
              <Tag key={u.id} className="m-0!">
                {u.name}
              </Tag>
            ))}
            {count.total > count.sample.length && <span className="text-[12px] text-[#8A8D98]">+{count.total - count.sample.length}</span>}
          </div>
        )}
        <p className="text-[12px] text-[#8A8D98] mb-0!">{t("Only approved users with a valid e-mail receive it")}</p>
      </div>
    </div>
  );
}
