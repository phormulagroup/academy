import axios from "axios";
import BialSpin from "../../../components/bialSpin";
import { useEffect, useState, useCallback } from "react";
import { Button, Empty, Progress, Tabs } from "antd";
import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import CourseContent from "./content";
import CourseMaterial from "./material";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";
import useScrollToTop from "../../../utils/scrollToTop";
import { courseMaterials } from "../../../utils/materials";
import {
  courseDateState,
  isAllowedByCountry,
  isCourseFailed,
  testDateState,
} from "../../../utils/courseStatus";

import i18n from "../../../utils/i18n";
import {
  PiFlagLight,
  PiFileTextLight,
  PiBookBookmark,
  PiBookOpenLight,
} from "react-icons/pi";
import { RxChevronUp } from "react-icons/rx";
import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai";
import CourseObjection from "./objection/objection";
import { Helmet } from "react-helmet";
import { hasFullAccess } from "../../../utils/roles";

export default function CourseDetails() {
  const { user, languages, toastApi, windowDimension } = useContext(Context);
  const { isVisible: showScrollToTop, scrollToTop } = useScrollToTop();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({});
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [activeKey, setActiveKey] = useState("1");

  let { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Mesmas regras do catálogo: restrição de países para alunos e admin; validade (datas) só para alunos
  const canAccess = useCallback(
    (obj) => {
      const countries = obj.settings?.country_limit
        ? obj.settings.country
        : null;
      if (!isAllowedByCountry(countries, user)) return false;
      return hasFullAccess(user) || courseDateState(obj) === "active";
    },
    [user],
  );

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(endpoints.course.readBySlug, {
          params: {
            slug,
            id_user: user.id,
            id_lang: languages.filter((_l) => _l.code === i18n.language)[0].id,
            id_role: user.id_role,
          },
        });

        if (res.data.course.length > 0) {
          let auxCourse = res.data.course[0];
          auxCourse.settings = auxCourse.settings
            ? JSON.parse(auxCourse.settings)
            : null;
          if (!canAccess(auxCourse)) auxCourse = null;
          if (auxCourse) {
            // Alunos: testes expirados saem do eLearning, logo também dos módulos e do progresso
            const allTests = res.data.tests.filter((_t) => _t.is_deleted !== 1);
            const visibleTests =
              hasFullAccess(user)
                ? res.data.tests
                : res.data.tests.filter(
                    (_t) => testDateState(_t) !== "expired",
                  );
            // Materiais filtrados pelos países do curso (ver utils/materials)
            auxCourse.material = auxCourse.material
              ? courseMaterials({
                  ...auxCourse,
                  material: JSON.parse(auxCourse.material),
                }, user)
              : null;
            auxCourse.objection = auxCourse.objection
              ? JSON.parse(auxCourse.objection)
              : null;

            if (res.data.modules.length > 0) {
              let auxModules = res.data.modules;
              let newModules = [];
              for (let i = 0; i < auxModules.length; i++) {
                auxModules[i].items = auxModules[i].items
                  ? JSON.parse(auxModules[i].items)
                  : null;
                if (auxModules[i].items) {
                  let filteredItems = [];
                  for (let y = 0; y < auxModules[i].items.length; y++) {
                    let itemToAdd = null;

                    if (auxModules[i].items[y].type === "topic") {
                      const topicData = res.data.topics.filter(
                        (_t) => _t.id === auxModules[i].items[y].id,
                      )[0];
                      if (topicData) {
                        itemToAdd = {
                          type: auxModules[i].items[y].type,
                          ...topicData,
                        };
                      }
                    }

                    if (auxModules[i].items[y].type === "test") {
                      const testData = visibleTests.filter(
                        (_t) => _t.id === auxModules[i].items[y].id,
                      )[0];
                      if (testData) {
                        itemToAdd = {
                          type: auxModules[i].items[y].type,
                          ...testData,
                        };
                      }
                    }

                    if (itemToAdd) {
                      filteredItems.push(itemToAdd);
                    }
                  }

                  // Only add module if it has items after filtering
                  if (filteredItems.length > 0) {
                    auxModules[i].items = filteredItems;
                    newModules.push(auxModules[i]);
                  }
                }
              }

              setModules(newModules);
              setProgress(res.data.progress);
            }

            setData({
              course: auxCourse,
              modules: res.data.modules,
              topics: res.data.topics,
              tests: visibleTests,
              allTests,
            });
          } else {
            toastApi.open({
              type: "info",
              content: t(
                "This course is not available in your country or your access period has expired.",
              ),
            });
            navigate(`/${i18n.language}/courses`, { replace: true });
          }
        } else {
          navigate(`/${i18n.language}/courses`, { replace: true });
        }
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      } catch (err) {
        console.log(err);
      }
    }

    getData();
  }, [slug, user, languages, navigate, t, toastApi, canAccess]);

  // Nº de tópicos/testes (não apagados) concluídos; cada item conta uma só vez, mesmo com registos repetidos
  function countCompletedItems() {
    const completed = new Set(
      progress
        .filter(
          (p) =>
            p.is_completed === 1 &&
            p.is_deleted !== 1 &&
            ((p.activity_type === "topic" &&
              data?.topics?.some(
                (t) => t.id === p.id_course_topic && t.is_deleted !== 1,
              )) ||
              (p.activity_type === "test" &&
                data?.tests?.some(
                  (t) => t.id === p.id_course_test && t.is_deleted !== 1,
                ))),
        )
        .map((p) =>
          p.activity_type === "topic"
            ? `topic_${p.id_course_topic}`
            : `test_${p.id_course_test}`,
        ),
    );
    return completed.size;
  }

  function calcCourseProgress(a, b, c) {
    let progressPercentage = (100 * a) / (b + c);
    const isInteger = progressPercentage % 1 === 0;
    return !isInteger
      ? (Math.round(progressPercentage * 100) / 100).toFixed(2)
      : progressPercentage;
  }

  function enroll() {
    let auxData = [
      {
        id_course: data.course.id,
        id_user: user.id,
        activity_type: "enroll",
        is_completed: 1,
        created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
    ];

    axios
      .post(endpoints.course.updateProgress, {
        data: auxData,
      })
      .then((res) => {
        console.log(res);
        setProgress((prev) => [
          ...prev,
          {
            id_course: data.course.id,
            id_user: user.id,
            activity_type: "enroll",
            is_completed: 1,
            created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
            modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          },
        ]);
        navigate(`/${i18n.language}/courses/${slug}/learning`, { state: { course: { name: data?.course?.name, thumbnail: data?.course?.thumbnail } } });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Validar se a tab Course deve aparecer (módulos com items)
  function hasCourseContent() {
    return modules && modules.length > 0;
  }

  // Validar se a tab Materials deve aparecer
  function hasMaterialContent() {
    if (!data.course || !data.course.material) return false;
    const material = data.course.material;
    if (!Array.isArray(material) || material.length === 0) return false;
    // Verificar se há pelo menos um material com arquivo válido
    return material.some(
      (m) => m && m.file && typeof m.file === "string" && m.file.trim() !== "",
    );
  }

  // Validar se a tab Objection deve aparecer
  function hasObjectionContent() {
    if (!data.course || !data.course.objection) return false;
    const objection = data.course.objection;
    if (!objection.tabs || !Array.isArray(objection.tabs)) return false;
    // Verificar se há pelo menos uma tab com items contendo conteúdo válido
    return objection.tabs.some(
      (tab) =>
        tab &&
        tab.items &&
        Array.isArray(tab.items) &&
        tab.items.length > 0 &&
        tab.items.some(
          (item) =>
            item &&
            item.title &&
            typeof item.title === "string" &&
            item.title.trim() !== "" &&
            item.text &&
            typeof item.text === "string" &&
            item.text.trim() !== "",
        ),
    );
  }

  // Estado do aluno no curso: Aprovado (curso concluído) ou Reprovado (mesma regra do relatório do backoffice)
  const courseStatus = !data.course
    ? null
    : calcCourseProgress(
          countCompletedItems(),
          data.topics?.filter((t) => t.is_deleted !== 1)?.length || 0,
          data.tests?.filter((t) => t.is_deleted !== 1)?.length || 0,
        ) === 100
      ? "approved"
      : isCourseFailed(progress, data.allTests)
        ? "failed"
        : null;

  return (
    <div className="bg-[#FFFFFF] relative">
      {data.course && (
        <Helmet>
          <meta charSet="utf-8" />
          <title>{data.course.name} - Bial Regional Academy</title>
          <meta name="description" content={data.course.name} />
          <meta property="og:title" content={data.course.name} />
          <meta property="og:description" content={data.course.name} />
        </Helmet>
      )}
      {isLoading ? (
        <div className="flex justify-center items-center w-full min-h-75 col-span-3">
          <BialSpin />
        </div>
      ) : data.course ? (
        <div>
          <div className={`page-frame`}>
            {/* Primeiro Container */}
            <div className="relative z-10 pt-4 sm:pt-8 lg:pt-10 mb-6 sm:mb-10">
              {/* Grupo 1: Nome do Curso + Thumbnail */}
              <div
                className={`grid gap-4 sm:gap-8 mb-6 sm:mb-10 ${windowDimension.width >= 768 ? "grid-cols-3" : "grid-cols-1"}`}>
                {/* Nome do Curso - 30% no desktop */}
                <div className="flex flex-col justify-center col-span-1">
                  <p className="font-ryker font-thin text-[#163986] uppercase text-[13px] sm:text-base md:text-lg lg:text-[20px]">
                    {t("Course")}
                  </p>
                  <p className="font-ryker font-bold text-[#163986] mt-1 sm:mt-2 line-clamp-3 leading-[1.2] text-[20px] sm:text-[24px] md:text-[26px] lg:text-[32px] xl:text-[42px]">
                    {data.course?.name}
                  </p>
                </div>

                {/* Thumbnail - 70% no desktop - altura dinâmica */}
                {/* Banner 12:5 na proporção natural (sem altura fixa nem object-cover, a imagem não é cortada) */}
                <div className="col-span-2">
                  <img
                    src={`${config.server_ip}/media/${data.course?.img}`}
                    className="w-full h-auto rounded-[5px]"
                    alt={data.course?.name}
                  />
                </div>
              </div>

              {/* Grupo 2: Progress Bar */}
              <div className="bg-[#C5CEE1] p-3 sm:p-5 lg:p-6 rounded-[5px]">
                <div className="flex flex-col gap-4 sm:gap-6">
                  {/* Flex row para icon + progress content */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                    {/* Flag Icon */}
                    <div className="hidden sm:flex">
                      <PiFlagLight className="text-[#163986] w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                    </div>

                    {/* Progress Content */}
                    {progress.length > 0 ? (
                      <div className="flex-1 flex flex-col lg:flex-row w-full gap-4 lg:gap-6 items-center border-0 sm:border-l sm:pl-6 border-l-[#163986]">
                        <div className="flex-1 flex flex-col w-full">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start mb-3 gap-2 sm:gap-4">
                            <p className="text-[#163986] font-bold uppercase whitespace-nowrap text-sm sm:text-base md:text-lg lg:text-xl">
                              {calcCourseProgress(
                                countCompletedItems(),
                                data?.topics?.filter((t) => t.is_deleted !== 1)
                                  ?.length || 0,
                                data?.tests?.filter((t) => t.is_deleted !== 1)
                                  ?.length || 0,
                              )}
                              % {t("Completed")}
                            </p>
                            {courseStatus && (
                              <span
                                className={`course-status-badge ${courseStatus === "failed" ? "is-failed" : "is-approved"}`}>
                                {courseStatus === "failed" ? (
                                  <AiOutlineClose className="shrink-0" />
                                ) : (
                                  <AiOutlineCheck className="shrink-0" />
                                )}
                                {courseStatus === "failed"
                                  ? t("Failed")
                                  : t("Approved")}
                              </span>
                            )}
                            {progress.length > 0 && (
                              <p className="text-[#163986] whitespace-nowrap text-xs sm:text-[12px] md:text-[13px] lg:text-[14px]">
                                {t("Last activity at")}{" "}
                                {progress[progress.length - 1]
                                  ? dayjs(
                                      progress[progress.length - 1].created_at,
                                    ).format("DD/MM/YYYY HH:mm")
                                  : ""}
                              </p>
                            )}
                          </div>
                          <Progress
                            strokeColor={"#2F8351"}
                            railColor={"#FFF"}
                            percent={
                              (100 * countCompletedItems()) /
                              ((data?.topics?.filter((t) => t.is_deleted !== 1)
                                ?.length || 0) +
                                (data?.tests?.filter((t) => t.is_deleted !== 1)
                                  ?.length || 0))
                            }
                            className="w-full!"
                            showInfo={false}
                          />
                        </div>
                        {calcCourseProgress(
                          countCompletedItems(),
                          data?.topics?.filter((t) => t.is_deleted !== 1)
                            ?.length || 0,
                          data?.tests?.filter((t) => t.is_deleted !== 1)
                            ?.length || 0,
                        ) === 100 ? (
                          <Button
                            className="min-w-50 main-cta-button w-1/2 lg:w-auto text-xs sm:text-sm md:text-base"
                            color="#163986"
                            variant="solid"
                            size="large"
                            onClick={() =>
                              navigate(`/${i18n.language}/courses/${slug}/learning`, {
                                state: { course: { name: data?.course?.name, thumbnail: data?.course?.thumbnail } },
                              })
                            }>
                            {t("Review")}
                          </Button>
                        ) : progress.filter((p) => p.activity_type === "enroll")
                            .length === 0 ? (
                          <Button
                            className="min-w-50 main-cta-button w-1/2 lg:w-auto text-xs sm:text-sm md:text-base"
                            variant="solid"
                            size="large"
                            onClick={() => enroll()}>
                            {t("Start")}
                          </Button>
                        ) : (
                          <Button
                            className="min-w-50 main-cta-button w-1/2 lg:w-auto text-xs sm:text-sm md:text-base"
                            color="black"
                            variant="solid"
                            size="large"
                            onClick={() =>
                              navigate(`/${i18n.language}/courses/${slug}/learning`, {
                                state: { course: { name: data?.course?.name, thumbnail: data?.course?.thumbnail } },
                              })
                            }>
                            {t("Enter")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col sm:flex-row w-full justify-start sm:justify-between items-center sm:items-center gap-4 border-0 sm:border-l sm:pl-6 border-l-[#163986]">
                        <p className="font-bold text-[#163986] text-sm sm:text-base md:text-lg lg:text-xl">
                          {t("Not started")}
                        </p>
                        <Button
                          className="min-w-50 main-cta-button w-1/2 lg:w-auto text-xs sm:text-sm md:text-base"
                          variant="solid"
                          size="large"
                          onClick={() => enroll()}>
                          {t("Start")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Segundo container */}
            {(hasCourseContent() ||
              hasMaterialContent() ||
              hasObjectionContent()) && (
              <div className="mt-6 sm:mt-8">
                <Tabs
                  defaultActiveKey={
                    hasCourseContent() ? "1" : hasMaterialContent() ? "2" : "3"
                  }
                  centered={windowDimension.width < 768}
                  items={[
                    ...(hasCourseContent()
                      ? [
                          {
                            key: "1",
                            label: (
                              <div className="group flex flex-col lg:flex-row p-2 justify-center items-center">
                                <PiFileTextLight
                                  className={`transition w-5 h-5 lg:w-6 lg:h-6 lg:mr-2 ${activeKey === "1" ? "text-[#163986]" : "text-[#8B9CC3] group-hover:text-[#163986]"}`}
                                />
                                <p
                                  className={`font-bold mt-1 lg:mt-0 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[17px] transition ${activeKey === "1" ? "text-[#163986]" : "text-[#8B9CC3] group-hover:text-[#163986]"}`}>
                                  {t("Course")}
                                </p>
                              </div>
                            ),
                            children: (
                              <div className="w-screen bg-[#F1F9FF] -ml-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2)] py-4 sm:py-5 lg:py-6">
                                {/* Módulos em modo compacto, iguais aos dos Resultados do perfil */}
                                <CourseContent
                                  modules={modules}
                                  progress={progress}
                                  data={data}
                                  compact
                                />
                              </div>
                            ),
                          },
                        ]
                      : []),
                    ...(hasMaterialContent()
                      ? [
                          {
                            key: "2",
                            label: (
                              <div className="group flex flex-col lg:flex-row p-2 justify-center items-center">
                                <PiBookBookmark
                                  className={`transition w-5 h-5 lg:w-6 lg:h-6 lg:mr-2 ${activeKey === "2" ? "text-[#163986]" : "text-[#8B9CC3] group-hover:text-[#163986]"}`}
                                />
                                <p
                                  className={`font-bold mt-1 lg:mt-0 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[17px] transition ${activeKey === "2" ? "text-[#163986]" : "text-[#8B9CC3] group-hover:text-[#163986]"}`}>
                                  {t("Materials")}
                                </p>
                              </div>
                            ),
                            children: (
                              <div className="w-screen bg-[#F1F9FF] -ml-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2)] py-6 course-tab-materials">
                                <CourseMaterial data={data.course} />
                              </div>
                            ),
                          },
                        ]
                      : []),
                    ...(hasObjectionContent()
                      ? [
                          {
                            key: "3",
                            label: (
                              <div className="group flex flex-col lg:flex-row p-2 justify-center items-center">
                                <PiBookOpenLight
                                  className={`transition w-5 h-5 lg:w-6 lg:h-6 lg:mr-2 ${activeKey === "3" ? "text-[#163986]" : "text-[#8B9CC3] group-hover:text-[#163986]"}`}
                                />
                                <p
                                  className={`font-bold mt-1 lg:mt-0 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[17px] transition ${activeKey === "3" ? "text-[#163986]" : "text-[#8B9CC3] group-hover:text-[#163986]"}`}>
                                  {t("Objection books")}
                                </p>
                              </div>
                            ),
                            children: (
                              <div className="w-screen bg-[#F1F9FF] -ml-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2)] py-6">
                                <CourseObjection data={data.course} />
                              </div>
                            ),
                          },
                        ]
                      : []),
                  ]}
                  onChange={(key) => {
                    setActiveKey(key);
                  }}
                  indicator={{ size: (origin) => origin - 20, align: "center" }}
                />
              </div>
            )}
          </div>
          <div className="flex w-full bg-[#F7F7F7]">
            <div className="page-frame">
              <div className="flex flex-col"></div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Empty
            style={{ color: "#163986", textAlign: "center", padding: "2rem" }}
          />
        </div>
      )}
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
