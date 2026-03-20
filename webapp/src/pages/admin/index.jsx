import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Collapse, Divider, Empty, Pagination, Progress, Select, Table, Tag } from "antd";
import { FaCross, FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import StudentsIcon from "../../assets/Backoffice/Total-Alunos.svg?react";
import CoursesIcon from "../../assets/Backoffice/Cursos.svg?react";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import UserIcon from "../../assets/Backoffice/User-small.svg?react";
import EmailIcon from "../../assets/Backoffice/Email-small.svg?react";
import { CheckCircle, CircleX } from "lucide-react";

import { Link } from "react-router-dom";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Main() {
  const { user, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [data, setData] = useState({});
  const [courseActivity, setCourseActivity] = useState([]);
  const [logsData, setLogsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [bestStudentsData, setBestStudentsData] = useState([]);
  const [graphicCourses, setGraphicCourses] = useState({
    notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
    inProgress: { value: 0, label: t("In progress"), color: "#80DCEB" },
    completed: { value: 0, label: t("Completed"), color: "#00B9D6" },
  });
  const [graphicCoursesProgress, setGraphicCoursesProgress] = useState({
    "< 100%": { value: 0, label: "< 100%", color: "#0397AE" },
    "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
    "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
    "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
    "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
  });
  const [colors] = useState({ create: "green", logout: "red", update: "blue", login: "green" });
  const [tables] = useState({ course_module: "course module" });

  const [paginationByTable, setPaginationByTable] = useState({ bestStudents: { currentPage: 1, pageSize: 5 }, logs: { currentPage: 1, pageSize: 5 } });

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    axios
      .get(endpoints.dashboard.read, {
        params: { id_lang: selectedLanguage.id },
      })
      .then((res) => {
        setData(res.data);
        prepareData(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function prepareData(obj) {
    let auxActivity = [];
    let auxBestStudents = [];
    let auxUsers = [];

    for (let i = 0; i < obj.activity.length; i++) {
      let percentageProgress = 0;
      let topics = obj.topics.filter((t) => t.id_course === obj.activity[i].id_course);
      let modules = obj.topics.filter((t) => t.id_module === obj.activity[i].id_module);
      let tests = obj.tests.filter((t) => t.id_course === obj.activity[i].id_course);
      let progressCompleted = obj.activity.filter(
        (a) =>
          obj.activity[i].activity_type !== "enroll" &&
          obj.activity[i].activity_type !== "course" &&
          a.id_user === obj.activity[i].id_user &&
          obj.activity[i].id_course === a.id_course,
      );
      if (obj.activity[i].activity_type !== "enroll" && obj.activity[i].is_completed === 1) {
        percentageProgress = calcCourseProgress(
          progressCompleted.slice(i, progressCompleted.length).length,
          topics.length + tests.length + modules.length,
          obj.activity[i].is_completed,
        );
      }

      auxActivity.push({
        user: (
          <div className="flex flex-col">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 mr-1" />
              <p className="text-[12px]">{obj.users.filter((u) => u.id === obj.activity[i].id_user)[0].name}</p>
            </div>
            <div className="flex items-center mt-1">
              <EmailIcon className="w-5 h-5 mr-1" />
              <p className="text-[11px]">{obj.users.filter((u) => u.id === obj.activity[i].id_user)[0].email}</p>
            </div>
          </div>
        ),
        progress: (
          <div>
            <p className="text-[12px] font-bold">{obj.courses.filter((c) => c.id === obj.activity[i].id_course)[0].name}</p>
            {obj.activity[i].activity_type !== "enroll" && obj.activity[i].activity_type !== "course" && obj.activity[i].is_completed === 1 && (
              <Progress percent={percentageProgress} size="small" showInfo={percentageProgress === 100 ? false : true} />
            )}
            <p className="text-[12px] line-clamp-1">
              {obj.activity[i].activity_type === "test"
                ? obj.tests.filter((_t) => _t.id === obj.activity[i].id_course_test)[0].title
                : obj.activity[i].activity_type === "topic"
                  ? obj.topics.filter((_t) => _t.id === obj.activity[i].id_course_topic)[0].title
                  : obj.activity[i].activity_type === "module"
                    ? obj.modules.filter((_t) => _t.id === obj.activity[i].id_course_module)[0].title
                    : t(`${obj.activity[i].activity_type}`)}
            </p>
            {obj.activity[i].activity_type !== "enroll" && obj.activity[i].activity_type !== "course" && <p className="text-[10px]">{t(`${obj.activity[i].activity_type}`)}</p>}
          </div>
        ),
        status: obj.activity[i].is_completed ? <CheckCircle className="text-green-500 w-5 h-5" /> : <CircleX className="text-red-500 w-5 h-5" />,
        date: <p className="text-[12px]">{dayjs(obj.activity[i].created_at).format("DD MMMM, YYYY HH:mm")}</p>,
        fullData: {
          user_name: obj.users.filter((u) => u.id === obj.activity[i].id_user)[0].name,
          user_email: obj.users.filter((u) => u.id === obj.activity[i].id_user)[0].email,
          course: obj.courses.filter((c) => c.id === obj.activity[i].id_course)[0].name,
          is_completed: obj.activity[i].is_completed,
          date: obj.activity[i].created_at,
        },
      });

      /* BEST STUDENTS DATA */
      if (obj.activity[i].activity_type === "test" && obj.activity[i].is_completed) {
        let testData = obj.activity[i].meta_data ? JSON.parse(obj.activity[i].meta_data) : null;
        if (testData) {
          obj.activity[i].percentage = (testData.items.filter((r) => r.is_correct).length * 100) / testData.items.length;
          obj.activity[i].time = testData.time;
          auxBestStudents.push(obj.activity[i]);
        }
      }

      if (obj.activity[i].activity_type === "course" && obj.activity[i].is_completed) {
      }
    }

    auxBestStudents.sort((a, b) => (a < b ? -1 : 1));

    for (let l = 0; l < obj.logs.length; l++) {
      obj.logs[l].meta_data = obj.logs[l].meta_data ? JSON.parse(obj.logs[l].meta_data) : null;
    }

    for (let u = 0; u < obj.users.length; u++) {
      auxUsers.push({
        name: (
          <Link to={`/admin/users/${obj.users[u].id}`} className="text-[#252525]! underline!">
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
        fullData: obj.users[u],
      });
    }

    filterProgressCourses(null, obj.users, obj.activity);
    setCourseActivity(auxActivity);
    setBestStudentsData(auxBestStudents);
    setUsersData(auxUsers);
    setLogsData(obj.logs);
  }

  function calcCourseProgress(a, b, is_completed) {
    if (a > 0) {
      let progressPercentage = (100 * (is_completed ? a : a - 1)) / b;
      const isInteger = progressPercentage % 1 === 0;
      return !isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage;
    } else {
      return 0;
    }
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
    return 0;
  }

  function filterProgressCourses(id_course, users, courseActivity) {
    let auxGraphicCourses = {
      notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
      inProgress: { value: 0, label: t("In progress"), color: "#80DCEB" },
      completed: { value: 0, label: t("Completed"), color: "#00B9D6" },
    };

    let auxGraphicCoursesProgress = {
      "< 100%": { value: 0, label: "< 100%", color: "#0397AE" },
      "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
      "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
      "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
      "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
    };

    for (let u = 0; u < users.length; u++) {
      let findActivity = courseActivity.filter((_a) => _a.id_user === users[u].id);
      if (findActivity.length > 0) {
        if (id_course) findActivity.filter((_a) => _a.id_course === id_course);
        if (findActivity.filter((_f) => _f.activity_type === "course" && _f.is_completed === 1).length > 0) {
          auxGraphicCourses.completed.value += 1;
        } else {
          let totalSteps = findActivity.filter((_f) => _f.activity_type === "topic" || _f.activity_type === "test");
          let percentage = (totalSteps.filter((_t) => _t.is_completed).length * 100) / totalSteps.length;
          if (totalSteps > 0) {
            if (percentage >= 0) {
              if (percentage < 20) auxGraphicCoursesProgress["< 20%"].value += 1;
              else if (percentage < 40) auxGraphicCoursesProgress["< 40%"].value += 1;
              else if (percentage < 60) auxGraphicCoursesProgress["< 60%"].value += 1;
              else if (percentage < 80) auxGraphicCoursesProgress["< 80%"].value += 1;
              else if (percentage < 100) auxGraphicCoursesProgress["< 100%"].value += 1;
            }
          } else {
            auxGraphicCoursesProgress["< 20%"].value += 1;
          }

          auxGraphicCourses.inProgress.value += 1;
        }
      } else {
        auxGraphicCourses.notStarted.value += 1;
        auxGraphicCoursesProgress["< 20%"].value += 1;
      }
    }
    console.log("auxGraphicCourses:", auxGraphicCourses);
    console.log("auxGraphicCoursesProgress:", auxGraphicCoursesProgress);
    setGraphicCourses(auxGraphicCourses);
    setGraphicCoursesProgress(auxGraphicCoursesProgress);
  }

  return (
    <div className="p-2">
      <p className="text-[18px] font-bold mb-4">Overview e-Learning</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center bg-[#FFF]">
            <div className="grid grid-cols-3 w-full">
              <div className="flex flex-col justify-center items-center border-l border-t border-b border-r border-[#C0C0C0] p-6 bg-[#EAEAEA] rounded-l-[5px]">
                <StudentsIcon className="w-17.5 h-17.5" />
                <p className="mt-4">{t("Total of students")}</p>
                <p className="mt-1 font-bold text-[30px]">{data.users?.length}</p>
              </div>
              <div className="flex flex-col justify-center items-center border-t border-b border-r border-[#C0C0C0] p-6">
                <CoursesIcon className="w-17.5 h-17.5" />
                <p className="mt-4">{t("Total of courses")}</p>
                <p className="mt-1 font-bold text-[30px] ">{data.courses?.length}</p>
              </div>
              <div className="flex flex-col justify-center items-center border-t border-b border-r border-[#C0C0C0] p-6 rounded-r-[5px]">
                <CoursesIcon className="w-17.5 h-17.5" />
                <p className="mt-4">{t("Active tests")}</p>
                <p className="mt-1 font-bold text-[30px] ">{calcActiveTests(data.tests)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col bg-[#FFF] p-6 border border-[#C0C0C0] rounded-[5px] mt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <p className="font-bold mr-2">{"Course progress"}</p>
                <Select
                  className="min-w-[200px]"
                  placeholder={t("Choose a course")}
                  showSearch={{ optionFilterProp: "label" }}
                  allowClear
                  onChange={(e) => filterProgressCourses(e, data.users, data.activity)}
                  options={data.courses?.map((item) => ({ label: item.name, value: item.id }))}
                />
              </div>
              <div>
                <Link to="/admin/users" className="text-[#010202]! underline! text-[10px]">
                  {t("Show all")} »
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10 w-full">
              <div className="flex flex-col">
                <p className="font-bold mb-4">Distribuição de progresso</p>
                <div className="flex justify-between items-center gap-4 w-full!">
                  <div className="w-1/2">
                    <Doughnut
                      className="w-full! h-full!"
                      data={{
                        labels: [graphicCourses.notStarted?.label, graphicCourses.inProgress?.label, graphicCourses.completed?.label],
                        datasets: [
                          {
                            data: [graphicCourses.notStarted.value, graphicCourses.inProgress.value, graphicCourses.completed.value],
                            backgroundColor: [graphicCourses.notStarted.color, graphicCourses.inProgress.color, graphicCourses.completed.color],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                    />
                  </div>
                  <div>
                    {Object.keys(graphicCourses).map((_k) => (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`mr-2 min-w-[12px] w-[12px] min-h-[12px] h-[12px] rounded-full`} style={{ backgroundColor: graphicCourses[_k].color }}></div>
                          <p className="text-[11px]">{graphicCourses[_k].label}</p>
                        </div>
                        <div className="min-w-[40px] flex justify-center items-center">
                          <p className="text-[11px]">{graphicCourses[_k].value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <p className="font-bold mb-4">Percentagem de Progresso</p>
                <div className="flex justify-between items-center gap-4 w-full!">
                  <div className="w-1/2">
                    <Doughnut
                      className="w-full! h-full!"
                      data={{
                        labels: [
                          graphicCoursesProgress["< 100%"].label,
                          graphicCoursesProgress["< 80%"].label,
                          graphicCoursesProgress["< 60%"].label,
                          graphicCoursesProgress["< 40%"].label,
                          graphicCoursesProgress["< 20%"].label,
                        ],
                        datasets: [
                          {
                            data: [
                              graphicCoursesProgress["< 100%"].value,
                              graphicCoursesProgress["< 80%"].value,
                              graphicCoursesProgress["< 60%"].value,
                              graphicCoursesProgress["< 40%"].value,
                              graphicCoursesProgress["< 20%"].value,
                            ],
                            backgroundColor: [
                              graphicCoursesProgress["< 100%"].color,
                              graphicCoursesProgress["< 80%"].color,
                              graphicCoursesProgress["< 60%"].color,
                              graphicCoursesProgress["< 40%"].color,
                              graphicCoursesProgress["< 20%"].color,
                            ],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                    />
                  </div>
                  <div>
                    {Object.keys(graphicCoursesProgress).map((_k) => (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`mr-2 min-w-[12px] w-[12px] min-h-[12px] h-[12px] rounded-full`} style={{ backgroundColor: graphicCoursesProgress[_k].color }}></div>
                          <p className="text-[11px]">{graphicCoursesProgress[_k].label}</p>
                        </div>
                        <div className="min-w-[40px] flex justify-center items-center">
                          <p className="text-[11px]">{graphicCoursesProgress[_k].value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col p-6 w-full bg-white border border-[#C0C0C0] rounded-[5px]">
          <p className="font-bold text-[16px] mb-4">{t("Activity")}</p>
          <Table
            dataSource={courseActivity}
            pagination={{
              pageSize: 5, // máximo 5 por página
              placement: ["bottomCenter"], // paginação ao centro
            }}
            columns={[
              {
                title: t("User"),
                dataIndex: "user",
                key: "user",
                width: "300px",
              },
              {
                title: "Progress",
                dataIndex: "progress",
                key: "progress",
              },
              {
                title: "Satus",
                dataIndex: "status",
                key: "status",
                width: "80px",
              },
              {
                title: "Date",
                dataIndex: "date",
                key: "date",
                width: "170px",
              },
            ]}
          />
        </div>
      </div>
      <div className="flex flex-col mt-4">
        <p className="text-lg font-bold mb-4">{t("Platform status")}</p>
        <div className="grid grid-cols-4 gap-4">
          {/* USERS TABLE */}
          <div className="flex flex-col p-6 w-full bg-white border border-[#C0C0C0] rounded-[5px] col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold">{t("Registrations on the platform")}</p>
                <p className="mb-4 mt-1">{t("The most recent submissions made through the registration form are listed here.")}</p>
              </div>
              <div>
                <Link to="/admin/users" className="text-[#010202]! underline! text-[10px]">
                  {t("Show all")} »
                </Link>
              </div>
            </div>
            <Table
              dataSource={usersData}
              pagination={{
                pageSize: 5, // máximo 5 por página
                position: ["bottomCenter"], // paginação ao centro
              }}
              columns={[
                {
                  title: t("User"),
                  dataIndex: "name",
                  key: "name",
                  width: "200px",
                },
                {
                  title: t("Nr. Rep."),
                  dataIndex: "id",
                  key: "id",
                  width: "120px",
                },
                {
                  title: "Satus",
                  dataIndex: "status",
                  key: "status",
                  width: "80px",
                },
                {
                  title: t("Day"),
                  dataIndex: "date",
                  key: "date",
                },
                {
                  title: t("Hour"),
                  dataIndex: "hour",
                  key: "hour",
                },
                {
                  title: "",
                  dataIndex: "actions",
                  key: "actions",
                },
              ]}
            />
          </div>

          {/* BEST STUDENTS TABLE */}
          <div className="flex flex-col p-6 w-full bg-white border border-[#C0C0C0] rounded-[5px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold mb-4">{t("Best students")}</p>
              </div>
              <div>
                <Link to="/admin/users" className="text-[#010202]! underline! text-[10px]">
                  {t("Show all")} »
                </Link>
              </div>
            </div>
            {bestStudentsData.length === 0 ? (
              <Empty />
            ) : (
              bestStudentsData
                .slice(
                  (paginationByTable.bestStudents?.currentPage - 1) * paginationByTable.bestStudents?.pageSize,
                  (paginationByTable.bestStudents?.currentPage - 1) * paginationByTable.bestStudents?.pageSize + paginationByTable.bestStudents?.pageSize,
                )
                .map((l) => (
                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <p>
                        {dayjs(l.created_at).format("DD MMM, YYYY")} | {dayjs(l.created_at).format("HH:mm")}
                      </p>
                      <p className="font-bold">ID: {l.id_user}</p>
                      <p className="underline">{l.user_name}</p>
                    </div>
                    <div className="flex flex-col justify-end items-end">
                      <Tag color={colors[l.action]} variant="outlined">
                        {l.action}
                      </Tag>
                      {l.table_name && l.meta_data ? (
                        <Tag color={"grey"} variant="outlined" className="mt-2!">
                          {tables[l.table_name] ?? l.table_name}
                          {l.table_name.includes("course") && l.meta_data.name ? `: ${l.meta_data.name}` : null}
                        </Tag>
                      ) : null}
                    </div>
                  </div>
                ))
            )}

            {bestStudentsData.length > 0 && (
              <div className="flex justify-center items-center mt-4 w-full">
                <Pagination
                  defaultPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                  simple
                  onShowSizeChange={(page, pageSize) => pageSizeChange("logs", page, pageSize)}
                  className="mt-8! w-full!"
                  total={logsData.length}
                  current={paginationByTable.bestStudents?.currentPage}
                  onChange={(page, pageSize) => changePage("logs", page, pageSize)}
                  pageSize={paginationByTable.bestStudents?.pageSize}
                />
              </div>
            )}
          </div>

          {/* ACCESS LOGS TABLE */}
          <div className="flex flex-col p-6 w-full bg-white border border-[#C0C0C0] rounded-[5px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold mb-4">{t("Access logs")}</p>
              </div>
              <div>
                <Link to="/admin/users" className="text-[#010202]! underline! text-[10px]">
                  {t("Show all")} »
                </Link>
              </div>
            </div>
            {logsData.length === 0 ? (
              <Empty />
            ) : (
              logsData
                .slice(
                  (paginationByTable.logs?.currentPage - 1) * paginationByTable.logs?.pageSize,
                  (paginationByTable.logs?.currentPage - 1) * paginationByTable.logs?.pageSize + paginationByTable.logs?.pageSize,
                )
                .map((l) => (
                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <p>
                        {dayjs(l.created_at).format("DD MMM, YYYY")} | {dayjs(l.created_at).format("HH:mm")}
                      </p>
                      <p className="font-bold">ID: {l.id_user}</p>
                      <p className="underline">{l.user_name}</p>
                    </div>
                    <div className="flex flex-col justify-end items-end">
                      <Tag color={colors[l.action]} variant="outlined">
                        {l.action}
                      </Tag>
                      {l.table_name && l.meta_data ? (
                        <Tag color={"grey"} variant="outlined" className="mt-2!">
                          {tables[l.table_name] ?? l.table_name}
                          {l.table_name.includes("course") && l.meta_data.name ? `: ${l.meta_data.name}` : null}
                        </Tag>
                      ) : null}
                    </div>
                  </div>
                ))
            )}

            {logsData.length > 0 && (
              <div className="flex justify-center items-center mt-4 w-full">
                <Pagination
                  defaultPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                  simple
                  onShowSizeChange={pageSizeChange}
                  className="mt-8! w-full!"
                  total={logsData.length}
                  current={paginationByTable.logs?.currentPage}
                  onChange={(page, pageSize) => changePage("logs", page, pageSize)}
                  pageSize={paginationByTable.logs?.pageSize}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
