import { useMemo, useState } from "react";
import { Button, Empty, Select, Switch, Tag } from "antd";
import { LuBookOpen, LuChevronDown, LuCircleCheck, LuPill, LuUsers } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { StackedBar, HorizontalBars } from "../../../components/admin/charts";

// Nº de países visíveis por idioma antes do "Mostrar tudo"
const COUNTRIES_PREVIEW = 5;

const STATUS_COLORS = { notStarted: "#C7F1F8", inProgress: "#9BE3EF", approved: "#40CBE0", notApproved: "#0397AE" };
const SCORE_BUCKETS = [
  { key: "<= 100%", color: "#0397AE" },
  { key: "< 80%", color: "#00B9D6" },
  { key: "< 60%", color: "#40CBE0" },
  { key: "< 40%", color: "#9BE3EF" },
  { key: "< 20%", color: "#C7F1F8" },
];
const NO_PRODUCT = "none";

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// Estatísticas dos testes de um conjunto de cursos (os de um produto, ou todos): estado de cada teste por aluno (por iniciar, em progresso,
// aprovado, reprovado), distribuição da pontuação média e média por idioma e por país. Cada combinação aluno + teste conta uma vez e a
// pontuação é a média de todas as suas tentativas.
function computeStats(obj, courses, languages) {
  const counts = { notStarted: 0, inProgress: 0, approved: 0, notApproved: 0 };
  const buckets = Object.fromEntries(SCORE_BUCKETS.map((b) => [b.key, 0]));
  const courseIds = new Set(courses.map((c) => c.id));
  const users = (obj.users || []).filter((u) => u.id_role === 2 && u.status?.toLowerCase() === "approved");
  const userCountry = Object.fromEntries(users.map((u) => [u.id, u.country]));
  const userIds = new Set(users.map((u) => u.id));

  // Tentativas por aluno + teste
  const attemptsByKey = {};
  (obj.activity || []).forEach((a) => {
    if (a.activity_type !== "test" || a.is_deleted !== 0 || !userIds.has(a.id_user) || !courseIds.has(a.id_course)) return;
    const key = `${a.id_user}_${a.id_course_test}`;
    (attemptsByKey[key] = attemptsByKey[key] || []).push(a);
  });

  const byLang = {}; // id_lang -> { total, count }
  const byCountry = {}; // id_lang -> { país -> { total, count } }
  const byCourse = {}; // id_course -> { total, count }
  const students = new Set();
  let scoreTotal = 0;
  let scoreCount = 0;

  Object.values(attemptsByKey).forEach((attempts) => {
    const first = attempts[0];
    students.add(first.id_user);
    const average =
      attempts.reduce((sum, a) => {
        const items = parseJson(a.meta_data, {})?.items ?? [];
        return sum + (items.length > 0 ? (items.filter((i) => i.is_correct).length * 100) / items.length : 0);
      }, 0) / attempts.length;

    const completed = attempts.some((a) => a.is_completed === 1);
    if (completed) counts.approved += 1;

    if (average < 20) buckets["< 20%"] += 1;
    else if (average < 40) buckets["< 40%"] += 1;
    else if (average < 60) buckets["< 60%"] += 1;
    else if (average < 80) buckets["< 80%"] += 1;
    else buckets["<= 100%"] += 1;

    scoreTotal += average;
    scoreCount += 1;

    const course = courses.find((c) => c.id === first.id_course);
    if (course) {
      byCourse[course.id] = byCourse[course.id] || { total: 0, count: 0 };
      byCourse[course.id].total += average;
      byCourse[course.id].count += 1;
      if (course.id_lang) {
        byLang[course.id_lang] = byLang[course.id_lang] || { total: 0, count: 0 };
        byLang[course.id_lang].total += average;
        byLang[course.id_lang].count += 1;
        const country = userCountry[first.id_user] || "—";
        byCountry[course.id_lang] = byCountry[course.id_lang] || {};
        byCountry[course.id_lang][country] = byCountry[course.id_lang][country] || { total: 0, count: 0 };
        byCountry[course.id_lang][country].total += average;
        byCountry[course.id_lang][country].count += 1;
      }
    }

    // Sem aprovação: reprovado se esgotou as tentativas permitidas, senão em progresso
    if (!completed) {
      const test = (obj.tests || []).find((x) => x.id === first.id_course_test && x.is_deleted !== 1);
      if (test) {
        const retries = parseJson(test.settings, null)?.retries_allowed;
        if (retries && retries > 0 && attempts.length >= retries) counts.notApproved += 1;
        else counts.inProgress += 1;
      }
    }
  });

  // Testes dos cursos sem nenhuma tentativa de qualquer aluno
  const testsWithAttempts = new Set(Object.values(attemptsByKey).map((a) => a[0].id_course_test));
  (obj.tests || []).forEach((test) => {
    if (test.is_deleted !== 1 && courseIds.has(test.id_course) && !testsWithAttempts.has(test.id)) counts.notStarted += 1;
  });

  const avgByLang = (languages || []).map((lang) => ({
    id: lang.id,
    code: lang.code.toUpperCase(),
    name: lang.name,
    flag: lang.flag,
    count: byLang[lang.id]?.count || 0,
    avgScore: byLang[lang.id] ? byLang[lang.id].total / byLang[lang.id].count : 0,
    countries: Object.entries(byCountry[lang.id] || {})
      .map(([country, d]) => ({ country, avgScore: d.total / d.count, count: d.count }))
      .sort((a, b) => b.avgScore - a.avgScore || a.country.localeCompare(b.country)),
  }));

  const courseScores = courses
    .map((c) => ({ id: c.id, name: c.internal_name || c.name, count: byCourse[c.id]?.count || 0, avgScore: byCourse[c.id] ? byCourse[c.id].total / byCourse[c.id].count : 0 }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const evaluated = counts.approved + counts.notApproved;
  return {
    counts,
    buckets,
    avgByLang,
    courseScores,
    courses: courses.length,
    students: students.size,
    attempts: scoreCount,
    avgScore: scoreCount > 0 ? scoreTotal / scoreCount : null,
    approvalRate: evaluated > 0 ? Math.round((counts.approved * 100) / evaluated) : null,
  };
}

// Barra horizontal compacta (label + barra + valor) usada nas médias por idioma, país e curso
function ScoreBar({ label, value, hasData, flag, bold }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex w-24 min-w-24 items-center gap-2 sm:w-40 sm:min-w-40">
        {flag && <img src={flag} alt={label} className="max-h-5 max-w-5 rounded-sm" onError={(e) => (e.target.style.display = "none")} />}
        <span title={label} className={`truncate text-[13px] ${bold ? "font-bold text-[#163986]" : "text-[#163986]"}`}>
          {label}
        </span>
      </div>
      <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-[#E8ECF4]">
        <div className="h-full rounded-full" style={{ width: `${hasData ? Math.max(value, 1) : 0}%`, backgroundColor: bold ? "#163986" : "#00B9D6" }} />
      </div>
      <span className={`w-14 min-w-14 text-right text-[13px] sm:w-16 sm:min-w-16 ${hasData ? "font-bold text-[#163986]" : "text-[#8B9CC3]"}`}>{hasData ? `${value.toFixed(1)}%` : "—"}</span>
    </div>
  );
}

const Kpi = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-[14px] bg-white p-4 shadow">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E6F9FC] text-[20px] text-[#163986]">{icon}</span>
    <div>
      <p className="mb-0! text-[22px] font-bold leading-tight">{value}</p>
      <p className="mb-0! text-[12px] text-[#8A8D98]">{label}</p>
    </div>
  </div>
);

// Média por idioma ou, em alternativa, por país dentro de cada idioma
function LangScores({ stats, groupByCountry, expanded, toggle, prefix, t }) {
  const langs = stats.avgByLang.filter((l) => l.count > 0 || !groupByCountry);
  if (stats.attempts === 0) return <p className="py-4 text-center text-[13px] text-[#8B9CC3]">{t("No data available")}</p>;
  if (!groupByCountry) {
    return (
      <div className="flex flex-col divide-y divide-[#E8ECF4]">
        {stats.avgByLang.map((l) => (
          <ScoreBar key={l.id} label={l.code} flag={l.flag} value={l.avgScore} hasData={l.count > 0} bold />
        ))}
      </div>
    );
  }
  return (
    <div className="flex max-h-130 flex-col gap-3 overflow-y-auto pr-1">
      {langs.map((l) => {
        const key = `${prefix}-${l.id}`;
        const visible = expanded[key] ? l.countries : l.countries.slice(0, COUNTRIES_PREVIEW);
        return (
          <div key={l.id} className="shrink-0 overflow-hidden rounded-[12px] border border-[#E5E7EB]">
            <div className="flex items-center justify-between gap-2 bg-[#F6F7F9] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <img src={l.flag} alt={l.code} className="max-h-5 max-w-5 rounded-sm" onError={(e) => (e.target.style.display = "none")} />
                <span className="text-[13px] font-bold text-[#163986]">{l.code}</span>
                <span className="text-[12px] text-[#8B9CC3]">
                  {l.countries.length} {t("Countries")}
                </span>
              </div>
              <span className="rounded-full bg-[#163986] px-2 py-0.5 text-[13px] font-bold text-white">{l.avgScore.toFixed(1)}%</span>
            </div>
            <div className="px-3 py-2">
              {visible.map((c) => (
                <ScoreBar key={c.country} label={t(c.country)} value={c.avgScore} hasData={c.count > 0} />
              ))}
              {l.countries.length > COUNTRIES_PREVIEW && (
                <button type="button" className="mt-1 cursor-pointer border-0 bg-transparent text-[12px] font-bold text-[#00B9D6] hover:underline" onClick={() => toggle(key)}>
                  {expanded[key] ? t("Show less") : `${t("Show all")} (${l.countries.length})`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Um produto: cabeçalho com os números principais e, ao abrir, as estatísticas de todos os cursos associados a esse produto
function ProductCard({ title, stats, open, onToggle, groupByCountry, expanded, toggleExpanded, prefix, t }) {
  const statusSegments = [
    { label: t("Not started"), value: stats.counts.notStarted, color: STATUS_COLORS.notStarted },
    { label: t("In progress"), value: stats.counts.inProgress, color: STATUS_COLORS.inProgress },
    { label: t("Approved"), value: stats.counts.approved, color: STATUS_COLORS.approved },
    { label: t("Repproved"), value: stats.counts.notApproved, color: STATUS_COLORS.notApproved },
  ];
  const scoreRows = SCORE_BUCKETS.map((b) => ({ label: b.key, value: stats.buckets[b.key], color: b.color }));

  return (
    <div className="overflow-hidden rounded-[16px] border border-solid border-[#E5E7EB] bg-white">
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()} className="flex cursor-pointer flex-wrap items-center gap-4 p-4 hover:bg-[#FAFBFD]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E6F9FC] text-[20px] text-[#163986]">
          <LuPill />
        </span>
        <div className="min-w-[180px] flex-1">
          <p className="mb-0! text-[16px] font-bold">{title}</p>
          <p className="mb-0! text-[12px] text-[#8A8D98]">
            {t("{{count}} courses", { count: stats.courses })} · {t("{{count}} students evaluated", { count: stats.students })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tag color="blue" className="m-0!">
            {t("Average score")}: {stats.avgScore === null ? "—" : `${stats.avgScore.toFixed(1)}%`}
          </Tag>
          <Tag color="green" className="m-0!">
            {t("Approval rate")}: {stats.approvalRate === null ? "—" : `${stats.approvalRate}%`}
          </Tag>
          <LuChevronDown className={`text-[20px] text-[#163986] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-6 border-0 border-t border-solid border-[#EEF0F5] bg-[#F7F8FA] p-4 md:p-5 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
              <p className="mb-4! text-[14px] font-bold">{t("Status distribution")}</p>
              <StackedBar segments={statusSegments} />
            </div>
            <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
              <p className="mb-4! text-[14px] font-bold">{t("Score percentage")}</p>
              <HorizontalBars rows={scoreRows} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
              <p className="mb-3! text-[14px] font-bold">{groupByCountry ? t("Average score by country") : t("Average score by language")}</p>
              <LangScores stats={stats} groupByCountry={groupByCountry} expanded={expanded} toggle={toggleExpanded} prefix={prefix} t={t} />
            </div>
            <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
              <p className="mb-3! text-[14px] font-bold">{t("Average score by course")}</p>
              {stats.courseScores.length > 0 ? (
                <div className="flex flex-col divide-y divide-[#E8ECF4]">
                  {stats.courseScores.map((c) => (
                    <ScoreBar key={c.id} label={c.name} value={c.avgScore} hasData={c.count > 0} />
                  ))}
                </div>
              ) : (
                <p className="py-2 text-center text-[13px] text-[#8B9CC3]">{t("No data available")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Progresso dos testes agrupado por produto: as estatísticas de todos os cursos de cada produto, com a média por idioma ou por país
export default function TestProgress({ data, products, languages }) {
  const { t } = useTranslation();
  const [productFilter, setProductFilter] = useState(null);
  const [groupByCountry, setGroupByCountry] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [openProducts, setOpenProducts] = useState({});

  const courses = useMemo(() => (data?.courses || []).filter((c) => c.is_deleted !== 1), [data]);

  // Um grupo por produto com cursos (e um para os cursos sem produto)
  const groups = useMemo(() => {
    if (!data || !data.users) return [];
    const list = (products || [])
      .filter((p) => p.is_deleted !== 1)
      .map((p) => ({ key: String(p.id), title: p.name, courses: courses.filter((c) => c.id_product === p.id) }));
    const orphan = courses.filter((c) => !c.id_product || !(products || []).some((p) => p.id === c.id_product));
    if (orphan.length > 0) list.push({ key: NO_PRODUCT, title: t("No product"), courses: orphan });
    // Os produtos com alunos avaliados primeiro (por nº de alunos), depois os restantes por nome
    return list
      .filter((g) => g.courses.length > 0)
      .map((g) => ({ ...g, stats: computeStats(data, g.courses, languages) }))
      .sort((a, b) => b.stats.students - a.stats.students || a.title.localeCompare(b.title));
  }, [data, products, courses, languages, t]);

  const visible = groups.filter((g) => productFilter === null || g.key === String(productFilter));
  const total = useMemo(() => (data?.users ? computeStats(data, visible.flatMap((g) => g.courses), languages) : null), [data, visible, languages]);

  const isOpen = (key, index) => (key in openProducts ? openProducts[key] : visible.length === 1 || index === 0);

  return (
    <div>
      <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className={`cursor-pointer ${!groupByCountry ? "font-bold text-[#163986]" : "text-[#8B9CC3]"}`} onClick={() => setGroupByCountry(false)}>
            {t("By language")}
          </span>
          <Switch size="small" checked={groupByCountry} onChange={setGroupByCountry} aria-label={t("By country")} />
          <span className={`cursor-pointer ${groupByCountry ? "font-bold text-[#163986]" : "text-[#8B9CC3]"}`} onClick={() => setGroupByCountry(true)}>
            {t("By country")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            allowClear
            className="w-full sm:w-[260px]!"
            placeholder={t("Select product")}
            showSearch={{ optionFilterProp: ["label"] }}
            value={productFilter ?? undefined}
            onChange={(value) => setProductFilter(value ?? null)}
            options={groups.map((g) => ({ label: g.title, value: g.key === NO_PRODUCT ? NO_PRODUCT : Number(g.key) }))}
          />
          <Button onClick={() => setOpenProducts(Object.fromEntries(visible.map((g) => [g.key, true])))}>{t("Expand all")}</Button>
          <Button onClick={() => setOpenProducts(Object.fromEntries(visible.map((g) => [g.key, false])))}>{t("Collapse all")}</Button>
        </div>
      </div>

      {total && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<LuPill />} label={t("Products")} value={visible.length} />
          <Kpi icon={<LuBookOpen />} label={t("Courses")} value={total.courses} />
          <Kpi icon={<LuUsers />} label={t("Students evaluated")} value={total.students} />
          <Kpi icon={<LuCircleCheck />} label={t("Average score")} value={total.avgScore === null ? "—" : `${total.avgScore.toFixed(1)}%`} />
        </div>
      )}

      {visible.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visible.map((g, index) => (
            <ProductCard
              key={g.key}
              title={g.title}
              stats={g.stats}
              open={isOpen(g.key, index)}
              onToggle={() => setOpenProducts((prev) => ({ ...prev, [g.key]: !isOpen(g.key, index) }))}
              groupByCountry={groupByCountry}
              expanded={expanded}
              toggleExpanded={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              prefix={g.key}
              t={t}
            />
          ))}
        </div>
      ) : (
        <Empty description={t("No data available")} />
      )}
    </div>
  );
}
