import axios from "axios";
import BialSpin from "../../../components/bialSpin";
import { useEffect, useState } from "react";
import { Button, Empty, Progress, Tooltip } from "antd";
import { useContext } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link, useNavigate } from "react-router-dom";

import dayjs from "dayjs";

import config from "../../../utils/config";
import { getMarginClasses } from "../../../utils/responsive";
import useScrollToTop from "../../../utils/scrollToTop";

// import { FaAward, FaRegClock } from "react-icons/fa";
// import { FaListCheck } from "react-icons/fa6";
import {
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineCloudDownload,
  // AiOutlinePlayCircle
} from "react-icons/ai";
import {
  PiCalendarBlank,
  PiEye,
  PiEyeSlash,
  PiHourglassMedium,
} from "react-icons/pi";

import i18n from "../../../utils/i18n";
import { downloadCertificate } from "../../../utils/certificate";
import {
  courseDateState,
  isAllowedByCountry,
  isCourseFailed,
  testDateState,
} from "../../../utils/courseStatus";
import { GridIcon, ListIcon } from "lucide-react";
import { Helmet } from "react-helmet";
import { RxChevronUp } from "react-icons/rx";

// Cursos expirados que o admin escondeu do SEU catálogo (só no browser; não altera a BD)
const hiddenExpiredKey = (userId) => `hidden_expired_courses_${userId}`;

function readHiddenExpired(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(hiddenExpiredKey(userId)));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function CourseDetails() {
  const { t, user, windowDimension, selectedLanguage } = useContext(Context);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState("grid");
  const { isVisible: showScrollToTop, scrollToTop } = useScrollToTop();
  // Vista em lista (só em ecrãs > 640px; abaixo disso é sempre grelha)
  const isListView = viewType === "list" && windowDimension.width > 640;
  const isAdmin = user?.id_role === 1;
  const [hiddenExpired, setHiddenExpired] = useState([]);
  const [showHiddenExpired, setShowHiddenExpired] = useState(false);

  useEffect(() => {
    if (user) getData();
  }, [user, selectedLanguage]);

  useEffect(() => {
    if (user?.id) setHiddenExpired(readHiddenExpired(user.id));
  }, [user?.id]);

  // Esconder / voltar a mostrar um curso expirado no catálogo do admin
  function toggleHiddenExpired(courseId) {
    const next = hiddenExpired.includes(courseId)
      ? hiddenExpired.filter((id) => id !== courseId)
      : [...hiddenExpired, courseId];
    setHiddenExpired(next);
    try {
      localStorage.setItem(hiddenExpiredKey(user.id), JSON.stringify(next));
    } catch {
      // sem acesso ao localStorage: fica só nesta sessão
    }
  }

  const hiddenExpiredCount = data.filter(
    (item) =>
      item.dateState === "expired" && hiddenExpired.includes(item.course.id),
  ).length;
  const visibleData = data.filter(
    (item) =>
      showHiddenExpired ||
      item.dateState !== "expired" ||
      !hiddenExpired.includes(item.course.id),
  );

  useEffect(() => {
    if (windowDimension < 1080) setViewType("grid");
  }, [windowDimension]);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readByLang, {
        params: {
          id_user: user.id,
          id_lang:
            user.id_role === 1 && selectedLanguage
              ? selectedLanguage.id
              : user.id_lang,
        },
      });
      let auxData = [];
      for (let c = 0; c < res.data.courses.length; c++) {
        let auxCourse = res.data.courses[c];
        if (auxCourse.status === "draft" && user.id_role !== 1) continue;
        auxCourse.settings = auxCourse.settings
          ? JSON.parse(auxCourse.settings)
          : null;

        // Validade do curso: alunos só veem cursos ativos; o admin vê todos (expirados com estado próprio)
        const dateState = courseDateState(auxCourse);
        if (user.id_role !== 1 && dateState !== "active") continue;

        // Restrição de países: aplica-se a alunos e admin
        if (
          !isAllowedByCountry(
            auxCourse.settings?.country_limit ? auxCourse.settings.country : null,
            user,
          )
        )
          continue;

        if (auxCourse) {
          let auxObj = {
            course: auxCourse,
            dateState,
          };
          // Todos os testes do curso (para o estado "Reprovado", mesmo que já tenham expirado)
          let courseTests = [];
          let newModules = []; // Initialize here
          if (res.data.progress.length > 0)
            auxObj.progress = res.data.progress.filter(
              (p) => p.id_course === auxCourse.id,
            );
          if (res.data.modules.length > 0) {
            let auxModules = res.data.modules.filter(
              (m) => m.id_course === auxCourse.id,
            );
            for (let i = 0; i < auxModules.length; i++) {
              auxModules[i].items = auxModules[i].items
                ? JSON.parse(auxModules[i].items)
                : null;
              if (auxModules[i].items) {
                let filteredItems = [];
                for (let y = 0; y < auxModules[i].items.length; y++) {
                  let enrichedItem = null;

                  if (auxModules[i].items[y].type === "topic") {
                    const topicData = res.data.topics.filter(
                      (_t) => _t.id === auxModules[i].items[y].id,
                    )[0];
                    if (topicData && topicData.is_deleted !== 1) {
                      enrichedItem = {
                        type: auxModules[i].items[y].type,
                        ...topicData,
                      };
                    }
                  }

                  if (auxModules[i].items[y].type === "test") {
                    const testData = res.data.tests.filter(
                      (_t) => _t.id === auxModules[i].items[y].id,
                    )[0];
                    if (
                      testData &&
                      testData.is_deleted !== 1 &&
                      (user.id_role === 1 || testData.status !== "draft")
                    ) {
                      courseTests.push(testData);
                      // Alunos: testes expirados saem do eLearning, logo também do progresso
                      if (
                        user.id_role === 1 ||
                        testDateState(testData) !== "expired"
                      )
                        enrichedItem = {
                          type: auxModules[i].items[y].type,
                          ...testData,
                        };
                    }
                  }

                  if (enrichedItem) {
                    filteredItems.push(enrichedItem);
                  }
                }

                if (filteredItems.length > 0) {
                  auxModules[i].items = filteredItems;
                  newModules.push(auxModules[i]);
                }
              }
            }

            auxObj.modules = newModules;
          }
          auxObj.isFailed = isCourseFailed(auxObj.progress, courseTests);

          auxData.push(auxObj);
        }
      }

      setData(auxData);
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    } catch (err) {
      console.log(err);
    }
  }

  // Datas de início/fim do curso (definições "Course access expiration")
  function courseDate(course, key) {
    const date = course.settings?.course_access_expiration_dates?.[key];
    return date ? dayjs(date).format("DD/MM/YYYY") : "";
  }

  function calcProgress(items, modules) {
    if (items && items.length > 0) {
      // Build a set of visible item references from already-filtered modules
      const visibleItems = new Set();
      (modules || []).forEach((m) => {
        if (m.items && m.items.length > 0) {
          m.items.forEach((item) => {
            const key =
              item.type === "topic" ? `topic_${item.id}` : `test_${item.id}`;
            visibleItems.add(key);
          });
        }
      });

      let steps = visibleItems.size;
      // Conta cada item uma só vez (podem existir registos de conclusão repetidos do mesmo item)
      const completedItems = new Set(
        items
          .filter(
            (p) =>
              p.is_completed === 1 &&
              p.is_deleted !== 1 &&
              (p.activity_type === "topic" || p.activity_type === "test"),
          )
          .map((p) =>
            p.activity_type === "topic"
              ? `topic_${p.id_course_topic}`
              : `test_${p.id_course_test}`,
          )
          .filter((key) => visibleItems.has(key)),
      );
      let completed = completedItems.size;

      let progressPercentage = steps > 0 ? (100 * completed) / steps : 0;
      return progressPercentage === 100
        ? 100
        : parseFloat(progressPercentage).toFixed(2);
    }
    return 0;
  }

  // "Iniciar" no card: inscreve logo o utilizador no curso (activity_type enroll, is_completed = 1),
  // para que o detalhe do curso já o mostre como inscrito, sem ter de voltar a carregar em Iniciar
  function startCourse(e, item) {
    const isEnrolled = item.progress?.some((p) => p.activity_type === "enroll");
    if (isEnrolled || calcProgress(item.progress, item.modules) !== 0) return;
    e.preventDefault();
    const enrollData = {
      id_course: item.course.id,
      id_user: user.id,
      activity_type: "enroll",
      is_completed: 1,
      created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    };
    axios
      .post(endpoints.course.updateProgress, { data: [enrollData] })
      .catch((err) => console.log(err))
      .finally(() => navigate(`/${i18n.language}/courses/${item.course.slug}`));
  }

  function handleDownloadCertificate(item, progress) {
    downloadCertificate(item, progress, user, config, endpoints);
  }

  // function hasCertificate(course) {
  //   return course?.id_course_certificate ? true : false;
  // }

  // function formatDuration(hours, minutes) {
  //   let duration = "";
  //   if (hours) duration += `${hours} h`;
  //   if (minutes) duration += ` ${minutes} m`;
  //   return duration.trim();
  // }

  // function countVideosCourse(modules) {
  //   if (!modules || modules.length === 0) return 0;

  //   let videoCount = 0;
  //   modules.forEach((module) => {
  //     if (module.items && Array.isArray(module.items)) {
  //       module.items.forEach((item) => {
  //         if (item.type === "topic" && item.content) {
  //           try {
  //             const content =
  //               typeof item.content === "string"
  //                 ? JSON.parse(item.content)
  //                 : item.content;
  //             if (content?.content && Array.isArray(content.content)) {
  //               content.content.forEach((block) => {
  //                 if (block.type === "Video" && block.props?.link) {
  //                   videoCount++;
  //                 }
  //               });
  //             }
  //           } catch {
  //             console.log("Error parsing content for item:", item);
  //           }
  //         }
  //       });
  //     }
  //   });

  //   return videoCount;
  // }

  // function countActiveTests(modules) {
  //   if (!modules || modules.length === 0) return 0;

  //   let activeTestCount = 0;
  //   modules.forEach((module) => {
  //     if (module.items && Array.isArray(module.items)) {
  //       module.items.forEach((item) => {
  //         if (item.type === "test" && item.status === "published") {
  //           activeTestCount++;
  //         }
  //       });
  //     }
  //   });

  //   return activeTestCount;
  // }

  // function getCourseInfoItems(course, modules) {
  //   const items = [];

  //   // Informações do certificado
  //   items.push({
  //     id: "certificate",
  //     icon: FaAward,
  //     label: hasCertificate(course)
  //       ? t("With certificate")
  //       : t("Without certificate"),
  //   });

  //   // Vídeos do curso
  //   const videoCount = countVideosCourse(modules);
  //   items.push({
  //     id: "videos",
  //     icon: AiOutlinePlayCircle,
  //     label: `${videoCount} ${videoCount === 1 ? t("Video") : t("Videos")}`,
  //   });

  //   // Duração do curso
  //   const duration =
  //     course.settings?.duration_hours || course.settings?.duration_minutes
  //       ? formatDuration(
  //           course.settings.duration_hours,
  //           course.settings.duration_minutes,
  //         )
  //       : t("No duration");
  //   items.push({
  //     id: "duration",
  //     icon: FaRegClock,
  //     label: duration,
  //   });

  //   // Testes ativos do curso
  //   const testCount = countActiveTests(modules);
  //   items.push({
  //     id: "tests",
  //     icon: FaListCheck,
  //     label: `${testCount} ${testCount === 1 ? t("Active Test") : t("Active Tests")}`,
  //   });

  //   return items;
  // }

  return (
    <div className="bg-[#FFFFFF] relative">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Courses")} - Bial Regional Academy</title>
        <meta
          name="description"
          content={`${t("Courses")} - Bial Regional Academy`}
        />
        <meta
          property="og:title"
          content={`${t("Courses")} - Bial Regional Academy`}
        />
        <meta
          property="og:description"
          content={`${t("Courses")} - Bial Regional Academy`}
        />
      </Helmet>
      <div className={`page-frame ${getMarginClasses(windowDimension)}`}>
        <div className="flex flex-col justify-center items-center mb-8 sm:mb-12 pb-2 sm:pb-4">
          <p className="font-ryker text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-center text-[#163986]">
            {t("Online Courses")} - Bial Academy
          </p>
          <p className="font-ryker italic text-center text-[14px] sm:text-[16px] lg:text-[18px] text-[#163986] mt-2 sm:mt-3">
            Keeping training in mind
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full col-span-3">
            <BialSpin />
          </div>
        ) : data.length > 0 ? (
          <div>
            {(windowDimension.width > 768 ||
              (isAdmin && hiddenExpiredCount > 0)) && (
              <div className="col-span-3 flex justify-end items-center gap-4 mb-8">
                {/* Admin: voltar a mostrar os cursos expirados que escondeu */}
                {isAdmin && hiddenExpiredCount > 0 && (
                  <Button
                    size="small"
                    className="course-hidden-expired-toggle"
                    icon={showHiddenExpired ? <PiEyeSlash /> : <PiEye />}
                    onClick={() => setShowHiddenExpired((v) => !v)}>
                    {showHiddenExpired
                      ? t("Hide expired courses again")
                      : `${t("Show hidden expired courses")} (${hiddenExpiredCount})`}
                  </Button>
                )}
                {windowDimension.width > 768 && (
                  <>
                    <GridIcon
                      className="cursor-pointer"
                      color="#163986"
                      onClick={() => setViewType("grid")}
                    />
                    <ListIcon
                      className="cursor-pointer"
                      color="#163986"
                      onClick={() => setViewType("list")}
                    />
                  </>
                )}
              </div>
            )}
            {visibleData.length === 0 && (
              <div className="flex flex-col justify-center items-center">
                <Empty description={t("No courses found")} />
              </div>
            )}
            <div
              // Grelha comum aos catálogos (cursos, documentos, downloads): 1 coluna em telemóvel, 2 em sm/md, 3 em lg e 4 em xl
              className={`grid ${isListView ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"} gap-5 sm:gap-6 lg:gap-6`}>
              {/* CARD COURSE */}
              {visibleData.map((item) => (
                <div
                  key={item.course.id}
                  // Curso concluído: borda e painel em verde Bial, com selo "Concluído" na imagem;
                  // reprovado: o mesmo em vermelho Bial; expirado (só admin): imagem esbatida com faixa "Expirado"
                  className={`shadow-[0px_3px_6px_#00000029] rounded-[5px] ${viewType === "list" && windowDimension.width > 640 ? "flex" : "flex flex-col"} ${viewType === "list" && windowDimension.width > 640 ? "col-span-3" : "col-span-1"} overflow-hidden ${calcProgress(item.progress, item.modules) === 100 ? "course-card-completed" : item.isFailed ? "course-card-failed" : ""} ${item.dateState === "expired" ? "course-card-expired" : ""}`}>
                  <div
                    // Thumbnails 800x600 (4:3): a caixa tem a mesma proporção, por isso o bg-cover não corta a imagem
                    className={`${viewType === "list" && windowDimension.width > 640 ? "w-40 lg:w-50 shrink-0 self-center rounded-bl-[5px] rounded-tl-[5px]" : "w-full rounded-tl-[5px] rounded-tr-[5px]"} aspect-[4/3] bg-center bg-cover bg-no-repeat p-3 sm:p-4 lg:p-6 flex justify-start items-end relative`}
                    style={{
                      backgroundImage: item.course?.thumbnail
                        ? `url(${config.server_ip}/media/${item.course?.thumbnail})`
                        : "none",
                      backgroundColor: item.course?.thumbnail
                        ? "rgba(0, 0, 0, 0.05)"
                        : "rgb(0, 0, 0)",
                      backgroundBlendMode: "overlay",
                    }}>
                    {/* 
                    {(viewType === "grid" || windowDimension.width <= 640) && (
                      <div className="p-[4px_10px] sm:p-[6px_14px] lg:p-[6px_16px] bg-white border border-[#163986] rounded-[40px] max-w-full">
                        <p className="font-bold text-[#163986] truncate text-[12px] sm:text-[13px] lg:text-[15px] xl:text-[16px]">
                          {item.course?.name}
                        </p>
                      </div>
                    )}
                    */}
                    {/* Em lista o selo passa para o painel de informação (não sobrepõe a imagem) */}
                    {calcProgress(item.progress, item.modules) === 100 &&
                      !isListView && (
                      <div className="course-card-completed-badge">
                        <AiOutlineCheck className="shrink-0" />
                        <span>{t("Completed")}</span>
                      </div>
                    )}
                    {calcProgress(item.progress, item.modules) !== 100 &&
                      item.isFailed &&
                      !isListView && (
                        <div className="course-card-completed-badge course-card-failed-badge">
                          <AiOutlineClose className="shrink-0" />
                          <span>{t("Failed")}</span>
                        </div>
                      )}
                    {/* Expirado (só o admin vê): faixa com a data de fim e ação para esconder do seu catálogo */}
                    {item.dateState === "expired" && (
                      <>
                        <div className="course-card-expired-ribbon">
                          <PiHourglassMedium className="shrink-0 course-card-expired-icon" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-ryker font-bold uppercase leading-none">
                              {t("Expired")}
                            </span>
                            {courseDate(item.course, "end_date") && (
                              <span className="course-card-expired-date">
                                {t("Ended on")}{" "}
                                {courseDate(item.course, "end_date")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Tooltip
                          title={
                            hiddenExpired.includes(item.course.id)
                              ? t("Show in catalogue")
                              : t("Hide from catalogue")
                          }>
                          <button
                            type="button"
                            className="course-card-expired-hide"
                            aria-label={
                              hiddenExpired.includes(item.course.id)
                                ? t("Show in catalogue")
                                : t("Hide from catalogue")
                            }
                            onClick={() => toggleHiddenExpired(item.course.id)}>
                            {hiddenExpired.includes(item.course.id) ? (
                              <PiEye />
                            ) : (
                              <PiEyeSlash />
                            )}
                          </button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                  <div
                    className={`w-full flex-1 ${viewType === "list" && windowDimension.width > 640 ? "grid grid-cols-5" : "flex flex-col"}`}>
                    <div
                      className={`course-card-info bg-[#C5CEE1] ${viewType === "list" && windowDimension.width > 640 ? "col-span-4 grid grid-cols-3 gap-6 lg:gap-10" : "col-span-1"} p-4 sm:p-5 md:p-6 lg:p-6`}>
                      <div
                        className={`flex flex-col col-span-3 ${isListView ? "justify-center h-full" : ""}`}>
                        {/* 
                                                {viewType === "list" && windowDimension.width > 640 && (
                          <div className="mb-4">
                            <div className="p-[6px_12px] sm:p-[8px_16px] bg-white border border-[#163986] rounded-[40px] inline-block max-w-full">
                              <p className="font-bold text-[#163986] text-[12px] sm:text-[13px] lg:text-[15px] xl:text-[16px] truncate">
                                {item.course?.name}
                              </p>
                            </div>
                          </div>
                        )}
                        */}
                        {/* {item.course.settings?.id_trainer && (
												<div className="flex items-center mb-4">
													<Avatar src={avatarImg} className="w-12.5! h-12.5!" />
													<div className="ml-2">
														<p className="text-sm">
															{item.course?.responsible_name ??
																"Claúdia Meneses"}
														</p>
														<p className="text-[11px] text-[#707070]">
															{item.course?.responsible_job ??
																"Marketing Manager"}
															, {item.course?.responsible_country ?? "África"}
														</p>
													</div>
												</div>
											)} */}
                        <div
                          className={`${isListView ? "" : "mt-2 sm:mt-2 lg:mt-[6px]"} flex flex-col justify-center items-center`}>
                          {calcProgress(item.progress, item.modules) === 100 ? (
                            <>
                              {isListView && (
                                <div className="flex w-full mb-3">
                                  <div className="course-card-completed-badge course-card-completed-badge-inline">
                                    <AiOutlineCheck className="shrink-0" />
                                    <span>{t("Completed")}</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-row items-center justify-between w-full mb-3 sm:mb-3 gap-2 sm:gap-2 min-h-auto">
                                <p
                                  className="uppercase font-bold text-[13px] sm:text-[10px] md:text-[12px] lg:text-[14px] text-[#2F8351] flex-shrink-0"
                                  style={{
                                    fontSize:
                                      windowDimension.width < 375
                                        ? "11px"
                                        : windowDimension.width < 640
                                          ? "11px"
                                          : windowDimension.width >= 1024 &&
                                              windowDimension.width < 1440
                                            ? "12px"
                                            : "inherit",
                                  }}>
                                  {calcProgress(item.progress, item.modules)}%{" "}
                                  {t("Completed").toLowerCase()}
                                </p>
                                {/* Certificado do Curso */}
                                <Button
                                  size="middle"
                                  className={`certificate-button ${windowDimension.width < 640 ? "w-fit" : "flex-shrink-0"} ${windowDimension.width < 640 ? "px-2 py-1!" : "px-3 py-2!"} lg:text-[14px] lg:px-4`}
                                  onClick={() =>
                                    handleDownloadCertificate(
                                      item.course,
                                      item.progress,
                                    )
                                  }>
                                  <div
                                    className={`flex ${windowDimension.width < 640 ? "justify-center w-14" : "justify-center"} items-center ${windowDimension.width < 640 ? "gap-0" : "gap-1"}`}>
                                    <AiOutlineCloudDownload
                                      className={`${windowDimension.width < 640 ? "text-[18px]" : windowDimension.width < 768 ? "text-[18px]" : windowDimension.width < 1024 ? "text-[20px]" : windowDimension.width >= 1440 ? "text-[24px]" : "text-[20px]"}`}
                                      style={{
                                        fontSize:
                                          windowDimension.width < 640
                                            ? "20px"
                                            : windowDimension.width < 768
                                              ? "18.5px"
                                              : windowDimension.width < 1024
                                                ? "20px"
                                                : windowDimension.width >= 1440
                                                  ? "24px"
                                                  : "20px",
                                      }}
                                    />
                                    {windowDimension.width >= 640 && (
                                      <span
                                        className="text-[9px] sm:text-[12px] lg:text-[14px]"
                                        style={{
                                          fontSize:
                                            windowDimension.width >= 1440
                                              ? "12px"
                                              : "inherit",
                                        }}>
                                        {t("Certificate")}
                                      </span>
                                    )}
                                  </div>
                                </Button>
                              </div>
                              <Progress
                                percent={calcProgress(
                                  item.progress,
                                  item.modules,
                                )}
                                showInfo={false}
                                strokeColor="#2F8351"
                                railColor="#FFFFFF"
                              />
                            </>
                          ) : (
                            <div className="flex flex-col w-full">
                              {isListView && item.isFailed && (
                                <div className="flex w-full mb-3">
                                  <div className="course-card-completed-badge course-card-completed-badge-inline course-card-failed-badge">
                                    <AiOutlineClose className="shrink-0" />
                                    <span>{t("Failed")}</span>
                                  </div>
                                </div>
                              )}
                              {item.progress?.length > 0 ? (
                                <>
                                  <div className="flex items-center justify-center w-full mb-3">
                                    <p
                                      className="uppercase font-bold text-[8px] sm:text-[10px] md:text-[12px] lg:text-[14px] text-[#163986]"
                                      style={{
                                        fontSize:
                                          windowDimension.width < 640
                                            ? "11px"
                                            : windowDimension.width >= 1024 &&
                                                windowDimension.width < 1440
                                              ? "12px"
                                              : "inherit",
                                      }}>
                                      {calcProgress(
                                        item.progress,
                                        item.modules,
                                      )}
                                      % {t("Completed").toLowerCase()}
                                    </p>
                                  </div>
                                  <Progress
                                    percent={calcProgress(
                                      item.progress,
                                      item.modules,
                                    )}
                                    showInfo={false}
                                    strokeColor="#2F8351"
                                    railColor="#FFFFFF"
                                    
                                  />
                                </>
                              ) : (
                                <div className="flex items-center text-[#163986] font-bold justify-center w-full mb-1">
                                  <p
                                    className="text-[8px] sm:text-[14px]"
                                    style={{
                                      fontSize:
                                        windowDimension.width < 640
                                          ? "11px"
                                          : "inherit",
                                    }}>
                                    {t("Not started")}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* INFO SECTION */}
                          {/* (() => {
                            const infoItems = getCourseInfoItems(
                              item.course,
                              item.modules,
                            );

                            if (
                              viewType === "list" &&
                              windowDimension.width > 640
                            ) {
                              const leftGroup = infoItems.slice(0, 2);
                              const rightGroup = infoItems.slice(2);
                              return (
                                <div className="mt-2 sm:mt-3 lg:mt-4 w-full flex gap-6 lg:gap-8">
                                  <div className="flex flex-col gap-1.5">
                                    {leftGroup.map((infoItem) => {
                                      const IconComponent = infoItem.icon;
                                      return (
                                        <div
                                          key={infoItem.id}
                                          className="flex items-center gap-1 sm:gap-1.5">
                                          <IconComponent
                                            className="text-[11px] sm:text-[13.5px] md:text-[14px] lg:text-[15px] text-[#163986] flex-shrink-0"
                                            style={{
                                              fontSize:
                                                windowDimension.width >= 1440
                                                  ? "18px"
                                                  : "inherit",
                                            }}
                                          />
                                          <p
                                            className="text-[11px] sm:text-[11.5px] md:text-[14px] lg:text-[14px] text-[#163986] break-words"
                                            style={{
                                              fontSize:
                                                windowDimension.width >= 1024 &&
                                                windowDimension.width < 1440
                                                  ? "13px"
                                                  : windowDimension.width >=
                                                      1440
                                                    ? "16px"
                                                    : "inherit",
                                            }}>
                                            {infoItem.label}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {rightGroup.map((infoItem) => {
                                      const IconComponent = infoItem.icon;
                                      return (
                                        <div
                                          key={infoItem.id}
                                          className="flex items-center gap-1 sm:gap-1.5">
                                          <IconComponent
                                            className="text-[11px] sm:text-[13.5px] md:text-[14px] lg:text-[15px] text-[#163986] flex-shrink-0"
                                            style={{
                                              fontSize:
                                                windowDimension.width >= 1440
                                                  ? "18px"
                                                  : "inherit",
                                            }}
                                          />
                                          <p
                                            className="text-[11px] sm:text-[11.5px] md:text-[14px] lg:text-[14px] text-[#163986] break-words whitespace-nowrap"
                                            style={{
                                              fontSize:
                                                windowDimension.width >= 1024 &&
                                                windowDimension.width < 1440
                                                  ? "13px"
                                                  : windowDimension.width >=
                                                      1440
                                                    ? "16px"
                                                    : "inherit",
                                            }}>
                                            {infoItem.label}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            const leftGroup = infoItems.slice(0, 2);
                            const rightGroup = infoItems.slice(2);
                            return (
                              <div className="mt-4 sm:mt-3 lg:mt-4 w-full flex gap-3 sm:gap-4 lg:gap-6">
                                <div className="flex flex-col gap-1.5">
                                  {leftGroup.map((infoItem) => {
                                    const IconComponent = infoItem.icon;
                                    return (
                                      <div
                                        key={infoItem.id}
                                        className="flex items-center gap-1 sm:gap-1.5">
                                        <IconComponent
                                          className="text-[11px] sm:text-[13.5px] md:text-[14px] lg:text-[15px] text-[#163986] flex-shrink-0"
                                          style={{
                                            fontSize:
                                              windowDimension.width < 640
                                                ? "14px"
                                                : windowDimension.width >= 1440
                                                  ? "18px"
                                                  : "inherit",
                                          }}
                                        />
                                        <p
                                          className="text-[11px] sm:text-[11.5px] md:text-[14px] lg:text-[14px] text-[#163986] break-words"
                                          style={{
                                            fontSize:
                                              windowDimension.width < 640
                                                ? "12px"
                                                : windowDimension.width >=
                                                      1024 &&
                                                    windowDimension.width < 1440
                                                  ? "13px"
                                                  : windowDimension.width >=
                                                      1440
                                                    ? "16px"
                                                    : "inherit",
                                          }}>
                                          {infoItem.label}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {rightGroup.map((infoItem) => {
                                    const IconComponent = infoItem.icon;
                                    return (
                                      <div
                                        key={infoItem.id}
                                        className="flex items-center gap-1 sm:gap-1.5">
                                        <IconComponent
                                          className="text-[11px] sm:text-[13.5px] md:text-[14px] lg:text-[15px] text-[#163986] flex-shrink-0"
                                          style={{
                                            fontSize:
                                              windowDimension.width < 640
                                                ? "14px"
                                                : windowDimension.width >= 1440
                                                  ? "18px"
                                                  : "inherit",
                                          }}
                                        />
                                        <p
                                          className="text-[11px] sm:text-[11.5px] md:text-[14px] lg:text-[14px] text-[#163986] break-words whitespace-nowrap"
                                          style={{
                                            fontSize:
                                              windowDimension.width < 640
                                                ? "12px"
                                                : windowDimension.width >=
                                                      1024 &&
                                                    windowDimension.width < 1440
                                                  ? "13px"
                                                  : windowDimension.width >=
                                                      1440
                                                    ? "16px"
                                                    : "inherit",
                                          }}>
                                          {infoItem.label}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })() */}
                        </div>
                      </div>
                    </div>
                    <div className="px-4 sm:px-4 md:px-4 lg:px-6 py-4 sm:py-6 md:py-4 lg:py-6 flex flex-col justify-center items-center w-full flex-1">
                      {/* Cursos por iniciar só chegam aqui para o admin (alunos não os veem): indicação da data de início */}
                      {item.dateState === "upcoming" && (
                        <p className="course-card-upcoming-hint">
                          <PiCalendarBlank className="shrink-0" />
                          <span>
                            {t("Starts on")}{" "}
                            {courseDate(item.course, "start_date")}
                          </span>
                        </p>
                      )}
                      {/* Action button: Review/Start/Enter */}
                      <Link
                          to={`/${i18n.language}/courses/${item.course.slug}`}
                          onClick={(e) => startCourse(e, item)}
                          className="w-full! block">
                          {calcProgress(item.progress, item.modules) === 100 ? (
                            <Button
                              size={
                                windowDimension.width < 640 ? "middle" : "large"
                              }
                              className="w-full! course-button-review text-[8px] sm:text-[12px] lg:text-[13px]"
                              style={{
                                fontSize:
                                  windowDimension.width < 640
                                    ? "11px"
                                    : "inherit",
                              }}>
                              {t("Review")}
                            </Button>
                          ) : (
                            <Button
                              size={
                                windowDimension.width < 640 ? "middle" : "large"
                              }
                              type="primary"
                              className={`w-full! text-[8px] sm:text-[12px] lg:text-[13px] ${calcProgress(item.progress, item.modules) === 0 ? "main-cta-button" : "course-button-enter"}`}
                              style={{
                                fontSize:
                                  windowDimension.width < 640
                                    ? "11px"
                                    : "inherit",
                              }}>
                              {calcProgress(item.progress, item.modules) === 0
                                ? t("Start")
                                : t("Enter")}
                            </Button>
                          )}
                        </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center">
            <Empty description={t("No courses found")} />
          </div>
        )}
      </div>
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          style={{ backgroundColor: "#FFC600" }}
          className="fixed! bottom-8 right-8 h-12! w-12! rounded-full! flex justify-center items-center shadow-lg! cursor-pointer hover:opacity-90 transition-opacity border-0"
          title={t("Scroll to top")}>
          <RxChevronUp className="w-6! h-6! text-black!" />
        </button>
      )}
    </div>
  );
}
