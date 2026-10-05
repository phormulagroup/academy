import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import RowActions from "../../components/admin/rowActions";
import { Divider, Pagination, Progress, Select, Skeleton, Table, Tag } from "antd";
import { FaRegEdit } from "react-icons/fa";
import { useContext } from "react";
import { LuClipboardCheck, LuAward, LuGraduationCap, LuSettings, LuUsers } from "react-icons/lu";
import { AiOutlineClockCircle } from "react-icons/ai";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CheckCircle, CircleX } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { RxSwitch } from "react-icons/rx";
import Status from "../../components/admin/user/status";
import UserCell from "../../components/admin/userCell";
import { StackedBar, HorizontalBars, emptyProgressBuckets, progressBucketKey } from "../../components/admin/charts";

// Cores da marca Bial para os gráficos (do mais claro ao mais escuro), as mesmas dos relatórios
const PALETTE = { lighter: "#B8E9F1", light: "#66D4E6", base: "#00b9d6", darker: "#163986" };

// Número-resumo compacto que liga à página respetiva (mesmo estilo dos cartões-resumo dos Relatórios)
function StatTile({ to, icon, label, value, loading = false }) {
  return (
    <Link to={to}>
      <div className="flex flex-col items-center justify-center gap-1 bg-white shadow rounded-[16px] py-4 px-3 transition-shadow hover:shadow-md">
        <span className="text-[20px] text-[#163986]">{icon}</span>
        {loading ? <Skeleton.Input active size="small" style={{ width: 48, minWidth: 48, height: 24 }} /> : <p className="text-[18px] font-bold mb-0! whitespace-nowrap">{value ?? "—"}</p>}
        <p className="text-[12px] text-[#8A8D98] mb-0! text-center whitespace-nowrap">{label}</p>
      </div>
    </Link>
  );
}

// Cartão do dashboard (branco, com sombra), com título e uma ligação opcional
function Card({ title, subtitle, to, extra, className = "", children }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col p-6 w-full bg-white shadow rounded-[16px] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <p className="text-[16px] font-bold mb-0!">{title}</p>
          {subtitle && <p className="text-[12px] text-[#8A8D98] mb-0!">{subtitle}</p>}
        </div>
        {extra}
        {to && (
          <Link to={to} className="text-[#163986]! underline! text-[11px]">
            {t("Show all")} »
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Main() {
  const { user, selectedLanguage, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [data, setData] = useState({});
  // A carregar os dados do painel (mostra esqueletos); requestRef ignora respostas de um idioma que já mudou
  const [isLoading, setIsLoading] = useState(true);
  const requestRef = useRef(0);
  const [courseActivity, setCourseActivity] = useState([]);
  const [logsData, setLogsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [selectedUser, setSelectedUser] = useState({});
  const [bestStudentsData, setBestStudentsData] = useState([]);
  const [graphicCourses, setGraphicCourses] = useState({
    notStarted: { value: 0, label: "Not started", color: "#C7F1F8" },
    inProgress: { value: 0, label: "In progress", color: "#80DCEB" },
    completed: { value: 0, label: "Completed", color: "#00B9D6" },
  });
  const [graphicCoursesProgress, setGraphicCoursesProgress] = useState(() => emptyProgressBuckets(PALETTE));
  const [colors] = useState({
    create: "green",
    logout: "red",
    update: "blue",
    login: "green",
  });
  const [tables] = useState({ course_module: "course module" });
  const [isOpenStatus, setIsOpenStatus] = useState(false);
  // Curso escolhido no seletor: filtra os gráficos de progresso e a tabela de atividade
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [paginationByTable, setPaginationByTable] = useState({
    bestStudents: { currentPage: 1, pageSize: 5 },
    logs: { currentPage: 1, pageSize: 5 },
  });

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    const request = ++requestRef.current;
    setIsLoading(true);
    axios
      .get(endpoints.dashboard.read, {
        params: { id_lang: selectedLanguage.id },
      })
      .then((res) => {
        if (request !== requestRef.current) return;
        setSelectedCourse(null);
        setData(res.data);
        prepareData(res.data);
      })
      .catch((err) => {
        console.log(err);
        if (request === requestRef.current) toastApi.error(t("Could not load the dashboard, try again"));
      })
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false);
      });
  }

  function prepareData(obj) {
    let auxActivity = [];
    let auxBestStudents = [];
    let auxUsers = [];

    for (let i = 0; i < obj.activity.length; i++) {
      let percentageProgress = 0;
      let topics = obj.topics.filter(
        (t) => t.id_course === obj.activity[i].id_course,
      );
      let tests = obj.tests.filter(
        (t) => t.id_course === obj.activity[i].id_course,
      );

      // Progresso do aluno neste curso depois desta atividade: tópicos e testes distintos concluídos até esta data, sobre o total do curso
      const current = obj.activity[i];
      const done = new Set();
      obj.activity.forEach((a) => {
        if (a.id_user === current.id_user && a.id_course === current.id_course && a.is_completed === 1 && (a.activity_type === "topic" || a.activity_type === "test") && new Date(a.created_at) <= new Date(current.created_at)) {
          done.add(`${a.activity_type}-${a.id_course_topic ?? a.id_course_test}`);
        }
      });
      const totalItems = topics.length + tests.length;
      if (totalItems > 0) percentageProgress = Math.min(100, Math.round((done.size * 100) / totalItems));
      // Curso concluído: 100%
      if (current.activity_type === "course" && current.is_completed === 1) percentageProgress = 100;

      auxActivity.push({
        user: (() => {
          const u = obj.users.find((x) => x.id === obj.activity[i].id_user);
          return <UserCell id={u?.id} name={u?.name} email={u?.email} img={u?.img} />;
        })(),
        course: obj.courses.filter((c) => c.id === obj.activity[i].id_course)[0]
          .name,
        progress: (
          <div>
            <p className="text-[12px] font-bold">
              {
                obj.courses.filter((c) => c.id === obj.activity[i].id_course)[0]
                  .name
              }
            </p>
            <Progress percent={percentageProgress} size="small" strokeColor="#2F8351" />
            <p className="text-[12px] line-clamp-1">
              {obj.activity[i].activity_type === "test"
                ? obj.tests.filter(
                    (_t) => _t.id === obj.activity[i].id_course_test,
                  )[0].title
                : obj.activity[i].activity_type === "topic"
                  ? obj.topics.filter(
                      (_t) => _t.id === obj.activity[i].id_course_topic,
                    )[0].title
                  : obj.activity[i].activity_type === "module"
                    ? obj.modules.filter(
                        (_t) => _t.id === obj.activity[i].id_course_module,
                      )[0].title
                    : t(`${obj.activity[i].activity_type}`)}
            </p>
            {obj.activity[i].activity_type !== "enroll" &&
              obj.activity[i].activity_type !== "course" && (
                <p className="text-[10px]">
                  {t(`${obj.activity[i].activity_type}`)}
                </p>
              )}
          </div>
        ),
        status: obj.activity[i].is_completed ? (
          <CheckCircle className="text-green-500 w-5 h-5" />
        ) : (
          <CircleX className="text-red-500 w-5 h-5" />
        ),
        date: (
          <p className="text-[12px]">
            {dayjs(obj.activity[i].created_at).format("DD MMMM, YYYY HH:mm")}
          </p>
        ),
        fullData: {
          id_course: obj.activity[i].id_course,
          user_name: obj.users.filter(
            (u) => u.id === obj.activity[i].id_user,
          )[0].name,
          user_email: obj.users.filter(
            (u) => u.id === obj.activity[i].id_user,
          )[0].email,
          course: obj.courses.filter(
            (c) => c.id === obj.activity[i].id_course,
          )[0].name,
          is_completed: obj.activity[i].is_completed,
          date: obj.activity[i].created_at,
        },
      });

      /* BEST STUDENTS DATA */
      if (
        obj.activity[i].activity_type === "test" &&
        obj.activity[i].is_completed
      ) {
        let testData = obj.activity[i].meta_data
          ? JSON.parse(obj.activity[i].meta_data)
          : null;
        if (testData) {
          obj.activity[i].percentage =
            (testData.items.filter((r) => r.is_correct).length * 100) /
            testData.items.length;
          obj.activity[i].time = testData.time;
          auxBestStudents.push(obj.activity[i]);
        }
      }

      if (
        obj.activity[i].activity_type === "course" &&
        obj.activity[i].is_completed
      ) {
      }
    }

    // Melhores alunos: a melhor nota de cada pessoa (um aluno que fez vários testes só conta uma vez), da mais alta para a mais baixa
    const bestByUser = new Map();
    auxBestStudents.forEach((a) => {
      if (!bestByUser.has(a.id_user) || a.percentage > bestByUser.get(a.id_user).percentage) bestByUser.set(a.id_user, a);
    });
    auxBestStudents = [...bestByUser.values()].sort((a, b) => b.percentage - a.percentage);

    for (let u = 0; u < obj.users.length; u++) {
      auxUsers.push({
        name: (
          <Link
            to={`/admin/users/${obj.users[u].id}`}
            className="text-[#163986]! underline!">
            {obj.users[u].name}
          </Link>
        ),
        status:
          obj.users[u].status === "approved" ? (
            <Tag color={"green"} variant="outlined">
              {obj.users[u].status}
            </Tag>
          ) : obj.users[u].status === "pending" ? (
            <Tag color={"grey"} variant="outlined">
              {obj.users[u].status}
            </Tag>
          ) : (
            <Tag color={"red"} variant="outlined">
              {obj.users[u].status}
            </Tag>
          ),
        id: obj.users[u].id,
        date: dayjs(obj.users[u].created_at).format("DD/MM/YYYY"),
        hour: dayjs(obj.users[u].created_at).format("HH:mm"),
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
                  {
                    label: t("Change status"),
                    key: `${obj.users[u].id}-status`,
                    icon: <RxSwitch />,
                    onClick: () => openStatus(obj.users[u]),
                  },
                  {
                    label: t("Update"),
                    key: `${obj.users[u].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => navigate(`/admin/users/${obj.users[u].id}`),
                  },
                ]} />
          </div>
        ),
        fullData: obj.users[u],
      });
    }

    filterProgressCourses(null, obj.users, obj.activity, obj.courses);
    setCourseActivity(auxActivity);
    setBestStudentsData(auxBestStudents);
    setUsersData(auxUsers);
    setLogsData(obj.logs);
  }

  function changePage(tableKey, page, pageSize) {
    setPaginationByTable((prev) => ({
      ...prev,
      [tableKey]: {
        currentPage: page,
        pageSize: pageSize,
      },
    }));
  }

  function pageSizeChange(tableKey, current, pageSize) {
    setPaginationByTable((prev) => ({
      ...prev,
      [tableKey]: {
        currentPage: current,
        pageSize: pageSize,
      },
    }));
  }

  function calcActiveTests(obj) {
    let total = 0;
    if (obj) {
      for (let i = 0; i < obj.length; i++) {
        let today = dayjs();
        if (obj[i].settings) {
          if (obj[i].settings.start_date && obj[i].settings.end_date) {
            if (
              dayjs(obj[i].settings.start_date).diff(today) >= 0 &&
              today.diff(dayjs(obj[i].settings.end_date)) >= 0
            )
              ++total;
          } else if (obj[i].settings.start_date && !obj[i].settings.end_date) {
            if (dayjs(obj[i].settings.start_date).diff(today) >= 0) ++total;
          } else if (!obj[i].settings.start_date && obj[i].settings.end_date) {
            if (today.diff(dayjs(obj[i].settings.start_date)) >= 0) ++total;
          } else {
            ++total;
          }
        }
      }

      return total;
    }
  }

  // Distribuição e percentagem de progresso dos alunos, de todos os cursos ou só do curso escolhido (id_course)
  function filterProgressCourses(id_course, users, courseActivity, courses = []) {
    let auxGraphicCourses = {
      notStarted: { value: 0, label: "Not started", color: "#C7F1F8" },
      inProgress: { value: 0, label: "In progress", color: "#80DCEB" },
      completed: { value: 0, label: "Completed", color: "#00B9D6" },
    };

    // Escalões ≤ 25%, ≤ 50%, ≤ 75% e ≤ 100% (os mesmos dos relatórios): quem concluiu conta em ≤ 100% e quem não começou em ≤ 25%
    const auxGraphicCoursesProgress = emptyProgressBuckets(PALETTE);

    // Cursos em causa e se o curso está disponível para o aluno (limite de país)
    const scopedCourses = id_course ? courses.filter((c) => c.id === id_course) : courses;
    const isAvailableTo = (user) =>
      scopedCourses.some((c) => {
        if (!c.settings) return true;
        const settings = typeof c.settings === "string" ? JSON.parse(c.settings) : c.settings;
        return settings.country_limit ? !!settings.country?.includes(user.country) : true;
      });

    for (let u = 0; u < users.length; u++) {
      // Só a atividade do curso escolhido (ou de todos, sem curso escolhido)
      const findActivity = courseActivity.filter((_a) => _a.id_user === users[u].id && (!id_course || _a.id_course === id_course));

      if (findActivity.length > 0) {
        if (findActivity.filter((_f) => _f.activity_type === "course" && _f.is_completed === 1).length > 0) {
          auxGraphicCourses.completed.value += 1;
          auxGraphicCoursesProgress[progressBucketKey(100)].value += 1;
        } else {
          const totalSteps = findActivity.filter((_f) => _f.activity_type === "topic" || _f.activity_type === "test");
          const percentage = totalSteps.length > 0 ? (totalSteps.filter((_t) => _t.is_completed).length * 100) / totalSteps.length : 0;
          auxGraphicCoursesProgress[progressBucketKey(percentage)].value += 1;

          auxGraphicCourses.inProgress.value += 1;
        }
      } else if (isAvailableTo(users[u])) {
        auxGraphicCourses.notStarted.value += 1;
        auxGraphicCoursesProgress[progressBucketKey(0)].value += 1;
      }
    }

    setGraphicCourses(auxGraphicCourses);
    setGraphicCoursesProgress(auxGraphicCoursesProgress);
  }

  function openStatus(obj) {
    setSelectedUser(obj);
    setIsOpenStatus(true);
  }

  function closeSatus(u) {
    if (u) {
      getData();
    }
    setSelectedUser({});
    setIsOpenStatus(false);
  }

  // Conclusões = alunos que concluíram um curso (uma por par aluno+curso)
  const completions = useMemo(() => {
    const done = new Set();
    (data.activity || []).forEach((a) => {
      if (a.activity_type === "course" && a.is_completed === 1) done.add(`${a.id_user}-${a.id_course}`);
    });
    return done.size;
  }, [data]);

  const pageOf = (key, items) => {
    const { currentPage, pageSize } = paginationByTable[key] || { currentPage: 1, pageSize: 5 };
    return items.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize);
  };

  // Os rótulos dos estados vêm em inglês (chave de tradução): traduzem-se ao mostrar
  const progressSegments = Object.values(graphicCourses).map((seg) => ({ ...seg, label: t(seg.label) }));
  // Do escalão mais baixo ao mais alto
  const progressBuckets = Object.values(graphicCoursesProgress);

  const pagination = (key, total) => (
    <div className="flex justify-center items-center mt-4 w-full">
      <Pagination
        defaultPageSize={5}
        pageSizeOptions={[5, 10, 20]}
        simple
        align="center"
        onShowSizeChange={(page, pageSize) => pageSizeChange(key, page, pageSize)}
        className="w-full!"
        total={total}
        current={paginationByTable[key]?.currentPage}
        onChange={(page, pageSize) => changePage(key, page, pageSize)}
        pageSize={paginationByTable[key]?.pageSize}
      />
    </div>
  );

  return (
    <div className="p-2 flex flex-col gap-4">
      <Status data={selectedUser} open={isOpenStatus} close={closeSatus} />

      <p className="text-[18px] font-bold mb-0!">{t("Overview e-Learning")}</p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile to="/admin/users" icon={<LuUsers />} label={t("Total of students")} value={data.users?.length} loading={isLoading} />
        <StatTile to="/admin/courses" icon={<LuGraduationCap />} label={t("Total of courses")} value={data.courses?.length} loading={isLoading} />
        <StatTile to="/admin/reports" icon={<LuClipboardCheck />} label={t("Active tests")} value={data.tests ? calcActiveTests(data.tests) : undefined} loading={isLoading} />
        <StatTile to="/admin/reports" icon={<LuAward />} label={t("Completions")} value={data.activity ? completions : undefined} loading={isLoading} />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4">
        <p className="text-[18px] font-bold mb-0!">{t("Students progress")}</p>
        <Select
          className="w-full sm:w-[260px]!"
          placeholder={t("Choose a course")}
          value={selectedCourse ?? undefined}
          showSearch={{ optionFilterProp: "label" }}
          allowClear
          onChange={(e) => {
            setSelectedCourse(e ?? null);
            filterProgressCourses(e, data.users, data.activity, data.courses);
          }}
          options={data.courses?.map((item) => ({ label: item.name, value: item.id }))}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={t("Progress distribution")}>
          {isLoading ? <Skeleton active title={false} paragraph={{ rows: 3 }} /> : <StackedBar segments={progressSegments} />}
        </Card>
        <Card title={t("Progress Percentage")}>
          {isLoading ? <Skeleton active title={false} paragraph={{ rows: 5 }} /> : <HorizontalBars rows={progressBuckets} />}
        </Card>
      </div>

      <Card title={t("Activity")}>
        <Table
          loading={isLoading}
          dataSource={selectedCourse ? courseActivity.filter((row) => row.fullData.id_course === selectedCourse) : courseActivity}
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 5, // máximo 5 por página
            placement: ["none", "bottomCenter"], // paginação ao centro
            showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`,
          }}
          columns={[
            { title: t("User"), dataIndex: "user", key: "user", width: 240 },
            { title: t("Progress"), dataIndex: "progress", key: "progress", responsive: ["md"] },
            { title: t("Status"), dataIndex: "status", key: "status", width: "80px" },
            { title: t("Date"), dataIndex: "date", key: "date", width: "190px" },
          ]}
        />
      </Card>

      <p className="text-[18px] font-bold mt-4 mb-0!">{t("Platform status")}</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Registos de utilizadores */}
        <Card
          title={t("Registrations on the platform")}
          subtitle={t("The most recent submissions made through the registration form are listed here.")}
          to="/admin/users"
          className="xl:col-span-2">
          <Table
            loading={isLoading}
            dataSource={usersData}
            rowKey="id"
            scroll={{ x: "max-content" }}
            onRow={(row) => ({ className: "cursor-pointer", onClick: () => navigate(`/admin/users/${row.fullData.id}`) })}
            pagination={{
              pageSize: 5, // máximo 5 por página
              placement: ["none", "bottomCenter"], // paginação ao centro
              showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`,
            }}
            columns={[
              { title: t("ID"), dataIndex: "id", key: "id", width: "60px" },
              {
                title: t("User"),
                key: "user",
                width: "260px",
                render: (_, row) => <UserCell id={row.fullData.id} name={row.fullData.name} email={row.fullData.email} img={row.fullData.img} linkToProfile={false} />,
              },
              { title: t("Status"), dataIndex: "status", key: "status", width: "100px" },
              {
                title: t("Registered"),
                key: "registered_at",
                render: (_, row) => (
                  <div>
                    <p className="mb-0!">{row.date}</p>
                    <p className="text-[11px] text-[#8A8D98] mb-0!">{row.hour}</p>
                  </div>
                ),
              },
              // stopPropagation: a linha abre os detalhes ao clicar; o menu não deve abri-los também
              { title: "", key: "actions", width: "60px", render: (_, row) => <div onClick={(e) => e.stopPropagation()}>{row.actions}</div> },
            ]}
          />
        </Card>

        {/* Melhores alunos */}
        <Card title={t("Best students")} to="/admin/users">
          <div>
            {isLoading ? (
              <Skeleton active avatar title={false} paragraph={{ rows: 3 }} />
            ) : bestStudentsData.length === 0 ? (
              <div className="py-6 text-center text-[#8A8D98] text-[13px]">{t("No students yet")}</div>
            ) : (
              <div className="flex flex-col gap-4">
                {pageOf("bestStudents", bestStudentsData).map((u, idx) => (
                  <div key={`${u.id_user}-${idx}`} className="flex justify-between items-center gap-4">
                    <UserCell id={u.id_user} name={u.user_name} email={u.user_email} img={u.img} />
                    {u.percentage !== undefined && (
                      <Tag color="green" className="shrink-0 m-0!">
                        {Math.round(u.percentage)}%
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {!isLoading && bestStudentsData.length > 0 && pagination("bestStudents", bestStudentsData.length)}
        </Card>

        {/* Registos de acesso */}
        <Card title={t("Access logs")} subtitle={isLoading ? undefined : t("{{total}} accesses", { total: data.logsTotal ?? logsData.length })} to="/admin/users">
          <div>
            {isLoading ? (
              <Skeleton active avatar title={false} paragraph={{ rows: 3 }} />
            ) : logsData.length === 0 ? (
              <div className="py-6 text-center text-[#8A8D98] text-[13px] flex flex-col items-center gap-2">
                <AiOutlineClockCircle className="text-[40px] text-[#BFBFBF]" />
                {t("No access logs yet")}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {(() => {
                  // Agrupado por dia: o cabeçalho da data só aparece quando muda em relação ao registo anterior
                  // (já vêm ordenados do mais recente para o mais antigo)
                  let lastDay = null;
                  return pageOf("logs", logsData).map((l, idx) => {
                    const day = dayjs(l.created_at).format("DD MMM, YYYY");
                    const isNewDay = day !== lastDay;
                    lastDay = day;
                    return (
                      <div key={l.id ?? idx}>
                        {isNewDay && (
                          <>
                            <p className={`text-[12px] text-[#8A8D98] mb-2! uppercase ${idx === 0 ? "mt-0!" : "mt-2!"}`}>{day}</p>
                            <Divider className="my-2!" />
                          </>
                        )}
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex flex-col min-w-0">
                            <UserCell id={l.id_user} name={l.user_name} email={l.user_email} img={l.user_img} />
                          </div>
                          <div className="flex flex-col justify-center items-center shrink-0">
                            <Tag color={colors[l.action]} variant="outlined">
                              {l.action}
                            </Tag>
                            <p className="text-[11px] text-[#8A8D98] mb-0! mt-1! truncate">{dayjs(l.created_at).format("HH:mm")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
          {!isLoading && logsData.length > 0 && pagination("logs", logsData.length)}
        </Card>
      </div>
    </div>
  );
}
