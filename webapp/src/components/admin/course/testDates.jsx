import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { REFERENCE_TZ, countryTimeZone, instantToWall, parseInstant, wallToInstant } from "../../../utils/testSchedule";
import countryTimezones from "../../../utils/countryTimezones.json";

/**
 * @component ZonedDatePicker
 * @description Seletor de data e hora que mostra e interpreta a hora de um fuso (por omissão Lisboa), seja qual for o fuso do computador de quem
 * edita. Guarda o instante absoluto (ISO em UTC), por isso cada aluno vê a mesma data na sua hora local e o servidor decide pelo mesmo instante.
 * Valores antigos sem fuso leem-se como hora de Lisboa.
 */
export function ZonedDatePicker({ value, onChange, timeZone = REFERENCE_TZ, ...props }) {
  const ms = parseInstant(value, timeZone);
  const shown = ms === null ? null : dayjs(instantToWall(ms, timeZone));
  return (
    <DatePicker
      showTime={{ format: "HH:mm" }}
      format="YYYY-MM-DD HH:mm"
      size="large"
      className="w-full"
      {...props}
      value={shown}
      onChange={(date) => onChange?.(date ? new Date(wallToInstant(date.year(), date.month() + 1, date.date(), date.hour(), date.minute(), timeZone)).toISOString() : null)}
    />
  );
}

/**
 * @component CountryDates
 * @description Datas próprias de alguns países (settings.country_dates): para cada país escolhido, um início e/ou um fim na hora local desse país.
 * O que ficar vazio segue a data de Lisboa. Quem tem esse país na conta passa a ver (e a ser regido por) estas datas.
 * @param {object} value - { [país]: { start_date, end_date } }
 * @param {function} onChange
 * @param {Array<{value: string, label: string}>} countries - Países que o teste pode ter.
 */
export function CountryDates({ value, onChange, countries }) {
  const { t } = useTranslation();
  const current = value && typeof value === "object" ? value : {};
  const selected = Object.keys(current);

  const setCountries = (list) => {
    const next = {};
    list.forEach((country) => (next[country] = current[country] ?? { start_date: null, end_date: null }));
    onChange?.(next);
  };
  const setDate = (country, key, date) => onChange?.({ ...current, [country]: { ...current[country], [key]: date } });

  return (
    <div className="flex flex-col gap-3">
      <Select
        mode="multiple"
        size="large"
        className="w-full"
        placeholder={t("Add a country with its own dates")}
        value={selected}
        onChange={setCountries}
        options={countries}
        showSearch={{ optionFilterProp: ["label"] }}
      />
      {selected.map((country) => {
        const timeZone = countryTimeZone(country, countryTimezones);
        const label = countries.find((c) => c.value === country)?.label ?? country;
        return (
          <div key={country} className="grid grid-cols-1 lg:grid-cols-[160px_1fr_1fr] items-center gap-3 rounded-[10px] bg-[#F6F7FB] p-3">
            <div className="min-w-0">
              <span className="block font-semibold text-[#163986]">{label}</span>
              <span className="block text-[12px] text-[#8A8D98]">
                {t("Local time")} · {timeZone.split("/").pop().replace(/_/g, " ")}
              </span>
            </div>
            <ZonedDatePicker value={current[country]?.start_date} timeZone={timeZone} placeholder={t("Same as Lisbon")} onChange={(date) => setDate(country, "start_date", date)} />
            <ZonedDatePicker value={current[country]?.end_date} timeZone={timeZone} placeholder={t("Same as Lisbon")} onChange={(date) => setDate(country, "end_date", date)} />
          </div>
        );
      })}
    </div>
  );
}
