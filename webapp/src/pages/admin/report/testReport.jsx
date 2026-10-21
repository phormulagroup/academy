import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Button,
  ConfigProvider,
  Form,
  Input,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { IoSearch } from "react-icons/io5";
import { CiCalendar } from "react-icons/ci";
import config from "../../../utils/config";
import { LuDownload, LuInfo } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import { Context } from "../../../utils/context";
import ExportTable from "../../../components/admin/export/export";
import UserCell from "../../../components/admin/userCell";
import {
  StackedBar,
  HorizontalBars,
} from "../../../components/admin/charts";
import { Kpi, FilterLabel } from "../../../components/admin/reportPanel";
import {
  getTestReportColumns,
  getTestStudentColumns,
  getTestAttemptColumns,
  getTestQuestionColumns,
} from "../../../utils/columns";
import { floorPercent, roundPercent } from "../../../utils/percent";
import {
  isTestFailed,
  parseSettings,
  testsForStudent,
} from "../../../utils/courseStatus";

// Cores da marca Bial para os gráficos (do mais claro ao mais escuro), as mesmas do relatório de cursos
const PALETTE = {
  lighter: "#B8E9F1",
  light: "#66D4E6",
  base: "#00b9d6",
  darker: "#163986",
};

// Escalões do resultado (melhor tentativa de cada aluno): intervalos que acompanham a nota mínima de 75%, para a última barra
// ser exatamente quem atingiu a aprovação (o relatório de cursos usa os seus próprios escalões de progresso)
const RESULT_BUCKETS = [
  { min: 0, max: 24 },
  { min: 25, max: 49 },
  { min: 50, max: 74 },
  { min: 75, max: 100 },
];
const resultBuckets = () => {
  const colors = [PALETTE.lighter, PALETTE.light, PALETTE.base, PALETTE.darker];
  return RESULT_BUCKETS.map((b, i) => ({ ...b, label: `${b.min}–${b.max}%`, value: 0, color: colors[i] }));
};

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return (typeof value === "string" ? JSON.parse(value) : value) || fallback;
  } catch {
    return fallback;
  }
};

const fmtDay = (value) => (value ? dayjs(value).format("DD MMM, YYYY") : "—");
const average = (list) =>
  list.length ? list.reduce((sum, v) => sum + v, 0) / list.length : null;
const oneDecimal = (value) => Math.round(value * 10) / 10;

// Duração em segundos: "1 h 5 min", "3 min 20 s" ou "45 s"
function formatTime(seconds) {
  const s = Math.round(seconds);
  const hours = Math.floor(s / 3600);
  if (hours > 0) return `${hours} h ${Math.round((s % 3600) / 60)} min`;
  const minutes = Math.floor(s / 60);
  return minutes > 0 ? `${minutes} min ${s % 60} s` : `${s} s`;
}

// Sem tempo limite o eLearning não mede o tempo (fica 0 s): mostra-se a indicação em vez de "0 s"
const timeLabel = (seconds, timeLimit, t) =>
  !timeLimit ? t("No time limit") : seconds == null ? "—" : formatTime(seconds);

// Estados do aluno no teste (chaves de tradução) e cores das etiquetas, como no relatório de cursos
const STATUS = {
  not_started: "Not started",
  in_progress: "In progress",
  approved: "Approved",
  failed: "Failed",
};
const STATUS_COLORS = { approved: "green", failed: "red", in_progress: "blue" };

// Resultado de um aluno num teste: tentativas por ordem de data, médias e estado
// (aprovado: alguma tentativa aprovada; reprovado: esgotou as tentativas permitidas; em curso: tentou mas ainda não acabou)
function studentResult(test, tries) {
  const attempts = [...tries]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((a, i) => {
      const meta = parseJson(a.meta_data, {});
      const items = Array.isArray(meta.items) ? meta.items : [];
      const correct = items.filter((q) => q.is_correct).length;
      return {
        key: a.id,
        number: i + 1,
        created_at: a.created_at,
        items,
        correct,
        total: items.length,
        percent: items.length ? (correct * 100) / items.length : 0,
        passed: a.is_completed === 1,
        // Concluído pelo Admin: sem tempo de resposta (não foi feito pelo aluno)
        seconds: meta.completed_by_admin ? null : Number(meta.time) || 0,
      };
    });
  const approvedAttempt = attempts.find((a) => a.passed);
  const status = !attempts.length
    ? "not_started"
    : approvedAttempt
      ? "approved"
      : isTestFailed(tries, test)
        ? "failed"
        : "in_progress";
  return {
    attempts,
    status,
    startedAt: attempts[0]?.created_at ?? null,
    approvedAt: approvedAttempt?.created_at ?? null,
    avgCorrect: average(attempts.map((a) => a.correct)),
    total: attempts[attempts.length - 1]?.total ?? 0,
    avgPercent: average(attempts.map((a) => a.percent)),
    bestPercent: attempts.length
      ? Math.max(...attempts.map((a) => a.percent))
      : null,
    avgSeconds: average(
      attempts.filter((a) => a.seconds !== null).map((a) => a.seconds),
    ),
  };
}

// Uma linha por teste (sem repetidos), com os alunos que o podem fazer: o público do curso (países do curso ou, sem limite,
// o idioma do curso) e o limite de países do teste.
// O filtro de países filtra TESTES (não alunos): fica o teste cujo limite de países inclui um dos escolhidos; sem limite próprio,
// vale o público do curso (o limite de países do curso ou, sem ele, todos os países do idioma, ou seja, aparece sempre).
function buildRows(data, filters, languages, t) {
  if (!data?.tests) return [];
  const courses = new Map(
    (data.courses || [])
      .filter((c) => c.is_deleted !== 1)
      .map((c) => [c.id, c]),
  );
  const students = (data.users || []).filter(
    (u) => u.id_role === 2 && u.status?.toLowerCase() === "approved",
  );
  const studentIds = new Set(students.map((u) => u.id));
  const countries = filters.country?.length ? filters.country : null;

  // Tentativas por teste e aluno (sem registos apagados nem de admins)
  const tries = new Map();
  (data.activity || []).forEach((a) => {
    if (
      a.activity_type !== "test" ||
      a.is_deleted === 1 ||
      !studentIds.has(a.id_user)
    )
      return;
    const key = `${a.id_course_test}_${a.id_user}`;
    if (!tries.has(key)) tries.set(key, []);
    tries.get(key).push(a);
  });

  const seen = new Set();
  const rows = [];
  (data.tests || []).forEach((test) => {
    if (test.is_deleted === 1 || seen.has(test.id)) return;
    seen.add(test.id);
    const course = courses.get(test.id_course);
    if (!course || (filters.course && course.id !== filters.course)) return;
    const ts = parseSettings(test.settings);
    const cs = parseSettings(course.settings);
    const limit =
      ts.country_limit && Array.isArray(ts.country) && ts.country.length
        ? ts.country
        : null;
    const courseLimit = cs.country_limit ? cs.country || [] : null;
    // Países em que o teste está disponível: os do teste ou, sem limite próprio, os do curso (settings.country; null = todos).
    // Filtro de país: só os testes desse(s) país(es) — com limite (do teste ou do curso) que o inclua; os testes para todos ficam de fora
    const available = limit || courseLimit;
    if (countries && !(available && available.some((c) => countries.includes(c)))) return;

    const audience = students.filter(
      (u) =>
        (courseLimit
          ? courseLimit.includes(u.country)
          : u.id_lang === course.id_lang) &&
        testsForStudent([test], u).length > 0,
    );
    const results = audience.map((u) => ({
      user: u,
      ...studentResult(test, tries.get(`${test.id}_${u.id}`) || []),
    }));
    const count = (status) => results.filter((r) => r.status === status).length;
    const avgResult = average(
      results.filter((r) => r.attempts.length).map((r) => r.avgPercent),
    );
    const timeLimit = Number(ts.time) > 0 ? Number(ts.time) : 0;
    const retries =
      Number(ts.retries_allowed) > 0 ? Number(ts.retries_allowed) : 0;

    rows.push({
      id: test.id,
      test,
      results,
      timeLimit,
      retriesAllowed: retries,
      test_name: test.title,
      start_date: fmtDay(ts.start_date),
      end_date: fmtDay(ts.end_date),
      // Na tabela o nome do curso; no Excel o nome interno (o nome oficial repete-se entre idiomas e versões)
      course_name: course.name,
      internal_name: course.internal_name || course.name,
      thumbnail: course.thumbnail, // só para mostrar na tabela; não faz parte das colunas do Excel
      approved: count("approved"),
      failed: count("failed"),
      in_progress: count("in_progress"),
      not_started: count("not_started"),
      percentage: `${roundPercent(audience.length ? (count("approved") * 100) / audience.length : 0)}%`,
      students: audience.length,
      country: limit ? limit.map((c) => t(c)).join(", ") : t("All"),
      // Teste sem limite próprio num curso com limite: "Todos", mas só os alunos dos países do curso o podem fazer (e só esses contam)
      country_note:
        !limit && courseLimit
          ? t("Test without its own limit: available to the course's countries ({{countries}})", {
              countries: courseLimit.map((c) => t(c)).join(", "),
            })
          : null,
      country_export:
        !limit && courseLimit
          ? `${t("All")} (${courseLimit.map((c) => t(c)).join(", ")})`
          : null,
      lang:
        languages?.find((l) => l.id === course.id_lang)?.code?.toUpperCase() ??
        "",
      avg_result: avgResult === null ? "—" : `${roundPercent(avgResult)}%`,
      passing_score: `${ts.passing_score ?? 75}%`,
      time_limit: timeLimit ? `${timeLimit} min` : t("No time limit"),
      retries: retries || t("Unlimited"),
    });
  });
  return rows.sort(
    (a, b) =>
      a.course_name.localeCompare(b.course_name) ||
      a.test_name.localeCompare(b.test_name),
  );
}

// Linha de um aluno na lista do teste (as mesmas colunas no ecrã e no Excel)
function studentRow(r, row, t) {
  return {
    ID: r.user.id,
    name: r.user.name,
    email: r.user.email,
    country: r.user.country ? t(r.user.country) : "—",
    start_date: fmtDay(r.startedAt),
    end_date: fmtDay(r.approvedAt),
    attempts: row.retriesAllowed
      ? `${r.attempts.length}/${row.retriesAllowed}`
      : r.attempts.length,
    avg_score:
      r.avgCorrect === null ? "—" : `${oneDecimal(r.avgCorrect)}/${r.total}`,
    avg_percentage:
      r.avgPercent === null ? "—" : `${roundPercent(r.avgPercent)}%`,
    best_percentage: r.bestPercent === null ? "—" : floorPercent(r.bestPercent),
    avg_time: r.attempts.length
      ? timeLabel(r.avgSeconds, row.timeLimit, t)
      : "—",
    status: t(STATUS[r.status]),
    statusKey: r.status,
    test_name: row.test_name,
    course: row.internal_name,
    lang: row.lang,
    result: r,
  };
}

const dash = (v) =>
  v !== null && v !== undefined && v !== "" && v !== "—" ? (
    v
  ) : (
    <span className="text-[#C0C3CC]">—</span>
  );

// Perguntas de uma tentativa (resposta do aluno e se acertou)
function QuestionsTable({ attempt, onExport, t }) {
  const columns = getTestQuestionColumns(t).map((c) =>
    c.key === "result"
      ? {
          ...c,
          render: (v, rec) => <Tag color={rec.correct ? "green" : "red"}>{v}</Tag>,
        }
      : c,
  );
  const rows = attempt.items.map((q, i) => ({
    key: i,
    question: q.title,
    answer: Array.isArray(q.myAnswer)
      ? q.myAnswer.join(" | ")
      : (q.myAnswer ?? "—"),
    result: q.is_correct ? t("Correct") : t("Incorrect"),
    correct: !!q.is_correct,
    // Para o Excel: o aluno, a tentativa, o teste e o curso
    user_name: attempt.user_name,
    user_email: attempt.user_email,
    user_country: attempt.user_country,
    date: attempt.date,
    test_name: attempt.test_name,
    course: attempt.course,
    lang: attempt.lang,
  }));
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="font-bold font-ryker text-[13px] mb-0!">
          {t("Questions")}{" "}
          <span className="font-normal text-[#8A8D98]">({rows.length})</span>
        </p>
        <Button
          size="small"
          disabled={rows.length === 0}
          onClick={() =>
            onExport(rows, getTestQuestionColumns(t, true), "TestQuestionsReport")
          }
          icon={<LuDownload />}>
          {t("Export excel")}
        </Button>
      </div>
      <Table
        className="expanded_table"
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={
          rows.length > 5
            ? { pageSize: 5, placement: ["none", "bottomCenter"] }
            : false
        }
      />
    </div>
  );
}

// Tentativas de um aluno num teste (linha aberta na lista de alunos)
function AttemptsTable({ width, row, student, onExport, t }) {
  const rows = student.result.attempts.map((a) => ({
    key: a.key,
    attempt_number: a.number,
    date: dayjs(a.created_at).format("DD/MM/YYYY HH:mm"),
    score: `${a.correct}/${a.total}`,
    percentage: `${floorPercent(a.percent)}%`,
    time: timeLabel(a.seconds, row.timeLimit, t),
    status: t(a.passed ? "Approved" : "Failed"),
    passed: a.passed,
    items: a.items,
    // Para o Excel
    user_name: student.name,
    user_email: student.email,
    user_country: student.country,
    test_name: row.test_name,
    course: row.internal_name,
    lang: row.lang,
  }));
  const columns = getTestAttemptColumns(t).map((c) => {
    if (c.key === "status")
      return {
        ...c,
        render: (v, rec) => <Tag color={rec.passed ? "green" : "red"}>{v}</Tag>,
      };
    if (c.key === "time")
      return {
        ...c,
        render: (v) =>
          row.timeLimit ? v : <span className="text-[#8A8D98]">{v}</span>,
      };
    return c;
  });
  return (
    // A lista de alunos tem scroll horizontal: as tentativas ficam presas à largura visível (como o painel do teste)
    <div
      className="flex flex-col gap-3 p-3 md:p-4 bg-[#F7F8FA] rounded-[12px]"
      style={width ? { width: Math.max(width - 140, 280), position: "sticky", left: 0 } : undefined}>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="font-bold font-ryker text-[14px] mb-0!">
          {t("Attempts")}{" "}
          <span className="font-normal text-[#8A8D98]">({rows.length})</span>
        </p>
        <Button
          disabled={rows.length === 0}
          onClick={() =>
            onExport(rows, getTestAttemptColumns(t, true), "TestAttemptsReport")
          }
          icon={<LuDownload />}>
          {t("Export excel")}
        </Button>
      </div>
      <Table
        className="expanded_table"
        columns={columns}
        dataSource={rows}
        scroll={{ x: "max-content" }}
        expandable={{
          expandedRowRender: (rec) => (
            <QuestionsTable attempt={rec} onExport={onExport} t={t} />
          ),
          rowExpandable: (rec) => rec.items.length > 0,
        }}
        pagination={
          rows.length > 5
            ? { pageSize: 5, placement: ["none", "bottomCenter"] }
            : false
        }
      />
    </div>
  );
}

// Painel da linha expandida de um teste: resumo, gráficos e a lista de alunos (com separadores por estado e pesquisa)
function TestExpandedPanel({ width, row, onExport, t }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Primeiro quem já fez o teste (aprovados, reprovados, em progresso) e no fim quem ainda não começou; dentro de cada estado, por nome
  const students = useMemo(() => {
    const order = { approved: 0, failed: 1, in_progress: 2, not_started: 3 };
    return row.results
      .map((r) => studentRow(r, row, t))
      .sort((a, b) => order[a.statusKey] - order[b.statusKey] || (a.name || "").localeCompare(b.name || ""));
  }, [row, t]);

  const counts = useMemo(() => {
    const c = {
      all: students.length,
      not_started: 0,
      in_progress: 0,
      approved: 0,
      failed: 0,
    };
    students.forEach((s) => (c[s.statusKey] += 1));
    // Concluído: só quem foi aprovado (os reprovados ficam à parte, no separador e na barra "Reprovado")
    c.completed = c.approved;
    return c;
  }, [students]);

  const summary = useMemo(() => {
    const tried = row.results.filter((r) => r.attempts.length);
    const avgPercent = average(tried.map((r) => r.avgPercent));
    // Nº de perguntas: o do teste atual (as tentativas antigas podem ter outro nº); as respostas certas saem da percentagem média,
    // para o x/N bater sempre certo com a %
    const questions = parseJson(row.test?.question, []);
    const total = Array.isArray(questions) && questions.length ? questions.length : Math.max(0, ...tried.map((r) => r.total));
    const avgCorrect = avgPercent === null ? null : (avgPercent * total) / 100;
    const buckets = resultBuckets();
    // Melhor resultado de cada aluno que já tentou o teste
    tried.forEach(
      (r) =>
        (buckets.find((b) => floorPercent(r.bestPercent) <= b.max).value += 1),
    );
    return {
      avgResult: avgPercent === null ? "—" : `${roundPercent(avgPercent)}%`,
      avgScore:
        avgCorrect === null
          ? null
          : `${oneDecimal(avgCorrect)}/${total} ${t("correct answers")}`,
      buckets,
    };
  }, [row, t]);

  const distribution = [
    {
      value: counts.not_started,
      label: t("Not started"),
      color: PALETTE.lighter,
    },
    {
      value: counts.in_progress,
      label: t("In progress"),
      color: PALETTE.light,
    },
    { value: counts.completed, label: t("Approved"), color: PALETTE.base },
    { value: counts.failed, label: t("Failed"), color: PALETTE.darker },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (s) =>
      status === "all" ||
      (status === "completed" ? s.statusKey === "approved" : s.statusKey === status);
    return students.filter(
      (s) =>
        matches(s) && (!q || `${s.name} ${s.email}`.toLowerCase().includes(q)),
    );
  }, [students, search, status]);

  const columns = getTestStudentColumns(t).map((c) => {
    if (c.key === "name")
      return {
        ...c,
        width: 260,
        sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
        render: (_, s) => <UserCell id={s.ID} name={s.name} email={s.email} />,
      };
    if (c.key === "status")
      return {
        ...c,
        width: 130,
        render: (v, s) => (
          <Tag color={STATUS_COLORS[s.statusKey] || "default"}>{v}</Tag>
        ),
      };
    if (c.key === "avg_time")
      return {
        ...c,
        render: (v) =>
          row.timeLimit || v === "—" ? (
            dash(v)
          ) : (
            <span className="text-[#8A8D98]">{v}</span>
          ),
      };
    return { ...c, render: dash };
  });

  const tabs = [
    { key: "all", text: t("All"), count: counts.all },
    { key: "in_progress", text: t("In progress"), count: counts.in_progress },
    { key: "completed", text: t("Approved"), count: counts.completed },
    { key: "not_started", text: t("Not started"), count: counts.not_started },
    { key: "failed", text: t("Failed"), count: counts.failed },
  ];

  return (
    <div
      className="flex flex-col gap-5 p-4 md:p-5 bg-[#F7F8FA] rounded-[14px]"
      style={
        width
          ? { width: Math.max(width - 32, 320), position: "sticky", left: 0 }
          : undefined
      }>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label={t("Students")} value={counts.all} hint={row.country_note} />
        <Kpi label={t("In progress")} value={counts.in_progress} />
        {/* Concluído = aprovados; os reprovados têm cartão próprio */}
        <Kpi label={t("Approved")} value={counts.completed} />
        <Kpi label={t("Failed")} value={counts.failed} />
        <Kpi label={t("Not started")} value={counts.not_started} />
        <Kpi
          label={t("Average result (all attempts)")}
          value={summary.avgResult}
          hint={summary.avgScore}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
          <p className="font-bold font-ryker text-[14px] mb-4!">
            {t("Progress distribution")}
          </p>
          <StackedBar segments={distribution} />
        </div>
        <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
          <p className="font-bold font-ryker text-[14px] mb-1!">
            {t("Result percentage")}
          </p>
          <p className="text-[11px] text-[#8A8D98] mb-4!">
            {t("Best attempt of each student")}
          </p>
          <HorizontalBars rows={Object.values(summary.buckets)} />
        </div>
      </div>

      <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="font-bold font-ryker text-[14px] mb-0!">
            {t("Students")}{" "}
            <span className="font-normal text-[#8A8D98]">
              ({filtered.length}
              {filtered.length !== students.length
                ? ` ${t("of")} ${students.length}`
                : ""}
              )
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Mesma altura (40px) da pesquisa e do botão: o Segmented usa a altura de controlo global (32) */}
            <ConfigProvider
              theme={{
                components: {
                  Segmented: {
                    controlHeight: 40,
                    itemSelectedColor: "#163986",
                  },
                },
              }}>
              <Segmented
                value={status}
                onChange={setStatus}
                options={tabs.map((tab) => ({
                  label: (
                    <FilterLabel
                      text={tab.text}
                      count={tab.count}
                      active={status === tab.key}
                    />
                  ),
                  value: tab.key,
                }))}
              />
            </ConfigProvider>
            <Input
              allowClear
              placeholder={t("Search student...")}
              prefix={<IoSearch className="text-[#8A8D98]" />}
              className="w-56!"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
            />
            <Button
              onClick={() =>
                onExport(
                  filtered,
                  getTestStudentColumns(t, true),
                  "TestStudentsReport",
                )
              }
              disabled={filtered.length === 0}
              icon={<LuDownload />}>
              {t("Export excel")}
            </Button>
          </div>
        </div>
        <Table
          className="expanded_table"
          rowKey="ID"
          columns={columns}
          dataSource={filtered}
          expandable={{
            expandedRowRender: (s) => (
              <AttemptsTable width={width} row={row} student={s} onExport={onExport} t={t} />
            ),
            rowExpandable: (s) => s.result.attempts.length > 0,
          }}
          pagination={
            filtered.length > 10
              ? { pageSize: 10, placement: ["none", "bottomCenter"] }
              : false
          }
          scroll={{ x: "max-content" }}
          locale={{
            emptyText:
              students.length === 0
                ? t("No students yet")
                : t("No student matches the filters"),
          }}
        />
      </div>
    </div>
  );
}

export default function TestReport({ data, isLoading }) {
  const { selectedLanguage, languages } = useContext(Context);
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({});
  const [exportState, setExportState] = useState({
    open: false,
    data: [],
    columns: [],
    table: "TestReport",
  });

  // O painel expandido acompanha a largura visível da tabela (que tem scroll horizontal), como no relatório de cursos
  const tableWrapRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(null);
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) =>
      setPanelWidth(Math.floor(entry.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const countries = useMemo(
    () =>
      parseJson(
        languages?.find((l) => l.id === selectedLanguage?.id)?.country,
        [],
      ),
    [languages, selectedLanguage],
  );
  const courses = useMemo(
    () => (data?.courses || []).filter((c) => c.is_deleted !== 1),
    [data],
  );
  const rows = useMemo(
    () => buildRows(data, filters, languages, t),
    [data, filters, languages, t],
  );

  const openExport = (exportData, columns, table) =>
    setExportState({ open: true, data: exportData, columns, table });

  return (
    <div>
      <ExportTable
        open={exportState.open}
        close={() => setExportState((s) => ({ ...s, open: false }))}
        data={exportState.data}
        table={exportState.table}
        columns={exportState.columns}
      />
      <div className="flex justify-end items-center w-full">
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => setFilters(values)}
          className="w-full">
          <div className="flex flex-wrap justify-end items-center gap-4 mb-4 mt-4 [&_.ant-btn]:min-w-[150px]">
            <Button
              // Sem dados na tabela, o botão de exportar fica desativado
              disabled={rows.length === 0}
              onClick={() =>
                openExport(rows, getTestReportColumns(t, true), "TestReport")
              }
              icon={<LuDownload />}>
              <span className="hidden sm:inline">{t("Export excel")}</span>
            </Button>
            <Form.Item name="course" className="mb-0! w-full sm:w-auto">
              <Select
                allowClear
                className="w-full sm:w-[260px]!"
                placeholder={t("Select course")}
                showSearch={{ optionFilterProp: ["label"] }}
                // O nome do curso, como na coluna "Curso" da tabela
                options={courses.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </Form.Item>
            <Form.Item name="country" className="mb-0! w-full sm:w-auto">
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                className="w-full sm:w-[260px]!"
                placeholder={t("Select country")}
                showSearch={{ optionFilterProp: ["label"] }}
                options={countries.map((c) => ({ label: t(c), value: c }))}
              />
            </Form.Item>
            <Button onClick={form.submit} type="primary" icon={<IoSearch />}>
              {t("Search")}
            </Button>
          </div>
        </Form>
      </div>
      <div ref={tableWrapRef}>
        <Table
          rowKey="id"
          loading={isLoading}
          expandable={{
            expandedRowRender: (rec) => (
              <TestExpandedPanel
                key={rec.id}
                width={panelWidth}
                row={rec}
                onExport={openExport}
                t={t}
              />
            ),
          }}
          dataSource={rows}
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 5, // máximo 5 por página
            placement: ["none", "bottomCenter"], // paginação ao centro
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t("of")} ${total}`,
          }}
          columns={getTestReportColumns(t).map((col) =>
            col.key === "test_name"
              ? { ...col, render: (v) => <p className="mb-0!">{v}</p> }
              : col.key === "course_name"
                ? {
                    ...col,
                    // Miniatura do curso ao lado do nome, como no relatório de cursos (só na tabela: o Excel não muda)
                    render: (name, record) => (
                      <div className="flex items-center">
                        <Avatar
                          shape="square"
                          size={40}
                          style={{ backgroundColor: "#163986" }}
                          src={record.thumbnail ? `${config.server_ip}/media/${record.thumbnail}` : undefined}
                          icon={<CiCalendar className="text-white/60" />}
                          className="mr-2! min-w-[40px]!"
                        />
                        <p className="mb-0!">{name}</p>
                      </div>
                    ),
                  }
              : col.key === "approved" || col.key === "failed"
                ? { ...col, align: "center" }
                : col.key === "country"
                  ? {
                      ...col,
                      // Teste sem limite próprio num curso com limite de países: nota com os países do curso
                      render: (v, rec) =>
                        rec.country_note ? (
                          <Tooltip title={rec.country_note}>
                            <span className="inline-flex items-center gap-1 cursor-help" aria-label={rec.country_note}>
                              {v}
                              <LuInfo className="text-[#00b9d6] shrink-0" />
                            </span>
                          </Tooltip>
                        ) : (
                          v
                        ),
                    }
                  : col,
          )}
        />
      </div>
    </div>
  );
}
