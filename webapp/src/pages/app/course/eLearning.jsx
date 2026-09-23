import React, { useContext, useEffect, useState } from "react";
import { MenuOutlined } from "@ant-design/icons";
import { Button, Collapse, Drawer, Layout, Modal, Progress, Tabs } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import endpoints from "../../../utils/endpoints";

import { Context } from "../../../utils/context";

import Logout from "../../../components/logout";
import { useTranslation } from "react-i18next";
import {
  AiFillCloseCircle,
  AiOutlineArrowDown,
  AiOutlineArrowUp,
  AiOutlineCheck,
  AiFillCaretLeft,
  AiFillCaretRight,
} from "react-icons/ai";
import {
  RxChevronRight,
  RxChevronLeft,
  RxExclamationTriangle,
  RxLockClosed,
} from "react-icons/rx";
import { FaListCheck } from "react-icons/fa6";
import {
  PiFileTextLight,
  PiBookBookmark,
  PiBookOpenLight,
} from "react-icons/pi";

import dayjs from "dayjs";
import Topic from "./topic";
import Test from "./test";

import logo from "../../../assets/BIAL-Regional-Academy.png";
import Module from "./module";
import { ArrowLeft, ArrowRight } from "lucide-react";

import CourseMaterial from "./material";
import CourseObjection from "./objection/objection";
import { Helmet } from "react-helmet";

const { confirm } = Modal;

const { Header, Content, Sider } = Layout;

const Learning = () => {
  const { user, logout, languages, windowDimension } = useContext(Context);
  const [isOpenDrawerMenu, setIsOpenDrawerMenu] = useState(false);
  const [isOpenLogout, setIsOpenLogout] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCourseItem, setSelectedCourseItem] = useState(null);
  const [data, setData] = useState(null);
  const [modules, setModules] = useState(null);
  const [allItems, setAllItems] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [allowNext, setAllowNext] = useState(false);
  const [metaData, setMetaData] = useState(null);
  const [activeModule, setActiveModule] = useState([]);
  const [activeKey, setActiveKey] = useState("1");

  const { t, i18n } = useTranslation();

  const location = useLocation();

  const navigate = useNavigate();

  const { slug } = useParams();

  useEffect(() => {
    getData();
  }, [slug]);

  useEffect(() => {
    calcProgress();
  }, [progress]);

  useEffect(() => {
    if (selectedCourseItem)
      setActiveModule([
        selectedCourseItem?.type
          ? selectedCourseItem.id_course_module
          : selectedCourseItem.id,
      ]);
  }, [selectedCourseItem]);

  async function getData() {
    try {
      // Admins can access courses from any language (use current UI language)
      // Users are restricted to their assigned language
      const isAdmin = user.id_role === 1;
      const selectedLangId = isAdmin
        ? languages.filter((_l) => _l.code === i18n.language)[0].id
        : user.id_lang;

      const res = await axios.get(endpoints.course.readBySlug, {
        params: {
          slug,
          id_user: user.id,
          id_lang: selectedLangId,
          id_role: user.id_role,
        },
      });
      if (res.data.course.length > 0) {
        let auxCourse = res.data.course[0];
        auxCourse.settings = auxCourse.settings
          ? JSON.parse(auxCourse.settings)
          : null;

        // Admins (id_role = 1) can access all courses regardless of restrictions
        const isAdmin = user.id_role === 1;

        if (
          !isAdmin &&
          auxCourse.settings &&
          auxCourse.settings.country_limit &&
          !auxCourse.settings.country.includes(user.country)
        )
          auxCourse = null;
        if (
          !isAdmin &&
          auxCourse.settings &&
          auxCourse.settings.course_access_expiration &&
          canAccess(auxCourse.settings)
        )
          auxCourse = null;
        if (auxCourse) {
          auxCourse.material = auxCourse.material
            ? JSON.parse(auxCourse.material)
            : null;
          auxCourse.objection = auxCourse.objection
            ? JSON.parse(auxCourse.objection)
            : null;

          let auxAllItems = [];

          if (res.data.modules.length > 0) {
            let auxModules = res.data.modules.sort(
              (a, b) => (a.position ?? 0) - (b.position ?? 0),
            );
            let newModules = [];
            for (let i = 0; i < auxModules.length; i++) {
              auxModules[i].items = auxModules[i].items
                ? JSON.parse(auxModules[i].items).sort(
                    (a, b) => (a.position ?? 0) - (b.position ?? 0),
                  )
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
                    const testData = res.data.tests.filter(
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
                    auxAllItems.push(itemToAdd);
                  }
                }

                // Apenas adiciona o módulo se ele tiver itens após o filtro
                if (filteredItems.length > 0) {
                  auxModules[i].items = filteredItems;
                  newModules.push(auxModules[i]);
                }
              }
            }

            if (
              location.state &&
              location.state.courseItemId &&
              location.state.courseItemType
            ) {
              if (location.state.courseItemType === "module")
                selectCourseItem(
                  res.data.modules.filter(
                    (item) => item.id === location.state.courseItemId,
                  )[0],
                );
              else if (location.state.courseItemType === "topic")
                selectCourseItem(
                  auxAllItems.filter(
                    (item) =>
                      item.id === location.state.courseItemId &&
                      item.type === location.state.courseItemType,
                  )[0],
                );
              else if (location.state.courseItemType === "test")
                selectCourseItem(
                  auxAllItems.filter(
                    (item) =>
                      item.id === location.state.courseItemId &&
                      item.type === location.state.courseItemType,
                  )[0],
                );
            } else {
              selectCourseItem(auxAllItems[0]);
            }

            setData({
              course: auxCourse,
              modules: res.data.modules,
              topics: res.data.topics,
              tests: res.data.tests,
            });
            setModules(newModules);
            setProgress(res.data.progress);
            setAllItems(auxAllItems);
          }
        } else {
          navigate(`/${i18n.language}/courses`, { replace: true });
        }
      } else {
        navigate(`/${i18n.language}/courses`, { replace: true });
      }
    } catch (err) {
      console.log(err);
    }
  }

  function canAccess(obj) {
    // Admins bypass access expiration checks
    if (user.id_role === 1) return false;

    // Check if course access has expired based on end_date
    if (
      obj.course_access_expiration_dates &&
      obj.course_access_expiration_dates.end_date
    ) {
      const endDate = dayjs(obj.course_access_expiration_dates.end_date);
      return dayjs().isAfter(endDate); // true if expired (after end date)
    }
    return false;
  }

  // Check if a module is truly completed based on its actual items
  function isModuleCompleted(module) {
    if (!module || !module.items || module.items.length === 0) {
      return false; // Module with no items is not completed
    }

    // All items in the module must be completed
    return module.items.every((item) => {
      const itemProgress = progress?.filter(
        (p) =>
          p.is_completed === 1 &&
          p.is_deleted !== 1 &&
          p.activity_type === item.type &&
          p[`id_course_${item.type}`] === item.id,
      );
      return itemProgress && itemProgress.length > 0;
    });
  }

  function isCourseCompleted(simulatedProgress = null) {
    if (!data || !modules || !allItems) {
      return false;
    }

    // Determinar o progresso a ser verificado (simulado ou atual)
    const progressToCheck = simulatedProgress || progress;

    if (!progressToCheck) {
      return false;
    }

    const completedModules = modules.filter((module) =>
      isModuleCompleted(module),
    ).length;
    const completedTopics = progressToCheck.filter(
      (p) => p.activity_type === "topic" && p.is_completed === 1,
    ).length;
    const completedTests = progressToCheck.filter(
      (p) => p.activity_type === "test" && p.is_completed === 1,
    ).length;

    const totalModules = modules.length;
    // Count topics and tests from allItems (already filtered based on user role)
    const totalTopics = allItems.filter((item) => item.type === "topic").length;
    const totalTests = allItems.filter((item) => item.type === "test").length;

    // Determinar se é necessário verificar a conclusão de módulos, tópicos e testes
    const needToCheckModules = totalModules > 0;
    const needToCheckTopics = totalTopics > 0;
    const needToCheckTests = totalTests > 0;

    const allModulesCompleted =
      !needToCheckModules || completedModules === totalModules;
    const allTopicsCompleted =
      !needToCheckTopics || completedTopics === totalTopics;
    const allTestsCompleted =
      !needToCheckTests || completedTests === totalTests;

    /**
     * Retorna verdadeiro apenas se todos os módulos, tópicos e testes necessários estiverem concluídosRetorna verdadeiro apenas se todos os módulos, tópicos e testes necessários estiverem concluídos
     * course is_completed = 1
     */
    return allModulesCompleted && allTopicsCompleted && allTestsCompleted;
  }

  function selectCourseItem(item) {
    setSelectedCourseItem(item);
    // Only close drawer when selecting an actual topic/test item, not module headers
    if (item.type && windowDimension.width < 1080) {
      closeDrawer();
    }
  }

  function next(changeItem, itemMetaData) {
    let auxData = [];
    const moduleSelectedCourseItem = modules.filter(
      (m) => m.id === selectedCourseItem.id_course_module,
    )[0];
    let findInProgress = progress.filter(
      (p) =>
        p[`id_course_${selectedCourseItem.type}`] === selectedCourseItem.id &&
        p.is_completed === 1 &&
        p.is_deleted !== 1,
    );
    let goToNextModule = false;
    let courseCompleted = false;
    if (findInProgress.length === 0) {
      // contar os itens completados no módulo após adicionar o item atual
      const completedItemsInModule =
        progress.filter(
          (p) =>
            p.id_course_module === moduleSelectedCourseItem.id &&
            p.activity_type !== "module" &&
            p.is_completed === 1 &&
            p.is_deleted !== 1,
        ).length + 1; // +1 para incluir o item atual

      // Verifica se todos os itens do módulo serão completados após adicionar o item atual
      const allModuleItemsCompleted =
        completedItemsInModule === moduleSelectedCourseItem.items.length;

      // Verifica se o módulo ainda não foi marcado como completo
      const moduleNotYetCompleted =
        progress.filter(
          (p) =>
            p.id_course_module === moduleSelectedCourseItem.id &&
            p.activity_type === "module" &&
            p.is_completed === 1 &&
            p.is_deleted !== 1,
        ).length === 0;

      if (allModuleItemsCompleted && moduleNotYetCompleted) {
        // Marcar o módulo como completo apenas quando TODOS os itens estiverem concluídos
        auxData = [
          {
            id_course: data.course.id,
            id_user: user.id,
            activity_type:
              selectedCourseItem.type === "topic" ? "topic" : "test",
            id_course_topic:
              selectedCourseItem.type === "topic"
                ? selectedCourseItem.id
                : null,
            id_course_test:
              selectedCourseItem.type === "test" ? selectedCourseItem.id : null,
            id_course_module: moduleSelectedCourseItem.id,
            is_completed: 1,
            meta_data: itemMetaData ? JSON.stringify(itemMetaData) : null,
            created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
            modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          },
          {
            id_course: data.course.id,
            id_user: user.id,
            activity_type: "module",
            id_course_topic: null,
            id_course_test: null,
            id_course_module: moduleSelectedCourseItem.id,
            is_completed: 1,
            created_at: dayjs().add(2, "s").format("YYYY-MM-DD HH:mm:ss"),
            modified_at: dayjs().add(2, "s").format("YYYY-MM-DD HH:mm:ss"),
          },
        ];

        // Verifica se este é o último módulo do curso
        // Simula o progresso após adicionar o item atual para verificar conclusão do curso
        const simulatedProgress = [...progress, ...auxData];
        if (isCourseCompleted(simulatedProgress)) {
          auxData.push({
            id_course: data.course.id,
            id_user: user.id,
            activity_type: "course",
            id_course_topic: null,
            id_course_test: null,
            id_course_module: null,
            is_completed: 1,
            created_at: dayjs().add(5, "s").format("YYYY-MM-DD HH:mm:ss"),
            modified_at: dayjs().add(5, "s").format("YYYY-MM-DD HH:mm:ss"),
          });

          courseCompleted = true;
        }

        goToNextModule = true;
      } else {
        auxData = [
          {
            id_course: data.course.id,
            id_user: user.id,
            activity_type:
              selectedCourseItem.type === "topic" ? "topic" : "test",
            id_course_topic:
              selectedCourseItem.type === "topic"
                ? selectedCourseItem.id
                : null,
            id_course_test:
              selectedCourseItem.type === "test" ? selectedCourseItem.id : null,
            id_course_module: moduleSelectedCourseItem.id,
            is_completed: 1,
            meta_data: itemMetaData ? JSON.stringify(itemMetaData) : null,
            created_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
            modified_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          },
        ];
      }

      axios
        .post(endpoints.course.updateProgress, {
          data: auxData,
        })
        .then((res) => {
          let newProgress = Object.assign([], progress);
          newProgress = [...newProgress, ...auxData];
          if (changeItem === undefined || changeItem !== false) {
            if (goToNextModule) {
              const indexOfSelectedItem = modules.findIndex(
                (m) => m.id === selectedCourseItem.id_course_module,
              );
              if (modules[indexOfSelectedItem + 1])
                setSelectedCourseItem(modules[indexOfSelectedItem + 1]);
              else {
                if (courseCompleted)
                  navigate(`/${i18n.language}/courses/${slug}`, {
                    replace: true,
                  });
              }
            } else {
              let indexOfSelectedItem =
                moduleSelectedCourseItem.items.findIndex(
                  (m) => m.id === selectedCourseItem.id,
                );
              setSelectedCourseItem(
                moduleSelectedCourseItem.items[indexOfSelectedItem + 1],
              );
            }
          }
          setProgress(newProgress);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      // O item já está concluído, apenas navegua para o próximo
      const completedItemsInModule = progress.filter(
        (p) =>
          p.id_course_module === moduleSelectedCourseItem.id &&
          p.activity_type !== "module" &&
          p.is_completed === 1 &&
          p.is_deleted !== 1,
      ).length;

      const allModuleItemsCompleted =
        completedItemsInModule === moduleSelectedCourseItem.items.length;

      if (allModuleItemsCompleted) {
        // Todos os itens já estão concluídos, vai para o próximo módulo
        const indexOfSelectedItem = modules.findIndex(
          (m) => m.id === selectedCourseItem.id_course_module,
        );
        if (modules[indexOfSelectedItem + 1])
          setSelectedCourseItem(modules[indexOfSelectedItem + 1]);
        else console.log("Last module completed");
      } else {
        // Nem todos os itens estão concluídos, vai para o próximo item no módulo
        let indexOfSelectedItem = moduleSelectedCourseItem.items.findIndex(
          (m) => m.id === selectedCourseItem.id,
        );
        setSelectedCourseItem(
          moduleSelectedCourseItem.items[indexOfSelectedItem + 1],
        );
      }
    }
  }

  function previous() {
    const moduleSelectedCourseItem = modules.filter(
      (m) => m.id === selectedCourseItem.id_course_module,
    )[0];
    const findIndexModule = modules.findIndex(
      (m) => m.id === moduleSelectedCourseItem.id,
    );
    let indexOfSelectedItem = moduleSelectedCourseItem.items.findIndex(
      (m) => m.id === selectedCourseItem.id,
    );
    if (findIndexModule === 0) {
      if (indexOfSelectedItem > 0) {
        setSelectedCourseItem(
          moduleSelectedCourseItem.items[indexOfSelectedItem - 1],
        );
      } else {
        confirm({
          title: t("Voltar para a página de curso?"),
          icon: <RxExclamationTriangle />,
          content: t("Como se encontra no primeiro"),
          okText: "Yes",
          okButtonProps: { background: "blue" },
          onOk() {
            navigate(`/${i18n.language}/courses/${slug}`);
          },
          onCancel() {
            console.log("Cancel");
          },
        });
      }
    } else {
      if (indexOfSelectedItem === 0) {
        setSelectedCourseItem(
          modules[findIndexModule - 1].items[
            modules[findIndexModule - 1].items.length - 1
          ],
        );
      } else {
        setSelectedCourseItem(
          moduleSelectedCourseItem.items[indexOfSelectedItem - 1],
        );
      }
    }
  }

  function calcProgress() {
    const completed = progress?.filter(
      (p) =>
        (p.activity_type === "topic" || p.activity_type === "test") &&
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
    ).length;
    const total = allItems?.length || 0;
    setProgressPercentage(
      total > 0 ? ((100 * completed) / total).toFixed(2) : 0,
    );
  }

  function updateProgress(newObj) {
    setProgress([...progress, newObj]);
  }

  function closeDrawer() {
    setIsOpenDrawerMenu(false);
  }

  return (
    <Layout>
      {!selectedCourseItem && data?.course && (
        <Helmet>
          <meta charSet="utf-8" />
          <title>{data.course.name}</title>
          <meta name="description" content={data.course.name} />
          <meta property="og:title" content={data.course.name} />
          <meta property="og:description" content={data.course.name} />
        </Helmet>
      )}
      <Logout
        open={isOpenLogout}
        close={() => setIsOpenLogout(false)}
        submit={logout}
      />
      <Header
        className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center"
        style={{
          paddingLeft:
            windowDimension.width >= 1024
              ? "50px"
              : windowDimension.width >= 768
                ? "24px"
                : "16px",
          paddingRight:
            windowDimension.width >= 1024
              ? "50px"
              : windowDimension.width >= 768
                ? "24px"
                : "16px",
          height: "auto",
          minHeight: windowDimension.width > 1080 ? "80px" : "auto",
        }}>
        <div className="flex justify-center items-center w-full">
          {windowDimension.width > 1080 ? (
            <div className="grid grid-cols-3 gap-4 w-full">
              <div>
                <img
                  src={logo}
                  className="max-h-13.5 cursor-pointer"
                  onClick={() =>
                    navigate(`/${i18n.language}/courses/${slug}`, {
                      replace: true,
                    })
                  }
                />
              </div>
              <div className="flex flex-col justify-center items-center">
                <div className="w-full flex justify-between items-center mb-2">
                  <p
                    className="leading-[1em] font-bold uppercase text-[#163986]"
                    style={{
                      fontSize:
                        windowDimension.width >= 1440
                          ? "24px"
                          : windowDimension.width >= 1225
                            ? "22px"
                            : windowDimension.width >= 1081
                              ? "20px"
                              : "18px",
                    }}>
                    {progressPercentage}% {t("Completed")}
                  </p>
                  <p className="leading-1 text-[12px] lg:text-[14px] text-[#8B9CC3]">
                    {allItems?.filter((item) =>
                      progress?.some(
                        (p) =>
                          p.is_completed === 1 &&
                          p.is_deleted !== 1 &&
                          ((p.activity_type === "topic" &&
                            item.type === "topic" &&
                            p.id_course_topic === item.id) ||
                            (p.activity_type === "test" &&
                              item.type === "test" &&
                              p.id_course_test === item.id)),
                      ),
                    ).length || 0}{" "}
                    / {allItems?.length || 0} {t("Steps")}
                  </p>
                </div>
                <Progress
                  strokeColor={"#2F8351"}
                  percent={progressPercentage}
                  className="w-full"
                  showInfo={false}
                />
              </div>
              <div className="flex justify-end items-center">
                <Button
                  size="large"
                  icon={<RxChevronLeft />}
                  className="button-back-learning-header mr-4"
                  onClick={() => navigate(`/${i18n.language}/courses/${slug}`)}>
                  {t("Back to course")}
                </Button>
                {selectedCourseItem?.type && (
                  <>
                    {allItems &&
                      allItems.length > 0 &&
                      selectedCourseItem.id !== allItems[0].id && (
                        <Button
                          size="large"
                          icon={<RxChevronLeft />}
                          className="button-learning-header mr-2"
                          onClick={() => previous()}>
                          {windowDimension.width >= 1081 &&
                          windowDimension.width < 1270
                            ? ""
                            : t("Previous")}
                        </Button>
                      )}
                    <Button
                      size="large"
                      icon={<RxChevronRight />}
                      iconPlacement="end"
                      className="button-learning-header"
                      onClick={() => next()}
                      disabled={!allowNext && user.id_role !== 1}>
                      {windowDimension.width >= 1081 &&
                      windowDimension.width < 1270
                        ? ""
                        : t("Next")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : windowDimension.width <= 768 ? (
            // Mobile Header (≤ 768px)
            <div className="flex justify-between items-center w-full gap-2">
              {/* Group 1: Progress information */}
              <div className="flex items-center gap-4">
                {/* Progress bar - FIRST */}
                <div
                  className="bg-[#C5CEE1] rounded-full overflow-hidden"
                  style={{
                    height: "12px",
                    width:
                      windowDimension.width <= 375
                        ? "100px"
                        : windowDimension.width >= 376 &&
                            windowDimension.width <= 499
                          ? "140px"
                          : windowDimension.width >= 500 &&
                              windowDimension.width <= 650
                            ? "220px"
                            : windowDimension.width >= 651 &&
                                windowDimension.width <= 768
                              ? "250px"
                              : "50px",
                    flexShrink: 0,
                  }}>
                  <div
                    className="h-full bg-[#2F8351] transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {/* Progress percentage label - SECOND */}
                <p
                  className="font-bold uppercase text-[#163986] shrink-0 whitespace-nowrap"
                  style={{
                    fontSize:
                      windowDimension.width < 375
                        ? "12px"
                        : windowDimension.width < 425
                          ? "13px"
                          : windowDimension.width < 640
                            ? "14px"
                            : "15px",
                  }}>
                  {progressPercentage}% {t("Completed")}
                </p>

                {/* Steps label - Visible only from 550px and up */}
                {windowDimension.width >= 550 && (
                  <p
                    className="text-[#8B9CC3] shrink-0 font-medium"
                    style={{
                      fontSize: "13px",
                    }}>
                    {allItems?.filter((item) =>
                      progress?.some(
                        (p) =>
                          p.is_completed === 1 &&
                          p.is_deleted !== 1 &&
                          ((p.activity_type === "topic" &&
                            item.type === "topic" &&
                            p.id_course_topic === item.id) ||
                            (p.activity_type === "test" &&
                              item.type === "test" &&
                              p.id_course_test === item.id)),
                      ),
                    ).length || 0}{" "}
                    / {allItems?.length || 0} {t("Steps")}
                  </p>
                )}
              </div>

              {/* Group 2: Mobile menu */}
              <MenuOutlined
                className="text-xl shrink-0"
                style={{ color: "#163986", cursor: "pointer" }}
                onClick={() => (
                  setIsOpenDrawerMenu(true),
                  console.log("Drawer Mobile menu opened")
                )}
              />
            </div>
          ) : windowDimension.width <= 1080 ? (
            // Mobile/Tablet Header (550px to 1080px) - Single horizontal row
            <div className="flex justify-between items-center w-full gap-2">
              {/* Group 1: Progress information (single row) */}
              <div className="flex items-center gap-4">
                {/* Progress bar */}
                <div
                  className="bg-[#C5CEE1] rounded-full overflow-hidden"
                  style={{
                    height: "12px",
                    width:
                      windowDimension.width < 550
                        ? "50px"
                        : windowDimension.width < 650
                          ? "220px"
                          : windowDimension.width < 768
                            ? "250px"
                            : windowDimension.width < 850
                              ? "280px"
                              : "300px",
                    flexShrink: 0,
                  }}>
                  <div
                    className="h-full bg-[#2F8351] transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {/* % completed label */}
                <p
                  className="font-bold uppercase text-[#163986] shrink-0 whitespace-nowrap"
                  style={{
                    fontSize:
                      windowDimension.width < 550
                        ? "12px"
                        : windowDimension.width < 768
                          ? "14px"
                          : windowDimension.width < 850
                            ? "16px"
                            : windowDimension.width < 1081
                              ? "18px"
                              : "20px",
                  }}>
                  {progressPercentage}% {t("Completed")}
                </p>

                {/* Steps label - visible from 550px and up */}
                {windowDimension.width >= 550 && (
                  <p
                    className="text-[#8B9CC3] shrink-0 font-medium"
                    style={{
                      fontSize: "13px",
                    }}>
                    {allItems?.filter((item) =>
                      progress?.some(
                        (p) =>
                          p.is_completed === 1 &&
                          p.is_deleted !== 1 &&
                          ((p.activity_type === "topic" &&
                            item.type === "topic" &&
                            p.id_course_topic === item.id) ||
                            (p.activity_type === "test" &&
                              item.type === "test" &&
                              p.id_course_test === item.id)),
                      ),
                    ).length || 0}{" "}
                    / {allItems?.length || 0} {t("Steps")}
                  </p>
                )}
              </div>

              {/* Group 2: Mobile/tablet menu */}
              <MenuOutlined
                className="text-xl shrink-0"
                style={{ color: "#163986", cursor: "pointer" }}
                onClick={() => (
                  setIsOpenDrawerMenu(true),
                  console.log("Drawer Mobile menu opened")
                )}
              />
            </div>
          ) : null}
        </div>
      </Header>

      <Layout>
        {windowDimension.width > 1080 ? (
          <Sider
            width={windowDimension.width > 1225 ? 400 : 350}
            className="bg-white! overflow-auto learning-sider"
            collapsed={collapsed}>
            {!collapsed && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col w-full p-6 bg-[#163986]">
                  <p className="text-white">{t("Course")}</p>
                  <p className="text-[20px] font-bold text-white">
                    {data?.course?.name}
                  </p>
                </div>
                <div className="w-full bg-[#FFFFFF]">
                  {modules?.length > 0 && (
                    <Collapse
                      className="collapse-learning"
                      size="large"
                      bordered={false}
                      activeKey={activeModule}
                      onChange={(keys) =>
                        setActiveModule(
                          keys.length > 0 ? keys[keys.length - 1] : [],
                        )
                      }
                      items={modules.map((item, mInd) => {
                        return {
                          key: item.id,
                          label: (
                            <div className="flex flex-col">
                              <div className="p-2 cursor-pointer flex items-center">
                                {isModuleCompleted(item) ? (
                                  <div
                                    className={`w-6.25 h-6.25  min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                    <AiOutlineCheck className="text-white" />
                                  </div>
                                ) : (
                                  <div
                                    className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                )}
                                <p
                                  className={`text-sm text-[#163986] ml-2 ${selectedCourseItem?.type && selectedCourseItem?.id_course_module === item.id ? "font-bold" : "font-medium"}`}
                                  onClick={() => selectCourseItem(item)}>
                                  {item.title}
                                </p>
                                {data?.course?.settings.progression_type ===
                                "linear"
                                  ? mInd > 0 &&
                                    progress.filter(
                                      (p) =>
                                        p.activity_type === "module" &&
                                        p.id_course_module ===
                                          modules[mInd - 1].id,
                                    ).length === 0 && (
                                      <div className="flex justify-center items-center ml-4">
                                        <RxLockClosed className="w-3.75 h-3.75" />
                                      </div>
                                    )
                                  : null}
                              </div>
                            </div>
                          ),
                          children: (
                            <div className="flex flex-col">
                              {item.items.map((_t, _i) => (
                                <div
                                  onClick={() => selectCourseItem(_t)}
                                  className="p-2 pl-6 cursor-pointer flex items-center gap-2">
                                  {progress.length > 0 &&
                                  progress.filter(
                                    (p) =>
                                      p.is_completed &&
                                      p.is_deleted !== 1 &&
                                      p[`id_course_${_t.type}`] === _t.id,
                                  ).length > 0 ? (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center shrink-0`}>
                                      <AiOutlineCheck className="text-white" />
                                    </div>
                                  ) : (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351] shrink-0`}></div>
                                  )}
                                  {_t.type === "test" && (
                                    <FaListCheck className="text-[#163986] shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                                  )}
                                  <p
                                    className={`text-sm text-[#163986] ${selectedCourseItem?.id === _t.id ? "font-bold" : "font-normal"}`}>
                                    {_t.title}
                                  </p>
                                  {data?.course?.settings.progression_type ===
                                  "linear"
                                    ? ((_i > 0 && mInd === 0) ||
                                        (mInd > 0 && _i >= 0)) &&
                                      progress.filter((p) =>
                                        p.activity_type !== "enroll" &&
                                        mInd > 0 &&
                                        _i === 0
                                          ? p.activity_type === "topic"
                                            ? p.id_course_topic ===
                                                modules[mInd - 1].items[
                                                  modules[mInd - 1].items
                                                    .length - 1
                                                ]?.id && p.is_completed
                                            : p.id_course_test ===
                                                modules[mInd - 1].items[
                                                  modules[mInd - 1].items
                                                    .length - 1
                                                ]?.id && p.is_completed
                                          : p.activity_type === "topic"
                                            ? p.id_course_topic ===
                                                modules[mInd].items[_i - 1]
                                                  ?.id && p.is_completed
                                            : p.id_course_test ===
                                                modules[mInd].items[_i - 1]
                                                  ?.id && p.is_completed,
                                      ).length === 0 && (
                                        <div className="flex justify-center items-center ml-4">
                                          <RxLockClosed className="w-3.75 h-3.75" />
                                        </div>
                                      )
                                    : null}
                                </div>
                              ))}
                            </div>
                          ),
                        };
                      })}
                      expandIconPlacement="end"
                      expandIcon={(panelProps) => {
                        let content = modules.filter(
                          (item) => item.id === parseInt(panelProps.panelKey),
                        )[0];
                        let topics = content.items?.filter(
                          (_t) => _t.type === "topic",
                        );
                        let tests = content.items?.filter(
                          (_t) => _t.type === "test",
                        );
                        return (
                          <div
                            className="flex justify-center items-center"
                            onClick={() => setActiveModule(content.id)}>
                            <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                              {panelProps.isActive ? (
                                <AiOutlineArrowUp className="w-3.75 h-3.75 text-black" />
                              ) : (
                                <AiOutlineArrowDown className="w-3.75 h-3.75 text-black" />
                              )}
                            </div>
                            <p className="text-[#506BA4]">
                              {topics && topics.length > 0
                                ? `${topics.length} ${t("topic")} ${tests.length > 0 ? " | " : ""}`
                                : ""}{" "}
                              {` ${tests.length > 0 ? `${tests.length} ${t("test")}` : ""}`}
                            </p>
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </Sider>
        ) : null}
        <Layout
          style={{ flex: 1, flexDirection: "column", position: "relative" }}>
          {windowDimension.width > 1080 && (
            <Button
              variant="solid"
              style={{
                backgroundColor: "#FFC600",
                position: "absolute",
                top: "80px",
                left: "-24px",
                zIndex: 50,
              }}
              className="h-12! w-12! rounded-full! flex justify-center items-center"
              onClick={() => setCollapsed(!collapsed)}
              icon={
                collapsed ? (
                  <ArrowRight className="w-6! h-6! text-black!" />
                ) : (
                  <ArrowLeft className="w-6! h-6! text-black!" />
                )
              }
            />
          )}
          <Content style={{ flex: 1, overflow: "hidden" }}>
            <div className="flex-1 flex flex-col w-full h-full relative bg-[#F1F9FF] overflow-y-auto">
              <Drawer
                open={isOpenDrawerMenu}
                size={"80%"}
                onClose={closeDrawer}
                maskClosable={false}
                extra={[]}
                className="drawer-learning">
                <div className="flex flex-col h-full">
                  <div className="absolute top-5 right-5 flex justify-end">
                    <AiFillCloseCircle
                      className="text-white text-3xl"
                      onClick={closeDrawer}
                    />
                  </div>
                  <div className="flex flex-col w-full p-6 bg-[#163986]">
                    <p className="text-white">{t("Course")}</p>
                    <p className="text-[20px] font-bold text-white">
                      {data?.course?.name}
                    </p>
                  </div>
                  <div className="w-full">
                    {modules?.length > 0 && (
                      <Collapse
                        className="collapse-learning"
                        size="large"
                        bordered={false}
                        activeKey={activeModule}
                        onChange={(keys) =>
                          setActiveModule(
                            keys.length > 0 ? keys[keys.length - 1] : [],
                          )
                        }
                        items={modules.map((item, mInd) => {
                          return {
                            key: item.id,
                            label: (
                              <div className="flex flex-col">
                                <div className="p-2 cursor-pointer flex items-center">
                                  {progress.length > 0 &&
                                  progress.filter(
                                    (p) =>
                                      p.activity_type === "module" &&
                                      p.id_course_module === item.id &&
                                      p.is_completed === 1 &&
                                      p.is_deleted !== 1,
                                  ).length > 0 ? (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center shrink-0`}>
                                      <AiOutlineCheck className="text-white" />
                                    </div>
                                  ) : (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351] shrink-0`}></div>
                                  )}
                                  <p
                                    className={`text-sm ml-2 text-[#163986] ${selectedCourseItem?.type && selectedCourseItem?.id_course_module === item.id ? "font-bold" : "font-medium"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectCourseItem(item);
                                    }}>
                                    {item.title}
                                  </p>
                                  {data?.course?.settings.progression_type ===
                                  "linear"
                                    ? mInd > 0 &&
                                      progress.filter(
                                        (p) =>
                                          p.activity_type === "module" &&
                                          p.id_course_module ===
                                            modules[mInd - 1].id &&
                                          p.is_completed === 1 &&
                                          p.is_deleted !== 1,
                                      ).length === 0 && (
                                        <div className="flex justify-center items-center ml-4">
                                          <RxLockClosed className="w-3.75 h-3.75" />
                                        </div>
                                      )
                                    : null}
                                </div>
                              </div>
                            ),
                            children: (
                              <div className="flex flex-col">
                                {item.items.map((_t, _i) => (
                                  <div
                                    onClick={() => selectCourseItem(_t)}
                                    className="p-2 pl-6 cursor-pointer flex items-center gap-2">
                                    {progress.length > 0 &&
                                    progress.filter(
                                      (p) =>
                                        p.is_completed === 1 &&
                                        p.is_deleted !== 1 &&
                                        p.activity_type === _t.type &&
                                        p[`id_course_${_t.type}`] === _t.id,
                                    ).length > 0 ? (
                                      <div
                                        className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center shrink-0`}>
                                        <AiOutlineCheck className="text-white" />
                                      </div>
                                    ) : (
                                      <div
                                        className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351] shrink-0`}></div>
                                    )}
                                    {_t.type === "test" && (
                                      <FaListCheck className="text-[#163986] shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                                    )}
                                    <p
                                      className={`text-sm text-[#163986] ${selectedCourseItem?.id === _t.id ? "font-bold" : "font-normal"}`}>
                                      {_t.title}
                                    </p>
                                    {data?.course?.settings.progression_type ===
                                    "linear"
                                      ? ((_i > 0 && mInd === 0) ||
                                          (mInd > 0 && _i >= 0)) &&
                                        progress.filter((p) =>
                                          mInd > 0 && _i === 0
                                            ? p.activity_type === "topic"
                                              ? p.id_course_topic ===
                                                  modules[mInd - 1].items[
                                                    modules[mInd - 1].items
                                                      .length - 1
                                                  ]?.id &&
                                                p.is_completed === 1 &&
                                                p.is_deleted !== 1
                                              : p.id_course_test ===
                                                  modules[mInd - 1].items[
                                                    modules[mInd - 1].items
                                                      .length - 1
                                                  ]?.id &&
                                                p.is_completed === 1 &&
                                                p.is_deleted !== 1
                                            : p.activity_type === "topic"
                                              ? p.id_course_topic ===
                                                  modules[mInd].items[_i - 1]
                                                    ?.id &&
                                                p.is_completed === 1 &&
                                                p.is_deleted !== 1
                                              : p.id_course_test ===
                                                  modules[mInd].items[_i - 1]
                                                    ?.id &&
                                                p.is_completed === 1 &&
                                                p.is_deleted !== 1,
                                        ).length === 0 && (
                                          <div className="flex justify-center items-center ml-4">
                                            <RxLockClosed className="w-3.75 h-3.75" />
                                          </div>
                                        )
                                      : null}
                                  </div>
                                ))}
                              </div>
                            ),
                          };
                        })}
                        expandIconPlacement="end"
                        expandIcon={(panelProps) => {
                          let content = modules.filter(
                            (item) => item.id === parseInt(panelProps.panelKey),
                          )[0];
                          let topics = content.items?.filter(
                            (_t) => _t.type === "topic",
                          );
                          let tests = content.items?.filter(
                            (_t) => _t.type === "test",
                          );
                          return (
                            <div className="flex justify-center items-center">
                              <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                                {panelProps.isActive ? (
                                  <AiOutlineArrowUp className="w-3.75 h-3.75 text-black" />
                                ) : (
                                  <AiOutlineArrowDown className="w-3.75 h-3.75 text-black" />
                                )}
                              </div>
                              <p className="text-[#506BA4]">
                                {topics && topics.length > 0
                                  ? `${topics.length} ${t("topic")} ${tests.length > 0 ? " | " : ""}`
                                  : ""}{" "}
                                {` ${tests.length > 0 ? `${tests.length} ${t("test")}` : ""}`}
                              </p>
                            </div>
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              </Drawer>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6 lg:p-8 lg:pl-12!">
                  {progress?.length > 0 &&
                  progress.filter(
                    (p) =>
                      p.activity_type === selectedCourseItem?.type &&
                      p[`id_course_${selectedCourseItem?.type}`] ===
                        selectedCourseItem?.id &&
                      p.is_completed === 1 &&
                      p.is_deleted !== 1,
                  ).length > 0 ? (
                    // Title of the module preview
                    <div className="p-4 bg-[#C5CEE1] flex justify-between items-center rounded-[5px]">
                      <p
                        className="text-[#163986] font-bold"
                        style={{
                          fontSize:
                            windowDimension.width < 425
                              ? "18px"
                              : windowDimension.width < 768
                                ? "19px"
                                : windowDimension.width < 1024
                                  ? "20px"
                                  : windowDimension.width < 1225
                                    ? "22px"
                                    : windowDimension.width < 1440
                                      ? "23px"
                                      : "24px",
                        }}>
                        {selectedCourseItem?.title}
                      </p>
                      <div className="p-4 bg-[#2F8351] rounded-[5px]">
                        <p
                          className="text-white"
                          style={{
                            fontSize:
                              windowDimension.width < 425
                                ? "14px"
                                : windowDimension.width < 768
                                  ? "14px"
                                  : windowDimension.width < 1024
                                    ? "14px"
                                    : windowDimension.width < 1225
                                      ? "14px"
                                      : windowDimension.width < 1440
                                        ? "15px"
                                        : "16px",
                          }}>
                          {t("Completed")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-[#163986] font-bold text-center md:text-left"
                      style={{
                        fontSize:
                          windowDimension.width < 425
                            ? "18px"
                            : windowDimension.width < 768
                              ? "19px"
                              : windowDimension.width < 1024
                                ? "20px"
                                : windowDimension.width < 1225
                                  ? "22px"
                                  : windowDimension.width < 1440
                                    ? "23px"
                                    : "24px",
                      }}>
                      {selectedCourseItem?.title}
                    </p>
                  )}
                  {selectedCourseItem &&
                  Object.keys(selectedCourseItem).length > 0 &&
                  (selectedCourseItem.type === "topic" ||
                    selectedCourseItem.type === "test") &&
                  (data?.course?.material || data?.course?.objection) ? (
                    <Tabs
                      activeKey={activeKey}
                      onChange={(key) => setActiveKey(key)}
                      centered={windowDimension.width < 768}
                      className={`tabs-${selectedCourseItem.type}`}
                      items={[
                        {
                          key: "1",
                          label: (
                            <div className="group flex flex-col lg:flex-row p-2 justify-center items-center">
                              <PiFileTextLight
                                className={`transition w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 sm:mr-2 ${
                                  activeKey === "1"
                                    ? "text-[#163986]"
                                    : "text-[#8B9CC3] group-hover:text-[#163986]"
                                }`}
                              />
                              <p
                                className={`font-bold mt-2 sm:mt-0 transition ${
                                  activeKey === "1"
                                    ? "text-[#163986]"
                                    : "text-[#8B9CC3] group-hover:text-[#163986]"
                                }`}
                                style={{
                                  fontSize:
                                    windowDimension.width < 425
                                      ? "14px"
                                      : windowDimension.width >= 425 &&
                                          windowDimension.width <= 767
                                        ? "15px"
                                        : windowDimension.width >= 768 &&
                                            windowDimension.width <= 1023
                                          ? "16px"
                                          : windowDimension.width >= 1024 &&
                                              windowDimension.width <= 1224
                                            ? "18px"
                                            : windowDimension.width >= 1225 &&
                                                windowDimension.width <= 1439
                                              ? "19px"
                                              : windowDimension.width >= 1440
                                                ? "20px"
                                                : "16px",
                                }}>
                                {t("Topic")}
                              </p>
                            </div>
                          ),
                          forceRender: true,
                          children:
                            selectedCourseItem.type === "topic" ? (
                              <Topic
                                course={data.course}
                                progress={progress}
                                selectedCourseItem={selectedCourseItem}
                                setAllowNext={setAllowNext}
                                modules={modules}
                                allItems={allItems}
                                collapsed={collapsed}
                              />
                            ) : (
                              <Test
                                course={data.course}
                                progress={progress}
                                selectedCourseItem={selectedCourseItem}
                                setAllowNext={setAllowNext}
                                modules={modules}
                                allItems={allItems}
                                metaData={metaData}
                                setMetaData={setMetaData}
                                updateProgress={updateProgress}
                                next={next}
                              />
                            ),
                        },
                        data.course.material &&
                          data.course.material.length > 0 && {
                            key: "2",
                            label: (
                              <div className="group flex flex-col lg:flex-row p-2 justify-center items-center">
                                <PiBookBookmark
                                  className={`transition w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 sm:mr-2 ${
                                    activeKey === "2"
                                      ? "text-[#163986]"
                                      : "text-[#8B9CC3] group-hover:text-[#163986]"
                                  }`}
                                />
                                <p
                                  className={`font-bold mt-2 sm:mt-0 transition ${
                                    activeKey === "2"
                                      ? "text-[#163986]"
                                      : "text-[#8B9CC3] group-hover:text-[#163986]"
                                  }`}
                                  style={{
                                    fontSize:
                                      windowDimension.width < 425
                                        ? "14px"
                                        : windowDimension.width >= 425 &&
                                            windowDimension.width <= 767
                                          ? "15px"
                                          : windowDimension.width >= 768 &&
                                              windowDimension.width <= 1023
                                            ? "16px"
                                            : windowDimension.width >= 1024 &&
                                                windowDimension.width <= 1224
                                              ? "18px"
                                              : windowDimension.width >= 1225 &&
                                                  windowDimension.width <= 1439
                                                ? "19px"
                                                : windowDimension.width >= 1440
                                                  ? "20px"
                                                  : "16px",
                                  }}>
                                  {t("Materials")}
                                </p>
                              </div>
                            ),
                            children: <CourseMaterial data={data.course} />,
                          },
                        data.course.objection?.tabs &&
                          data.course.objection?.tabs.length > 0 && {
                            key: "3",
                            label: (
                              <div className="group flex flex-col lg:flex-row p-2 justify-center items-center">
                                <PiBookOpenLight
                                  className={`transition w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 sm:mr-2 ${
                                    activeKey === "3"
                                      ? "text-[#163986]"
                                      : "text-[#8B9CC3] group-hover:text-[#163986]"
                                  }`}
                                />
                                <p
                                  className={`font-bold mt-2 sm:mt-0 transition ${
                                    activeKey === "3"
                                      ? "text-[#163986]"
                                      : "text-[#8B9CC3] group-hover:text-[#163986]"
                                  }`}
                                  style={{
                                    fontSize:
                                      windowDimension.width < 425
                                        ? "14px"
                                        : windowDimension.width >= 425 &&
                                            windowDimension.width <= 767
                                          ? "15px"
                                          : windowDimension.width >= 768 &&
                                              windowDimension.width <= 1023
                                            ? "16px"
                                            : windowDimension.width >= 1024 &&
                                                windowDimension.width <= 1224
                                              ? "18px"
                                              : windowDimension.width >= 1225 &&
                                                  windowDimension.width <= 1439
                                                ? "19px"
                                                : windowDimension.width >= 1440
                                                  ? "20px"
                                                  : "16px",
                                  }}>
                                  {t("Objection books")}
                                </p>
                              </div>
                            ),
                            children: <CourseObjection data={data.course} />,
                          },
                      ].filter(Boolean)}
                    />
                  ) : selectedCourseItem?.type === "topic" ? (
                    <Topic
                      course={data.course}
                      progress={progress}
                      selectedCourseItem={selectedCourseItem}
                      setAllowNext={setAllowNext}
                      modules={modules}
                      allItems={allItems}
                    />
                  ) : selectedCourseItem?.type === "test" ? (
                    <Test
                      course={data?.course}
                      progress={progress}
                      selectedCourseItem={selectedCourseItem}
                      setAllowNext={setAllowNext}
                      modules={modules}
                      allItems={allItems}
                      metaData={metaData}
                      setMetaData={setMetaData}
                      updateProgress={updateProgress}
                      next={next}
                    />
                  ) : null}
                  {selectedCourseItem &&
                    Object.keys(selectedCourseItem).length > 0 &&
                    !selectedCourseItem.type && (
                      <Module
                        course={data.course}
                        progress={progress}
                        selectedCourseItem={selectedCourseItem}
                        modules={modules}
                        allItems={allItems}
                        selectCourseItem={selectCourseItem}
                      />
                    )}
                </div>
              </div>
            </div>
          </Content>
          {selectedCourseItem && selectedCourseItem.type && (
            <div className="p-4 md:p-6 flex items-center bg-[#FF9E83] shrink-0 px-8">
              <div className="flex-1">
                {allItems &&
                  allItems.length > 0 &&
                  selectedCourseItem.id !== allItems[0].id && (
                    <Button
                      icon={<RxChevronLeft />}
                      // icon={<AiFillCaretLeft />}
                      className={
                        windowDimension.width <= 425
                          ? "course-button-previous-mobile"
                          : "course-button-previous"
                      }
                      onClick={() => previous()}>
                      {windowDimension.width > 425 && t("Previous")}
                    </Button>
                  )}
              </div>
              <div className="flex-1 flex justify-end">
                <Button
                  icon={<RxChevronRight />}
                  // icon={<AiFillCaretRight />}
                  iconPlacement="end"
                  onClick={() => next()}
                  disabled={!allowNext && user.id_role !== 1}
                  className="course-button-next">
                  {windowDimension.width > 425 && t("Next")}
                </Button>
              </div>
            </div>
          )}
        </Layout>
      </Layout>
    </Layout>
  );
};
export default Learning;
