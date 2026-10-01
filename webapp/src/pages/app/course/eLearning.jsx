import React, { useContext, useEffect, useState } from "react";
import { MenuOutlined } from "@ant-design/icons";
import {
  Button,
  Collapse,
  Drawer,
  Layout,
  Modal,
  Progress,
  Tabs,
  Switch,
} from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import endpoints from "../../../utils/endpoints";

import { RiMenuFold4Line, RiMenuUnfold4Line } from "react-icons/ri";
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
import CourseCompleted from "./completed";

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
  // Teste a decorrer (iniciado e não terminado): bloqueia a navegação entre itens
  const [isTestInProgress, setIsTestInProgress] = useState(false);
  // Elemento no fundo do ecrã onde o Test coloca a navegação entre perguntas (fixa durante o teste)
  const [testFooterSlot, setTestFooterSlot] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [allowNext, setAllowNext] = useState(false);
  const [metaData, setMetaData] = useState(null);
  const [activeModule, setActiveModule] = useState([]);
  const [activeKey, setActiveKey] = useState("1");
  // Ecrã de parabéns mostrado quando o último tópico/teste conclui o curso
  const [showCompleted, setShowCompleted] = useState(false);

  const { t, i18n } = useTranslation();

  const location = useLocation();

  const navigate = useNavigate();

  const { slug } = useParams();

  // Espera pelos idiomas: o admin abre o curso no idioma da interface (ao abrir/recarregar a página
  // diretamente os idiomas ainda não estavam carregados e o curso ficava vazio)
  const languagesLoaded = languages?.length > 0;
  useEffect(() => {
    if (languagesLoaded) getData();
  }, [slug, languagesLoaded]);

  useEffect(() => {
    calcProgress();
  }, [progress, allItems]);

  useEffect(() => {
    if (selectedCourseItem)
      // Garante que o módulo do item atual está aberto, sem fechar os restantes
      setActiveModule((prev) => {
        const moduleId = selectedCourseItem?.type
          ? selectedCourseItem.id_course_module
          : selectedCourseItem.id;
        return prev.includes(moduleId) ? prev : [...prev, moduleId];
      });
  }, [selectedCourseItem]);

  async function getData() {
    try {
      // Admins can access courses from any language (use current UI language)
      // Users are restricted to their assigned language
      const isAdmin = user.id_role === 1;
      const selectedLangId = isAdmin
        ? (languages.find((_l) => _l.code === i18n.language)?.id ??
          user.id_lang)
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

  // Um tópico/teste está concluído quando existe um registo de conclusão (não apagado) desse item
  function isItemCompleted(item, progressToCheck = progress) {
    return (progressToCheck || []).some(
      (p) =>
        p.is_completed === 1 &&
        p.is_deleted !== 1 &&
        p.activity_type === item.type &&
        p[`id_course_${item.type}`] === item.id,
    );
  }

  // Módulo concluído: todos os seus itens concluídos (módulo sem itens não conta como concluído)
  function isModuleCompleted(module, progressToCheck = progress) {
    if (!module || !module.items || module.items.length === 0) return false;
    return module.items.every((item) => isItemCompleted(item, progressToCheck));
  }

  // Curso concluído: todos os tópicos/testes visíveis concluídos (cada item conta uma só vez,
  // por isso registos repetidos já não fazem o curso terminar antes do tempo)
  function isCourseCompleted(simulatedProgress = null) {
    if (!data || !modules || !allItems || allItems.length === 0) return false;
    const progressToCheck = simulatedProgress || progress;
    if (!progressToCheck) return false;
    return allItems.every((item) => isItemCompleted(item, progressToCheck));
  }

  function selectCourseItem(item) {
    setSelectedCourseItem(item);
    // Only close drawer when selecting an actual topic/test item, not module headers
    if (item.type && windowDimension.width < 1080) {
      closeDrawer();
    }
  }

  // Posição do item na ordem do curso (allItems); topics e tests são tabelas diferentes e podem ter o
  // mesmo id, por isso compara-se id e tipo
  function indexInCourse(item) {
    return (allItems || []).findIndex(
      (i) => i.id === item?.id && i.type === item?.type,
    );
  }

  // Avança para o item seguinte do curso; ao mudar de módulo vai direto para o primeiro item do
  // módulo seguinte. Devolve false quando já é o último item.
  function goToNextItem() {
    const nextItem = allItems?.[indexInCourse(selectedCourseItem) + 1];
    if (!nextItem) return false;
    setSelectedCourseItem(nextItem);
    return true;
  }

  function next(changeItem, itemMetaData) {
    // Um teste só fica concluído quando é aprovado (o Test chama next com o resultado); o botão
    // Próximo nunca marca um teste como concluído, apenas avança (ex.: admin a rever o curso)
    if (
      isItemCompleted(selectedCourseItem) ||
      (selectedCourseItem.type === "test" && !itemMetaData)
    ) {
      goToNextItem();
      return;
    }

    const moduleSelectedCourseItem = modules.filter(
      (m) => m.id === selectedCourseItem.id_course_module,
    )[0];
    const now = dayjs();
    const auxData = [
      {
        id_course: data.course.id,
        id_user: user.id,
        activity_type: selectedCourseItem.type === "topic" ? "topic" : "test",
        id_course_topic:
          selectedCourseItem.type === "topic" ? selectedCourseItem.id : null,
        id_course_test:
          selectedCourseItem.type === "test" ? selectedCourseItem.id : null,
        id_course_module: moduleSelectedCourseItem.id,
        is_completed: 1,
        meta_data: itemMetaData ? JSON.stringify(itemMetaData) : null,
        created_at: now.format("YYYY-MM-DD HH:mm:ss"),
        modified_at: now.format("YYYY-MM-DD HH:mm:ss"),
      },
    ];

    // Progresso simulado com o item atual, para saber se o módulo e o curso ficam concluídos
    let simulatedProgress = [...progress, ...auxData];
    const moduleAlreadyCompleted = progress.some(
      (p) =>
        p.activity_type === "module" &&
        p.id_course_module === moduleSelectedCourseItem.id &&
        p.is_completed === 1 &&
        p.is_deleted !== 1,
    );
    if (
      !moduleAlreadyCompleted &&
      isModuleCompleted(moduleSelectedCourseItem, simulatedProgress)
    ) {
      auxData.push({
        id_course: data.course.id,
        id_user: user.id,
        activity_type: "module",
        id_course_topic: null,
        id_course_test: null,
        id_course_module: moduleSelectedCourseItem.id,
        is_completed: 1,
        meta_data: null,
        created_at: now.add(2, "s").format("YYYY-MM-DD HH:mm:ss"),
        modified_at: now.add(2, "s").format("YYYY-MM-DD HH:mm:ss"),
      });
    }

    let courseCompleted = false;
    const courseAlreadyCompleted = progress.some(
      (p) =>
        p.activity_type === "course" &&
        p.is_completed === 1 &&
        p.is_deleted !== 1,
    );
    if (!courseAlreadyCompleted && isCourseCompleted(simulatedProgress)) {
      auxData.push({
        id_course: data.course.id,
        id_user: user.id,
        activity_type: "course",
        id_course_topic: null,
        id_course_test: null,
        id_course_module: null,
        is_completed: 1,
        meta_data: null,
        created_at: now.add(5, "s").format("YYYY-MM-DD HH:mm:ss"),
        modified_at: now.add(5, "s").format("YYYY-MM-DD HH:mm:ss"),
      });
      courseCompleted = true;
    }

    axios
      .post(endpoints.course.updateProgress, {
        data: auxData,
      })
      .then(() => {
        if (changeItem === undefined || changeItem !== false) {
          // Último item do curso concluído: mostra o ecrã de curso concluído
          if (!goToNextItem() && courseCompleted) setShowCompleted(true);
        }
        setProgress((prev) => [...prev, ...auxData]);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Item anterior na ordem do curso; no primeiro item pergunta se quer voltar à página do curso
  function previous() {
    const index = indexInCourse(selectedCourseItem);
    if (index > 0) {
      setSelectedCourseItem(allItems[index - 1]);
    } else {
      confirm({
        title: t("Go back to the course page?"),
        icon: <RxExclamationTriangle />,
        content: t("You are on the first item of the course."),
        okText: t("Yes"),
        cancelText: t("No"),
        okButtonProps: { className: "main-cta-button" },
        cancelButtonProps: { className: "main-secondary-cta-button" },
        onOk() {
          navigate(`/${i18n.language}/courses/${slug}`);
        },
      });
    }
  }

  // Percentagem de itens (tópicos/testes) concluídos; cada item conta uma só vez, nunca passa de 100%
  function calcProgress() {
    const total = allItems?.length || 0;
    const completed = (allItems || []).filter((item) =>
      isItemCompleted(item),
    ).length;
    const percentage = total > 0 ? Math.min(100, (100 * completed) / total) : 0;
    setProgressPercentage(
      percentage === 100 ? 100 : Number(percentage.toFixed(2)),
    );
  }

  function updateProgress(newObj) {
    setProgress((prev) => [...prev, newObj]);
  }

  // Primeiro/último item do curso: no primeiro não há Anterior; no último não há Próximo
  // (se for um tópico ainda por concluir, mostra-se Terminar para registar a conclusão do curso)
  const currentIndex = selectedCourseItem?.type
    ? indexInCourse(selectedCourseItem)
    : -1;
  const isFirstItem = currentIndex === 0;
  const isLastItem =
    allItems?.length > 0 && currentIndex === allItems.length - 1;
  const showNext =
    !isLastItem ||
    (selectedCourseItem?.type === "topic" &&
      !isItemCompleted(selectedCourseItem));
  const nextLabel = isLastItem ? t("Finish") : t("Next");

  // Ecrãs compactos: telemóvel ou telemóvel/tablet rodado na horizontal (ecrã tátil)
  const isLandscapeTouch =
    windowDimension.width > windowDimension.height &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;
  const compactTabs = windowDimension.width < 768 || isLandscapeTouch;

  const capitalize = (text) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

  // Label das tabs (Topic, Materials, Objection books): em ecrãs compactos só o ícone
  function tabLabel(key, Icon, text) {
    const active = activeKey === key;
    const color = active
      ? "text-[#163986]"
      : "text-[#8B9CC3] group-hover:text-[#163986]";
    return (
      <div
        className="group flex items-center justify-center p-1 sm:p-2"
        title={text}
        aria-label={text}>
        <Icon
          className={`transition w-5 h-5 md:w-6 md:h-6 shrink-0 ${compactTabs ? "" : "mr-2"} ${color}`}
        />
        {!compactTabs && (
          <p
            className={`font-bold transition text-[14px] lg:text-[16px] xl:text-[17px] ${color}`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  // Largura da coluna do conteúdo: o maior maxWidth dos blocos do tópico (ex.: vídeo de 1000px)
  const contentMaxWidth = (() => {
    try {
      const blocks =
        JSON.parse(selectedCourseItem?.content || "{}")?.content || [];
      const widths = blocks
        .map((b) => Number(b?.props?.maxWidth))
        .filter((w) => w > 0);
      return widths.length > 0 ? Math.max(...widths) : 1000;
    } catch {
      return 1000;
    }
  })();

  function closeDrawer() {
    setIsOpenDrawerMenu(false);
  }

  return (
    // Altura do ecrã: header e footer ficam fixos e só o conteúdo faz scroll
    <Layout className="h-dvh overflow-hidden">
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
                    {!isFirstItem && (
                      <Button
                        size="large"
                        icon={<RxChevronLeft />}
                        className="button-learning-header mr-2"
                        onClick={() => previous()}
                        disabled={isTestInProgress}>
                        {windowDimension.width >= 1081 &&
                        windowDimension.width < 1270
                          ? ""
                          : t("Previous")}
                      </Button>
                    )}
                    {showNext && (
                      <Button
                        size="large"
                        icon={<RxChevronRight />}
                        iconPlacement="end"
                        className="button-learning-header"
                        onClick={() => next()}
                        disabled={
                          isTestInProgress || (!allowNext && user.id_role !== 1)
                        }>
                        {windowDimension.width >= 1081 &&
                        windowDimension.width < 1270
                          ? ""
                          : nextLabel}
                      </Button>
                    )}
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
                    className="font-ryker text-[#8B9CC3] shrink-0 font-medium"
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

      <Layout className="min-h-0">
        {windowDimension.width > 1080 ? (
          <Sider
            width={windowDimension.width > 1225 ? 400 : 350}
            className="bg-white! overflow-auto learning-sider"
            // Recolhido fica totalmente escondido (sem faixa branca); abre/fecha no switch da barra inferior
            collapsedWidth={0}
            collapsed={collapsed}>
            {!collapsed && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col w-full p-6 bg-[#163986]">
                  <p className="font-ryker text-white">{t("Course")}</p>
                  <p className="font-ryker text-[20px] font-bold text-white">
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
                      onChange={(keys) => setActiveModule(keys)}
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
                                  className={`font-ryker text-sm text-[#163986] ml-2 ${selectedCourseItem?.type && selectedCourseItem?.id_course_module === item.id ? "font-bold" : "font-medium"}`}
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
            )}
          </Sider>
        ) : null}
        <Layout
          style={{
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
          }}>
          <Content style={{ overflow: "hidden", minHeight: 0 }}>
            <div className="flex flex-col w-full h-full relative bg-[#F1F9FF] overflow-y-auto">
              <Drawer
                open={isOpenDrawerMenu}
                size={"80%"}
                onClose={closeDrawer}
                maskClosable
                extra={[]}
                className="drawer-learning">
                <div className="flex flex-col h-full relative overflow-hidden">
                  <div className="absolute top-5 right-5 z-10 flex justify-end cursor-pointer">
                    <AiFillCloseCircle
                      className="text-white text-3xl"
                      onClick={closeDrawer}
                    />
                  </div>
                  {/* Em mobile o nome do curso serve para voltar à página do curso */}
                  <button
                    type="button"
                    className="group flex flex-col items-start text-left w-full p-6 pr-14 bg-[#163986] cursor-pointer shrink-0"
                    onClick={() => {
                      closeDrawer();
                      navigate(`/${i18n.language}/courses/${slug}`);
                    }}
                    aria-label={t("Back to course")}>
                    <span className="flex items-center gap-1 text-white/80 text-[12px] group-hover:text-[#00B9D6] transition-colors">
                      <RxChevronLeft className="w-3.5 h-3.5" />
                      {t("Back to course")}
                    </span>
                    <span className="font-ryker text-white text-[13px] mt-1">
                      {t("Course")}
                    </span>
                    <span className="font-ryker text-[20px] font-bold text-white group-hover:underline">
                      {data?.course?.name}
                    </span>
                  </button>
                  <div className="w-full flex-1 min-h-0 overflow-y-auto">
                    {modules?.length > 0 && (
                      <Collapse
                        className="collapse-learning"
                        size="large"
                        bordered={false}
                        activeKey={activeModule}
                        onChange={(keys) => setActiveModule(keys)}
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
                                    className={`font-ryker text-sm ml-2 text-[#163986] ${selectedCourseItem?.type && selectedCourseItem?.id_course_module === item.id ? "font-bold" : "font-medium"}`}
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
              {showCompleted ? (
                <CourseCompleted
                  course={data?.course}
                  modules={modules}
                  itemsCount={allItems?.length || 0}
                  onBack={() => navigate(`/${i18n.language}/courses/${slug}`)}
                  onReview={() => {
                    setShowCompleted(false);
                    setSelectedCourseItem(allItems?.[0]);
                  }}
                />
              ) : (
                <div className="overflow-y-auto">
                  <div className="p-3 sm:p-4 md:p-6 lg:p-8">
                    {/* Título, tabs e conteúdo com a mesma largura do vídeo do tópico (ver .elearning-column) */}
                    <div
                      className="elearning-column mx-auto w-full"
                      style={{ maxWidth: contentMaxWidth }}>
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
                        <div
                          className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-[#C5CEE1] flex justify-between items-center gap-2 rounded-[5px] ${isLandscapeTouch ? "mb-4" : ""}`}>
                          <p className="font-ryker text-[#163986] font-bold leading-tight text-[14px] sm:text-[15px] md:text-[17px] lg:text-[19px] xl:text-[20px]">
                            {selectedCourseItem?.title}
                          </p>
                          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#2F8351] rounded-[5px] shrink-0">
                            <p className="text-white text-[11px] sm:text-[12px] lg:text-[13px]">
                              {t("Completed")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p
                          className={`font-ryker text-[#163986] font-bold leading-tight text-center md:text-left text-[14px] sm:text-[15px] md:text-[17px] lg:text-[19px] xl:text-[20px] ${isLandscapeTouch ? "mb-4" : ""}`}>
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
                          // Telemóvel/tablet na horizontal: tabs na lateral, só com ícones
                          tabPosition={isLandscapeTouch ? "left" : "top"}
                          size={compactTabs ? "small" : "middle"}
                          centered={
                            windowDimension.width < 768 && !isLandscapeTouch
                          }
                          className={`tabs-${selectedCourseItem.type}`}
                          items={[
                            {
                              key: "1",
                              // Mesma chave "topic" do resto da app, com a primeira letra em maiúscula
                              label: tabLabel(
                                "1",
                                PiFileTextLight,
                                capitalize(t("topic")),
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
                                    onInProgressChange={setIsTestInProgress}
                                    footerSlot={testFooterSlot}
                                  />
                                ),
                            },
                            data.course.material &&
                              data.course.material.length > 0 && {
                                key: "2",
                                label: tabLabel(
                                  "2",
                                  PiBookBookmark,
                                  t("Materials"),
                                ),
                                children: <CourseMaterial data={data.course} />,
                              },
                            data.course.objection?.tabs &&
                              data.course.objection?.tabs.length > 0 && {
                                key: "3",
                                label: tabLabel(
                                  "3",
                                  PiBookOpenLight,
                                  t("Objection books"),
                                ),
                                children: (
                                  <CourseObjection data={data.course} />
                                ),
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
                          onInProgressChange={setIsTestInProgress}
                          footerSlot={testFooterSlot}
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
              )}
            </div>
          </Content>
          {/* Navegação entre perguntas do teste: o Test coloca-a aqui (portal) enquanto decorre */}
          <div ref={setTestFooterSlot} className="shrink-0" />
          {/* Barra inferior (fixa): à esquerda o switch do menu do curso (Sider, desktop); à direita Anterior e
              Próximo. Anterior/Próximo: nos tópicos; nos testes só em tablet/mobile (sem navegação no topo).
              Durante o teste é substituída pela navegação entre perguntas. */}
          {selectedCourseItem &&
            !showCompleted &&
            !isTestInProgress &&
            (windowDimension.width > 1080 || selectedCourseItem.type) && (
              <div className="p-2 sm:p-3 md:p-4 flex items-center justify-between gap-3 bg-[#FF9E83] shrink-0 px-3 sm:px-6">
                <div className="flex items-center">
                  {windowDimension.width > 1080 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none text-white font-semibold text-[13px] lg:text-[14px]">
                      {collapsed ? (
                        <RiMenuUnfold4Line className="w-5 h-5" />
                      ) : (
                        <RiMenuFold4Line className="w-5 h-5" />
                      )}
                      <span>
                        {collapsed
                          ? t("Show course menu")
                          : t("Hide course menu")}
                      </span>
                      <Switch
                        size="small"
                        checked={!collapsed}
                        onChange={(checked) => setCollapsed(!checked)}
                      />
                    </label>
                  )}
                </div>
                {(selectedCourseItem.type === "topic" ||
                  windowDimension.width <= 1080) && (
                  // Em mobile também com as labels Anterior/Próximo, como no header
                  <div className="flex items-center gap-2">
                    {!isFirstItem && (
                      <Button
                        icon={<RxChevronLeft />}
                        className={
                          windowDimension.width <= 425
                            ? "course-button-previous-mobile"
                            : "course-button-previous"
                        }
                        onClick={() => previous()}>
                        {t("Previous")}
                      </Button>
                    )}
                    {showNext && (
                      <Button
                        icon={<RxChevronRight />}
                        iconPlacement="end"
                        onClick={() => next()}
                        disabled={!allowNext && user.id_role !== 1}
                        size="small"
                        className="course-button-next">
                        {nextLabel}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
        </Layout>
      </Layout>
    </Layout>
  );
};
export default Learning;
