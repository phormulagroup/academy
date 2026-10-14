import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { Empty, Switch } from "antd";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import UserHero from "../../components/app/user/hero";
import CourseResult from "../../components/app/user/courseResult";
import { LuAward, LuBookOpen, LuCircleCheck, LuPlay } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { downloadCertificate } from "../../utils/certificate";
import {
  catalogueFiltersKey,
  courseDateState,
  isAllowedByCountry,
  isCourseFailed,
  readCatalogueFilters,
  testDateState,
} from "../../utils/courseStatus";
import config from "../../utils/config";
import { courseStats } from "../../utils/userResults";
import { hasFullAccess } from "../../utils/roles";

export default function Result() {
  const { user, selectedLanguage, isStaff } = useContext(Context);
  const [coursesData, setCoursesData] = useState([]);
  // Admin: as mesmas opções do catálogo para esconder expirados / por abrir (a preferência é partilhada com o catálogo)
  const [filters, setFilters] = useState({ hideExpired: false, hideUpcoming: false });
  const isAdmin = hasFullAccess(user);

  const { t } = useTranslation();

  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      getData();
    }
  }, [user, selectedLanguage]);

  useEffect(() => {
    if (user?.id) setFilters(readCatalogueFilters(user.id));
  }, [user?.id]);

  function toggleFilter(key) {
    const next = { ...filters, [key]: !filters[key] };
    setFilters(next);
    try {
      localStorage.setItem(catalogueFiltersKey(user.id), JSON.stringify(next));
    } catch {
      // sem acesso ao localStorage: fica só nesta sessão
    }
  }

  function getData() {
    const params = {
      id: user.id,
      id_role: user.id_role,
    };
    // For admins: pass the selected language; for students: no parameter needed
    // A equipa (Admin, Gestor…) vê os resultados do idioma escolhido
    if (isStaff && selectedLanguage) {
      params.id_lang = selectedLanguage.id;
    } else {
      // console.log("Student fetching results for their language:", user.id_lang);
    }
    axios
      .get(endpoints.user.readById, { params })
      .then((res) => {
        // console.log("Server response - Courses:", res.data.courses.length, "Progress:", res.data.progress.length);
        if (res.data.user) {
          prepareData(res);
        }
      })
      .catch((err) => {
        console.log("Error fetching data:", err);
      });
  }

  function prepareData(res) {
    // console.log("prepareData called with courses:", res.data.courses.length);
    if (res.data.courses.length > 0) {
      let auxCourse = [];
      for (let c = 0; c < res.data.courses.length; c++) {
        let aux = {};
        let auxAllItems = [];
        let course = res.data.courses[c];
        course.settings = course.settings ? JSON.parse(course.settings) : null;

        // Restrição de países: aplica-se a alunos e admin (mesma regra do catálogo)
        if (
          !isAllowedByCountry(
            course.settings?.country_limit ? course.settings.country : null,
            res.data.user,
          )
        ) {
          // console.log("Course skipped due to country limit:", course.name);
          continue;
        }

        // Validade do curso, como no catálogo: os alunos só veem os cursos dentro das datas; o Admin vê todos, com o estado
        const dateState = courseDateState(course);
        if (!hasFullAccess(res.data.user) && dateState !== "active") continue;

        let courseModules = res.data.modules.filter(
          (m) => m.id_course === course.id,
        );

        // Always add course, regardless of modules
        aux.course = course;
        aux.dateState = dateState;
        aux.progress = res.data.progress.filter(
          (p) => p.id_course === course.id,
        );
        aux.allItems = [];

        if (courseModules.length > 0) {
          let newModules = [];
          for (let i = 0; i < courseModules.length; i++) {
            courseModules[i].items = courseModules[i].items
              ? JSON.parse(courseModules[i].items)
              : null;
            if (courseModules[i].items) {
              let filteredItems = [];
              for (let y = 0; y < courseModules[i].items.length; y++) {
                let itemToAdd = null;

                if (courseModules[i].items[y].type === "topic") {
                  const topicData = res.data.topics.filter(
                    (_t) => _t.id === courseModules[i].items[y].id,
                  )[0];
                  if (topicData && topicData.is_deleted !== 1) {
                    itemToAdd = {
                      type: courseModules[i].items[y].type,
                      ...topicData,
                    };
                  }
                }

                if (courseModules[i].items[y].type === "test") {
                  const testData = res.data.tests.filter(
                    (_t) => _t.id === courseModules[i].items[y].id,
                  )[0];
                  // Alunos: sem testes em rascunho nem expirados (como no curso); o Admin vê todos
                  if (
                    testData &&
                    testData.is_deleted !== 1 &&
                    (hasFullAccess(res.data.user) ||
                      (testData.status !== "draft" && testDateState(testData) !== "expired"))
                  ) {
                    itemToAdd = {
                      type: courseModules[i].items[y].type,
                      ...testData,
                    };
                  }
                }

                if (itemToAdd) {
                  filteredItems.push(itemToAdd);
                  auxAllItems.push(itemToAdd);
                }
              }

              // Only add module if it has items after filtering
              if (filteredItems.length > 0) {
                courseModules[i].items = filteredItems;
                newModules.push(courseModules[i]);
              }
            }
          }
          aux.modules = newModules;
          aux.allItems = auxAllItems;
        } else {
          aux.modules = [];
          aux.allItems = [];
        }

        // Reprovado: esgotou as tentativas de pelo menos um teste do curso (mesma regra do catálogo)
        aux.isFailed = isCourseFailed(aux.progress, aux.allItems.filter((i) => i.type === "test"));
        auxCourse.push(aux);
        // console.log("Course added:", course.name, "Modules:", courseModules.length);
      }

      // console.log("Total courses prepared:", auxCourse.length);
      setCoursesData(auxCourse);
    } else {
      setCoursesData([]);
    }
  }

  function handleDownloadCertificate(item, progress) {
    downloadCertificate(item, progress, user, config, endpoints);
  }

  const expiredCount = coursesData.filter((c) => c.dateState === "expired").length;
  const upcomingCount = coursesData.filter((c) => c.dateState === "upcoming").length;
  const visibleCourses = coursesData.filter(
    (c) =>
      !(filters.hideExpired && c.dateState === "expired") &&
      !(filters.hideUpcoming && c.dateState === "upcoming"),
  );

  // Contas sobre os cursos listados (respeitam as opções de esconder); reprovado não conta como "em curso"
  const summary = useMemo(() => {
    const stats = visibleCourses.map((c) => ({ ...courseStats(c), isFailed: c.isFailed }));
    return {
      courses: visibleCourses.length,
      inProgress: stats.filter((s) => s.status === "in_progress" && !s.isFailed).length,
      approved: stats.filter((s) => s.status === "completed").length,
      certificates: stats.filter((s) => s.hasCertificate).length,
    };
  }, [visibleCourses]);

  const tiles = [
    { icon: <LuBookOpen />, label: t("Course(s)"), value: summary.courses },
    { icon: <LuPlay />, label: t("In progress"), value: summary.inProgress },
    { icon: <LuCircleCheck />, label: t("Approved"), value: summary.approved },
    { icon: <LuAward />, label: t("Certificate(s)"), value: summary.certificates },
  ];

  return (
    <div className="flex-1 bg-[#F1F9FF] py-8 sm:py-12 lg:py-16">
      <div className="page-frame flex flex-col gap-4 sm:gap-6">
        <UserHero />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-[0px_3px_6px_#00000029] sm:p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#E6F9FC] text-[20px] text-[#163986] sm:h-11 sm:w-11">{tile.icon}</span>
              <div>
                <p className="mb-0! text-[20px] font-bold leading-tight sm:text-[22px]">{tile.value}</p>
                <p className="mb-0! text-[12px] text-[#8A8D98]">{tile.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[16px] bg-white p-3 shadow-[0px_3px_6px_#00000029] sm:p-6 lg:p-8">
          <p className="mb-1! font-ryker text-[20px] font-bold sm:text-[24px]">{t("Results")}</p>
          <p className="mb-5! text-[14px] text-[#8A8D98]">{t("Your progress and tests in each course")}</p>
          {/* Admin: esconder expirados / por abrir, como no catálogo */}
          {isAdmin && (expiredCount > 0 || upcomingCount > 0) && (
            <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              {expiredCount > 0 && (
                <label className="course-catalogue-filter">
                  <Switch size="small" checked={filters.hideExpired} onChange={() => toggleFilter("hideExpired")} />
                  <span>
                    {t("Hide expired courses")} ({expiredCount})
                  </span>
                </label>
              )}
              {upcomingCount > 0 && (
                <label className="course-catalogue-filter">
                  <Switch size="small" checked={filters.hideUpcoming} onChange={() => toggleFilter("hideUpcoming")} />
                  <span>
                    {t("Hide coming soon courses")} ({upcomingCount})
                  </span>
                </label>
              )}
            </div>
          )}
          {visibleCourses.length > 0 ? (
            <div className="flex flex-col gap-4">
              {visibleCourses.map((c) => (
                <CourseResult key={c.course.id} course={c} onDownloadCertificate={handleDownloadCertificate} />
              ))}
            </div>
          ) : (
            <Empty description={t("No courses available")} />
          )}
        </div>
      </div>
    </div>
  );
}
