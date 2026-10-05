import { useContext, useEffect, useMemo, useRef } from "react";
import { buildCourseStudentExport } from "../../../utils/courseExport";
import { useState } from "react";
import axios from "axios";
import { Avatar, Button, ConfigProvider, Form, Input, Segmented, Select, Skeleton, Table, Tag } from "antd";
import endpoints from "../../../utils/endpoints";
import { CiCalendar } from "react-icons/ci";
import config from "../../../utils/config";
import { IoSearch } from "react-icons/io5";

import { Context } from "../../../utils/context";

import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import ExportTable from "../../../components/admin/export/export";
import UserCell from "../../../components/admin/userCell";
import { StackedBar, HorizontalBars, emptyProgressBuckets, progressBucketKey } from "../../../components/admin/charts";
import { LuDownload } from "react-icons/lu";
import {
  getCourseReportColumns,
  getExpandedStudentColumns,
} from "../../../utils/columns";

// Cores da marca Bial para os gráficos (do mais claro ao mais escuro)
const PALETTE = { lighter: "#B8E9F1", light: "#66D4E6", base: "#00b9d6", darker: "#163986" };

function Kpi({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-[#ECEEF1] bg-white px-4 py-3">
      <span className="text-[12px] text-[#8A8D98]">{label}</span>
      <span className="text-[22px] font-bold leading-none">{value}</span>
      {hint && <span className="text-[11px] text-[#8A8D98]">{hint}</span>}
    </div>
  );
}

// Rótulo de um filtro com a contagem numa etiqueta (cor da marca quando ativo)
function FilterLabel({ text, count, active }) {
  return (
    <span className="inline-flex items-center gap-2 px-1">
      {text}
      <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none ${active ? "bg-[#163986] text-white" : "bg-[#ECEEF1] text-[#5B5F6B]"}`}>
        {count}
      </span>
    </span>
  );
}

// "2/5" -> percentagem de cumprimento, para a barra de progresso do aluno
const ratio = (value) => {
  const m = String(value ?? "").match(/^(\d+)\/(\d+)$/);
  return m && Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : null;
};

// Painel da linha expandida de um curso: resumo, gráficos e a lista de alunos (com pesquisa e filtro por estado).
// Só apresentação: as linhas vêm todas já calculadas de expandedRowRender.
function CourseExpandedPanel({ width, rows, columns, onExport, t }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const NOT_STARTED = t("Not started");
  const IN_PROGRESS = t("In progress");
  const APPROVED = t("Approved");
  const REPPROVED = t("Repproved");

  const counts = useMemo(() => {
    const c = { all: rows.length, [IN_PROGRESS]: 0, [APPROVED]: 0, [REPPROVED]: 0, [NOT_STARTED]: 0 };
    rows.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [rows, IN_PROGRESS, APPROVED, REPPROVED, NOT_STARTED]);

  // Progresso de cada aluno: média do que concluiu em módulos, tópicos e testes (só os que o curso tem)
  const withProgress = useMemo(
    () =>
      rows.map((r) => {
        const parts = [ratio(r.nr_modules), ratio(r.nr_topics), ratio(r.nr_tests)].filter((v) => v !== null);
        const progress = r.status === APPROVED ? 100 : parts.length ? Math.round((parts.reduce((s, v) => s + v, 0) / parts.length) * 100) : 0;
        return { ...r, progress };
      }),
    [rows, APPROVED],
  );
  const avgProgress = withProgress.length ? Math.round(withProgress.reduce((s, r) => s + r.progress, 0) / withProgress.length) : 0;

  const charts = useMemo(() => {
    const distribution = {
      notStarted: { value: counts[NOT_STARTED], label: NOT_STARTED, color: PALETTE.lighter },
      inProgress: { value: counts[IN_PROGRESS], label: IN_PROGRESS, color: PALETTE.light },
      completed: { value: counts[APPROVED], label: t("Completed"), color: PALETTE.base },
    };
    const buckets = emptyProgressBuckets(PALETTE);
    withProgress.forEach((r) => (buckets[progressBucketKey(r.progress)].value += 1));
    return { distribution, buckets };
  }, [counts, withProgress, NOT_STARTED, IN_PROGRESS, APPROVED, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withProgress.filter((r) => (status === "all" || r.status === status) && (!q || `${r.name} ${r.email}`.toLowerCase().includes(q)));
  }, [withProgress, search, status]);

  const dash = (v) => (v && v !== "—" ? v : <span className="text-[#C0C3CC]">—</span>);

  // Mesmas colunas do relatório (e do Excel), só com a apresentação do aluno e do estado melhorada
  const tableColumns = columns
    .filter((c) => c.key !== "ID" && c.key !== "email")
    .map((c) => {
      if (c.key === "name") return { ...c, width: 260, sorter: (a, b) => (a.name || "").localeCompare(b.name || ""), render: (_, row) => <UserCell id={row.ID} name={row.name} email={row.email} /> };
      if (c.key === "status") {
        const colors = { [APPROVED]: "green", [REPPROVED]: "red", [IN_PROGRESS]: "blue" };
        return { ...c, width: 130, render: (v) => <Tag color={colors[v] || "default"}>{v}</Tag> };
      }
      return { ...c, render: dash };
    });

  return (
    <div className="flex flex-col gap-5 p-4 md:p-5 bg-[#F7F8FA] rounded-[14px]" style={width ? { width: Math.max(width - 32, 320), position: "sticky", left: 0 } : undefined}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label={t("Students")} value={counts.all} />
        <Kpi label={IN_PROGRESS} value={counts[IN_PROGRESS]} />
        <Kpi label={t("Completed")} value={counts[APPROVED]} hint={counts[REPPROVED] ? `${counts[REPPROVED]} ${t("failed")}` : undefined} />
        <Kpi label={NOT_STARTED} value={counts[NOT_STARTED]} />
        <Kpi label={t("Average progress")} value={`${avgProgress}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
          <p className="font-bold text-[14px] mb-4!">{t("Progress distribution")}</p>
          <StackedBar segments={[charts.distribution.notStarted, charts.distribution.inProgress, charts.distribution.completed]} />
        </div>
        <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
          <p className="font-bold text-[14px] mb-4!">{t("Progress percentage")}</p>
          <HorizontalBars rows={Object.values(charts.buckets)} />
        </div>
      </div>

      <div className="rounded-[14px] border border-[#ECEEF1] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="font-bold text-[14px] mb-0!">
            {t("Students")}{" "}
            <span className="font-normal text-[#8A8D98]">
              ({filtered.length}
              {filtered.length !== rows.length ? ` ${t("of")} ${rows.length}` : ""})
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Mesma altura (40px) da pesquisa e do botão: o Segmented usa a altura de controlo global (32) */}
            <ConfigProvider theme={{ components: { Segmented: { controlHeight: 40, itemSelectedColor: "#163986" } } }}>
              <Segmented
                value={status}
                onChange={setStatus}
                options={[
                  { label: <FilterLabel text={t("All")} count={counts.all} active={status === "all"} />, value: "all" },
                  { label: <FilterLabel text={IN_PROGRESS} count={counts[IN_PROGRESS]} active={status === IN_PROGRESS} />, value: IN_PROGRESS },
                  { label: <FilterLabel text={t("Completed")} count={counts[APPROVED]} active={status === APPROVED} />, value: APPROVED },
                  { label: <FilterLabel text={NOT_STARTED} count={counts[NOT_STARTED]} active={status === NOT_STARTED} />, value: NOT_STARTED },
                  ...(counts[REPPROVED] ? [{ label: <FilterLabel text={t("Failed")} count={counts[REPPROVED]} active={status === REPPROVED} />, value: REPPROVED }] : []),
                ]}
              />
            </ConfigProvider>
            <Input allowClear placeholder={t("Search student...")} prefix={<IoSearch className="text-[#8A8D98]" />} className="w-56!" value={search} onChange={(ev) => setSearch(ev.target.value)} />
            <Button onClick={onExport} disabled={rows.length === 0} icon={<LuDownload />}>
              {t("Export excel")}
            </Button>
          </div>
        </div>
        <Table
          className="expanded_table"
          rowKey="ID"
          columns={tableColumns}
          dataSource={filtered}
          pagination={filtered.length > 10 ? { pageSize: 10, placement: ["none", "bottomCenter"] } : false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: rows.length === 0 ? t("No students in this course yet") : t("No student matches the filters") }}
        />
      </div>
    </div>
  );
}

// Linha aberta de um curso: carrega o detalhe e desenha o painel
function ExpandedCourse({ record, build }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get(endpoints.course.reportCourse, { params: { id: record.id } })
      .then((res) => active && setDetail(res.data))
      .catch((err) => {
        console.log(err);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [record.id]);

  if (failed) return <p className="py-6 text-center text-[#DB0709]">{t("Could not load the data")}</p>;
  if (!detail) return <Skeleton active paragraph={{ rows: 6 }} className="p-4" />;
  return build(record, detail);
}

export default function CourseReport({ data, isLoading }) {
  const { user, selectedLanguage, languages } = useContext(Context);
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dataToExport, setDataToExport] = useState([]);
  const [exportTable, setExportTable] = useState("CoursesReport"); // a escolha de colunas lembrada é por tipo de export
  const [columnsToExport, setColumnsToExport] = useState([]);
  const [courses, setCourses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isOpenExport, setIsOpenExport] = useState(false);

  // A tabela tem scroll horizontal: sem uma largura fixa, a linha expandida ficava tão larga como a tabela toda e
  // cortada à direita. O painel acompanha a largura visível do contentor da tabela.
  const tableWrapRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(null);
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setPanelWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      prepareData(data);
      setCourses(data.courses);
    }
  }, [data]);

  useEffect(() => {
    setCountries(
      JSON.parse(
        languages.filter((l) => l.id === selectedLanguage.id)[0].country,
      ),
    );
  }, [selectedLanguage]);

  // Função auxiliar para verificar se o aluno é aprovado
  const isStudentApproved = (
    studentActivity,
    course,
    modules,
    topics,
    tests,
  ) => {
    // Um aluno não pode ser aprovado se o curso não tiver módulos, tópicos ou testes
    if (modules.length === 0 || (topics.length === 0 && tests.length === 0)) {
      return false;
    }

    const completedModules = studentActivity.filter(
      (a) =>
        a.activity_type === "module" &&
        a.id_course === course.id &&
        a.is_completed === 1 &&
        a.is_deleted === 0,
    ).length;
    const completedTopics = studentActivity.filter(
      (a) =>
        a.activity_type === "topic" &&
        a.id_course === course.id &&
        a.is_completed === 1 &&
        a.is_deleted === 0,
    ).length;
    const completedTests = studentActivity.filter(
      (a) =>
        a.activity_type === "test" &&
        a.id_course === course.id &&
        a.is_completed === 1 &&
        a.is_deleted === 0,
    ).length;

    // Apenas verifica módulos, tópicos e testes se eles existirem no curso
    const needToCheckModules = modules.length > 0;
    const needToCheckTopics = topics.length > 0;
    const needToCheckTests = tests.length > 0;

    const allModulesCompleted =
      !needToCheckModules || completedModules === modules.length;
    const allTopicsCompleted =
      !needToCheckTopics || completedTopics === topics.length;
    const allTestsCompleted =
      !needToCheckTests || completedTests === tests.length;

    // Aprovado APENAS se completou todos os módulos, tópicos e testes que existem no curso
    return allModulesCompleted && allTopicsCompleted && allTestsCompleted;
  };

  // Função auxiliar para verificar se o aluno é reprovado
  const isStudentRepproved = (studentActivity, tests) => {
    // Cannot be repproved if course has no tests
    if (tests.length === 0) {
      return false;
    }

    for (let t = 0; t < tests.length; t++) {
      let testSettings = tests[t].settings
        ? JSON.parse(tests[t].settings)
        : tests[t].settings;
      // Apenas marca como reprovado se retries_allowed for um número válido
      if (
        testSettings &&
        testSettings.retries_allowed &&
        testSettings.retries_allowed > 0
      ) {
        const testPassed = studentActivity.some(
          (a) =>
            a.activity_type === "test" &&
            a.id_course_test === tests[t].id &&
            a.is_completed === 1 &&
            a.is_deleted === 0,
        );
        if (!testPassed) {
          const failedAttempts = studentActivity.filter(
            (a) =>
              a.activity_type === "test" &&
              a.id_course_test === tests[t].id &&
              a.is_completed === 0 &&
              a.is_deleted === 0,
          ).length;
          // Apenas reprovado se tiver tentativas falhadas e se o número de tentativas falhadas for maior ou igual ao permitido
          if (
            failedAttempts > 0 &&
            failedAttempts >= testSettings.retries_allowed
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  function prepareData(obj) {
    let aux = [];
    if (obj.users && obj.courses && obj.courses.length > 0) {
      for (let i = 0; i < obj.courses.length; i++) {
        let course = obj.courses[i];
        // Curso sem definições guardadas: tratado como sem limites (antes rebentava a página)
        course.settings =
          (course.settings && typeof course.settings === "string"
            ? JSON.parse(course.settings)
            : course.settings) || {};

        // Admins can see draft and published courses, but not deleted ones
        if (course.is_deleted === 1) continue;

        let modules = obj.modules.filter(
          (t) => t.id_course === course.id && t.is_deleted === 0,
        );
        let topics = obj.topics.filter(
          (t) => t.id_course === course.id && t.is_deleted === 0,
        );
        let tests = obj.tests.filter(
          (t) => t.id_course === course.id && t.is_deleted === 0,
        );

        // Filtra os estudantes com base no país ou idioma do curso, excluindo admins (id_role = 1), apenas estudantes aprovados
        let students = obj.users.filter(
          (u) =>
            u.id_role === 2 &&
            u.status?.toLowerCase() === "approved" &&
            (course.settings.country_limit
              ? course.settings.country.includes(u.country)
              : u.id_lang === course.id_lang),
        );

        // Conta os estudantes aprovados: aqueles que completaram ESTE curso (id_course === course.id)
        // Aprovado significa: curso concluído + todos os módulos concluídos + todos os tópicos concluídos + todos os testes concluídos
        let approvedUsers = new Set();
        for (let s = 0; s < students.length; s++) {
          let student = students[s];
          let studentActivity = obj.activity.filter(
            (a) => a.id_user === student.id && a.is_deleted === 0,
          );

          if (
            isStudentApproved(studentActivity, course, modules, topics, tests)
          ) {
            approvedUsers.add(student.id);
          }
        }
        let approved = approvedUsers.size;

        // Conta os estudantes reprovados: aqueles que falharam nos testes deste curso
        let repprovedUsers = new Set();
        for (let s = 0; s < students.length; s++) {
          let student = students[s];
          let studentActivity = obj.activity.filter(
            (a) => a.id_user === student.id && a.is_deleted === 0,
          );

          if (isStudentRepproved(studentActivity, tests)) {
            repprovedUsers.add(student.id);
          }
        }
        let repproved = repprovedUsers.size;

        aux.push({
          id: course.id,
          course_name: course.name,
          thumbnail: course.thumbnail, // só para mostrar na tabela; não faz parte das colunas do Excel
          start_date:
            course.settings.course_access_expiration &&
            course.settings.course_access_expiration_dates.start_date
              ? dayjs(
                  course.settings.course_access_expiration_dates.start_date,
                ).format("DD MMM, YYYY")
              : "—",
          end_date:
            course.settings.course_access_expiration &&
            course.settings.course_access_expiration_dates.end_date
              ? dayjs(
                  course.settings.course_access_expiration_dates.end_date,
                ).format("DD MMM, YYYY")
              : "—",
          nr_modules: modules.length,
          nr_topics: topics.length,
          nr_tests: tests.length,
          approved: approved,
          repproved: repproved,
          percentage:
            parseFloat(
              students.length > 0 ? (approved * 100) / students.length : 0,
            ).toFixed(2) + "%",
          students: students.length,
          country: course.settings.country_limit
            ? course.settings.country.map((c) => t(c)).join(", ")
            : t("All"),
          lang: languages
            .filter((l) => l.id === course.id_lang)[0]
            .code.toUpperCase(), // Para surgir a informação do idioma no Excel
        });
      }
    }
    setTableData(aux);
    setFilteredData(aux);
  }

  function filterData(values) {
    let newData = Object.assign([], courses);

    if (values.course) newData = newData.filter((n) => n.id === values.course);
    if (values.country && values.country.length > 0) {
      newData = newData.filter((n) => {
        // Se country_limit é true, apenas incluir se o país corresponder
        if (n.settings?.country_limit) {
          return (
            n.settings?.country &&
            Array.isArray(n.settings.country) &&
            n.settings.country.some((item) => values.country.includes(item))
          );
        }
        // Se country_limit é false (All), não incluir quando filtrar por país específico
        return false;
      });
    }

    prepareData({ ...data, courses: newData });
  }

  function onChange(pagination, filters, sorter, extra) {
    setFilteredData(extra.currentDataSource);
  }

  function openExport(data, columns = [], table = "CoursesReport") {
    setExportTable(table);
    setDataToExport(data);
    setColumnsToExport(columns);
    setIsOpenExport(true);
  }

  function closeExport() {
    setIsOpenExport(false);
  }

  // Monta o painel de um curso a partir do detalhe desse curso (pedido à API quando a linha se abre)
  const buildExpanded = (e, data) => {
    const columnsExpanded = getExpandedStudentColumns(t);

    let course = data.courses?.filter((c) => c.id === e.id)[0];
    if (!course) return null;

    // Skip deleted courses
    if (course.is_deleted === 1) return null;

    // Filtra apenas os estudantes aprovados pelo administrador, excluindo administradores (id_role = 1)
    let students =
      data.users?.filter(
        (u) =>
          u.id_role === 2 &&
          u.status?.toLowerCase() === "approved" &&
          (course.settings?.country_limit
            ? course.settings?.country.includes(u.country)
            : u.id_lang === course.id_lang),
      ) || [];
    let activity = data.activity?.filter((a) => a.id_course === e.id) || [];

    const dataExpanded = [];

    for (let i = 0; i < students.length; i++) {
      let student = students[i];
      let studentActivity = activity.filter(
        (a) => a.id_user === student.id && a.is_deleted === 0,
      );

      // Filtra apenas atividades relevantes (enroll, module, topic, test) - course activity sozinha não conta
      const relevantActivity = studentActivity.filter(
        (a) =>
          ["enroll", "module", "topic", "test"].includes(a.activity_type) &&
          a.is_deleted === 0,
      );

      if (relevantActivity.length === 0 && studentActivity.length === 0) {
        // Se o estudante não tiver nenhuma atividade relevante e nenhuma atividade de curso, considera-se que ele não começou o curso
        dataExpanded.push({
          ID: student.id,
          name: student.name,
          email: student.email,
          country: student.country,
          start_date: "—",
          end_date: "—",
          nr_modules: "—",
          nr_topics: "—",
          nr_tests: "—",
          status: t("Not started"),
          lang: languages
            .filter((l) => l.id === course.id_lang)[0]
            .code.toUpperCase(), // Para surgir a informação do idioma no Excel
          course: course.name, // Para surgir a informação do curso no Excel
        });
      } else {
        // Verificar status de inscrição
        const isEnrolled = studentActivity.some(
          (a) =>
            a.activity_type === "enroll" &&
            a.is_completed === 1 &&
            a.is_deleted === 0,
        );

        // Obter data de início - preferir registro de inscrição explícito, recorrer à atividade mais antiga
        let startDate = studentActivity.filter(
          (a) => a.activity_type === "enroll" && a.is_deleted === 0,
        )[0]?.created_at;
        if (!startDate) {
          // Fallback: usar a data de atividade mais antiga se não houver início de inscrição (enroll)
          startDate = studentActivity
            .filter(
              (a) =>
                ["topic", "module", "test"].includes(a.activity_type) &&
                a.is_deleted === 0,
            )
            .sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at),
            )[0]?.created_at;
        }
        if (!startDate) {
          // Second fallback: usar qualquer atividade mais antiga se ainda não houver data
          startDate = studentActivity
            .filter((a) => a.is_deleted === 0)
            .sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at),
            )[0]?.created_at;
        }

        let endDate = null; // Será definido apenas se o aluno for aprovado

        // Obter todos os testes para este curso (excluindo deletados)
        let tests = data.tests.filter(
          (t) => t.id_course === course.id && t.is_deleted === 0,
        );

        // Verificar se aprovado: deve concluir curso + todos os módulos + todos os tópicos + todos os testes
        const tempCourse = { id: course.id };
        const tempModules = Array(e.nr_modules).fill({});
        const tempTopics = Array(e.nr_topics).fill({});
        const tempTests = Array(e.nr_tests).fill({});

        let approved = isStudentApproved(
          studentActivity,
          tempCourse,
          tempModules,
          tempTopics,
          tempTests,
        );

        // Obter contagens de conclusão para exibição
        const completedModules = studentActivity.filter(
          (a) =>
            a.activity_type === "module" &&
            a.id_course === course.id &&
            a.is_completed === 1 &&
            a.is_deleted === 0,
        ).length;
        const completedTopics = studentActivity.filter(
          (a) =>
            a.activity_type === "topic" &&
            a.id_course === course.id &&
            a.is_completed === 1 &&
            a.is_deleted === 0,
        ).length;
        const completedTests = studentActivity.filter(
          (a) =>
            a.activity_type === "test" &&
            a.id_course === course.id &&
            a.is_completed === 1 &&
            a.is_deleted === 0,
        ).length;

        // Apenas verifica módulos, tópicos e testes se eles existirem no curso
        const displayModules =
          e.nr_modules > 0 ? `${completedModules}/${e.nr_modules}` : "—";
        const displayTopics =
          e.nr_topics > 0 ? `${completedTopics}/${e.nr_topics}` : "—";
        const displayTests =
          e.nr_tests > 0
            ? `${studentActivity.filter((a) => a.activity_type === "test" && a.is_completed === 1 && a.is_deleted === 0).length}/${e.nr_tests}`
            : "—";

        // Defina endDate apenas se o aluno for aprovado (concluiu tudo)
        if (approved) {
          endDate = studentActivity.filter(
            (a) =>
              a.activity_type === "course" &&
              a.is_completed === 1 &&
              a.is_deleted === 0,
          )[0]?.created_at;
        }

        // Verifica se o estudante foi reprovado (independente do status de enrolled)
        let repproved = isStudentRepproved(studentActivity, tests);

        // Verificar se o aluno tem qualquer atividade relevante no curso (enroll, module, topic, test, course)
        const hasAnyRelevantActivity = studentActivity.some(
          (a) =>
            ["enroll", "module", "topic", "test", "course"].includes(
              a.activity_type,
            ) && a.is_deleted === 0,
        );

        // Determina o status do estudante com base nas condições: Repproved > Approved > In Progress > Not Started
        // Prioridade: Repproved > Approved > In Progress > Not Started
        // "In progress" requer qualquer atividade relevante na course (enroll, module, topic, test, course)
        let status;
        if (repproved) {
          status = t("Repproved");
        } else if (approved) {
          status = t("Approved");
        } else if (
          isEnrolled ||
          completedModules > 0 ||
          completedTopics > 0 ||
          completedTests > 0 ||
          hasAnyRelevantActivity
        ) {
          // Se o estudante está inscrito, completou atividades, ou tem qualquer atividade relevante, considera-se "In progress"
          status = t("In progress");
        } else {
          status = t("Not started");
        }

        dataExpanded.push({
          ID: student.id,
          name: student.name,
          email: student.email,
          country: student.country,
          start_date: startDate ? dayjs(startDate).format("DD MMM, YYYY") : "—",
          end_date: repproved
            ? "—" // Indica que o estudante foi reprovado, então não há data de conclusão
            : endDate
              ? dayjs(endDate).format("DD MMM, YYYY")
              : "—",
          nr_modules: displayModules,
          nr_topics: displayTopics,
          nr_tests: displayTests,
          status: status,
          lang: languages
            .filter((l) => l.id === course.id_lang)[0]
            .code.toUpperCase(), // Para surgir a informação do idioma no Excel
          course: course.name, // Para surgir a informação do curso no Excel
        });
      }
    }

    return <CourseExpandedPanel width={panelWidth} rows={dataExpanded} columns={columnsExpanded} onExport={() => {
      // Export detalhado do curso: estatísticas de cada aluno, dos testes e das respostas às perguntas
      const detailed = buildCourseStudentExport({ course, base: dataExpanded, data, languages, t });
      openExport(detailed.rows, detailed.columns, "CourseStudentsReport");
    }} t={t} />;
  };

  // Ao abrir uma linha pede-se à API só o detalhe desse curso (alunos, atividade, testes), em vez de trazer tudo no início
  const expandedRowRender = (e) => <ExpandedCourse key={e.id} record={e} build={buildExpanded} />;

  return (
    <div>
      <ExportTable open={isOpenExport} close={closeExport} data={dataToExport} table={exportTable} columns={columnsToExport} />
      <div className="flex justify-end items-center w-full">
        <Form form={form} layout="vertical" onFinish={filterData} className="w-full">
          <div className="flex flex-wrap justify-end items-center gap-4 mb-4 mt-4 [&_.ant-btn]:min-w-[150px]">
            <Button
              // Sem dados na tabela, o botão de exportar fica desativado
              disabled={tableData.length === 0}
              onClick={() => openExport(filteredData.length > 0 ? filteredData : tableData, getCourseReportColumns(t, false))}
              icon={<LuDownload />}>
              <span className="hidden sm:inline">{t("Export excel")}</span>
            </Button>
            <Form.Item name="course" className="mb-0! w-full sm:w-auto">
              <Select
                allowClear
                className="w-full sm:w-[260px]!"
                placeholder={t("Select course")}
                showSearch={{ optionFilterProp: ["label"] }}
                options={courses.map((c) => ({ label: c.name, value: c.id }))}
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
          onChange={onChange}
          loading={isLoading}
          expandable={{ expandedRowRender }}
          rowKey="id"
          dataSource={tableData}
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 5, // máximo 5 por página
            placement: ["none", "bottomCenter"], // paginação ao centro
            showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`,
          }}
          columns={getCourseReportColumns(t).map((col) =>
            col.key === "course_name"
              ? {
                  ...col,
                  // Miniatura do curso ao lado do nome (só na tabela: as colunas do Excel não mudam)
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
              : col,
          )}
        />
      </div>
    </div>
  );
}
