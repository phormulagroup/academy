import React, { useContext, useEffect, useState } from "react";
import { CloseOutlined, CustomerServiceOutlined, DownOutlined, LoginOutlined, MenuOutlined, ProfileOutlined } from "@ant-design/icons";
import { Avatar, Button, Collapse, Divider, Drawer, Dropdown, FloatButton, Layout, Menu, Modal, Progress, Tabs } from "antd";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import endpoints from "../../../utils/endpoints";
import config from "../../../utils/config";

import { Context } from "../../../utils/context";

import Logout from "../../../components/logout";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { TbWorld } from "react-icons/tb";
import { AiFillCloseCircle, AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineCheck } from "react-icons/ai";
import { RxChevronRight, RxChevronLeft, RxExclamationTriangle, RxLockClosed, RxArrowLeft, RxArrowRight } from "react-icons/rx";

import dayjs from "dayjs";
import Topic from "./topic";
import Test from "./test";

import logo from "../../../assets/BIAL-Regional-Academy.svg";
import Module from "./module";
import { ArrowLeft, ArrowRight } from "lucide-react";

import CourseContent from "./content";
import CourseMaterial from "./material";
import CourseObjection from "./objection";
import CourseIcon from "../../../assets/Curso.svg?react";
import MaterialIcon from "../../../assets/Materiais.svg?react";
import ObjectionIcon from "../../../assets/Livro-Objecoes-On.svg?react";
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

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readBySlug, { params: { slug, id_user: user.id, id_lang: user.id_lang } });
      if (res.data.course.length > 0) {
        let auxCourse = res.data.course[0];
        auxCourse.settings = auxCourse.settings ? JSON.parse(auxCourse.settings) : null;
        if (auxCourse.settings && auxCourse.settings.country_limit && !auxCourse.settings.country.includes(user.country)) auxCourse = null;
        if (auxCourse.settings && auxCourse.settings.course_access_expiration && canAccess(auxCourse.settings)) auxCourse = null;
        if (auxCourse) {
          auxCourse.material = auxCourse.material ? JSON.parse(auxCourse.material) : null;
          auxCourse.objection = auxCourse.objection ? JSON.parse(auxCourse.objection) : null;

          let auxAllItems = [];

          if (res.data.modules.length > 0) {
            let auxModules = res.data.modules;
            let newModules = [];
            for (let i = 0; i < auxModules.length; i++) {
              auxModules[i].items = auxModules[i].items ? JSON.parse(auxModules[i].items) : null;
              if (auxModules[i].items) {
                for (let y = 0; y < auxModules[i].items.length; y++) {
                  if (auxModules[i].items[y].type === "topic")
                    auxModules[i].items[y] = { type: auxModules[i].items[y].type, ...res.data.topics.filter((_t) => _t.id === auxModules[i].items[y].id)[0] };
                  if (auxModules[i].items[y].type === "test")
                    auxModules[i].items[y] = { type: auxModules[i].items[y].type, ...res.data.tests.filter((_t) => _t.id === auxModules[i].items[y].id)[0] };

                  auxAllItems.push(auxModules[i].items[y]);
                }
                newModules.push(auxModules[i]);
              }
            }

            if (location.state && location.state.courseItemId && location.state.courseItemType) {
              if (location.state.courseItemType === "module") selectCourseItem(res.data.modules.filter((item) => item.id === location.state.courseItemId)[0]);
              else if (location.state.courseItemType === "topic")
                selectCourseItem(auxAllItems.filter((item) => item.id === location.state.courseItemId && item.type === location.state.courseItemType)[0]);
              else if (location.state.courseItemType === "test")
                selectCourseItem(auxAllItems.filter((item) => item.id === location.state.courseItemId && item.type === location.state.courseItemType)[0]);
            }

            setData({ course: auxCourse, modules: res.data.modules, topics: res.data.topics, tests: res.data.tests });
            setAllItems(auxAllItems);
            setModules(newModules);
            setProgress(res.data.progress);
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
    return false;
  }

  function selectCourseItem(item) {
    setSelectedCourseItem(item);
    closeDrawer();
  }

  function next(changeItem, itemMetaData) {
    let auxData = [];
    const moduleSelectedCourseItem = modules.filter((m) => m.id === selectedCourseItem.id_course_module)[0];
    let findInProgress = progress.filter((p) => p[`id_course_${selectedCourseItem.type}`] === selectedCourseItem.id && p.is_completed === 1);
    let goToNextModule = false;
    let courseCompleted = false;
    if (findInProgress.length === 0) {
      if (
        selectedCourseItem.id === moduleSelectedCourseItem.items[moduleSelectedCourseItem.items.length - 1].id ||
        moduleSelectedCourseItem.items.length === progress.filter((p) => p.id_course_module === moduleSelectedCourseItem.id && p.activity_type !== "module").length + 1
      ) {
        auxData = [
          {
            id_course: data.course.id,
            id_user: user.id,
            activity_type: selectedCourseItem.type === "topic" ? "topic" : "test",
            id_course_topic: selectedCourseItem.type === "topic" ? selectedCourseItem.id : null,
            id_course_test: selectedCourseItem.type === "test" ? selectedCourseItem.id : null,
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

        //Falta saber se é o último tópico ou teste que pode fazer se o curso não for do tipo linear
        if (moduleSelectedCourseItem.id === modules[modules.length - 1].id || progress.filter((p) => p.activity_type !== "module").length === allItems.length - 1) {
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
            activity_type: selectedCourseItem.type === "topic" ? "topic" : "test",
            id_course_topic: selectedCourseItem.type === "topic" ? selectedCourseItem.id : null,
            id_course_test: selectedCourseItem.type === "test" ? selectedCourseItem.id : null,
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
              const indexOfSelectedItem = modules.findIndex((m) => m.id === selectedCourseItem.id_course_module);
              if (modules[indexOfSelectedItem + 1]) setSelectedCourseItem(modules[indexOfSelectedItem + 1]);
              else {
                if (courseCompleted) navigate(`/${i18n.language}/courses/${slug}`, { replace: true });
              }
            } else {
              let indexOfSelectedItem = moduleSelectedCourseItem.items.findIndex((m) => m.id === selectedCourseItem.id);
              setSelectedCourseItem(moduleSelectedCourseItem.items[indexOfSelectedItem + 1]);
            }
          }
          setProgress(newProgress);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      if (
        selectedCourseItem.id === moduleSelectedCourseItem.items[moduleSelectedCourseItem.items.length - 1].id ||
        moduleSelectedCourseItem.items.length === progress.filter((p) => p.id_course_module === moduleSelectedCourseItem.id && p.activity_type !== "module").length + 1
      ) {
        const indexOfSelectedItem = modules.findIndex((m) => m.id === selectedCourseItem.id_course_module);
        if (modules[indexOfSelectedItem + 1]) setSelectedCourseItem(modules[indexOfSelectedItem + 1]);
        else console.log("último módulo");
      } else {
        let indexOfSelectedItem = moduleSelectedCourseItem.items.findIndex((m) => m.id === selectedCourseItem.id);
        setSelectedCourseItem(moduleSelectedCourseItem.items[indexOfSelectedItem + 1]);
      }
    }
  }

  function previous() {
    const moduleSelectedCourseItem = modules.filter((m) => m.id === selectedCourseItem.id_course_module)[0];
    const findIndexModule = modules.findIndex((m) => m.id === moduleSelectedCourseItem.id);
    let indexOfSelectedItem = moduleSelectedCourseItem.items.findIndex((m) => m.id === selectedCourseItem.id);
    if (findIndexModule === 0) {
      if (indexOfSelectedItem > 0) {
        setSelectedCourseItem(moduleSelectedCourseItem.items[indexOfSelectedItem - 1]);
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
        setSelectedCourseItem(modules[findIndexModule - 1].items[modules[findIndexModule - 1].items.length - 1]);
      } else {
        setSelectedCourseItem(moduleSelectedCourseItem.items[indexOfSelectedItem - 1]);
      }
    }
  }

  function calcProgress() {
    const completed = progress?.filter((p) => (p.activity_type === "topic" || p.activity_type === "test") && p.is_completed === 1).length;
    const total = data?.topics.length + data?.tests.length;
    setProgressPercentage(((100 * completed) / total).toFixed(2));
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
      <Logout open={isOpenLogout} close={() => setIsOpenLogout(false)} submit={logout} />
      <Header className="bg-white! shadow-[0px_4px_16px_#A7AFB754] flex justify-end items-center h-25!">
        <div className="flex justify-center items-center w-full">
          {windowDimension.width > 1080 ? (
            <div className="grid grid-cols-3 gap-4 w-full">
              <div>
                <img src={logo} className="max-h-17.5" />
              </div>
              <div className="flex flex-col justify-center items-center">
                <div className="w-full flex justify-between items-center mb-2">
                  <p className="leading-[1em] text-[24px] font-bold uppercase">
                    {progressPercentage}% {t("Complete")}
                  </p>
                  <p className="leading-1">
                    {progress?.filter((p) => (p.activity_type === "topic" || p.activity_type === "test") && p.is_completed === 1).length} /{" "}
                    {data?.topics.length + data?.tests.length} {t("steps")}
                  </p>
                </div>
                <Progress strokeColor={"#2F8351"} percent={progressPercentage} className="w-full" showInfo={false} />
              </div>
              <div className="flex justify-end items-center">
                <Button size="large" icon={<RxChevronLeft />} className="button-back-learning-header mr-4" onClick={() => navigate(`/${i18n.language}/courses/${slug}`)}>
                  {t("Back to course")}
                </Button>
                {selectedCourseItem?.type && (
                  <>
                    {allItems && allItems.length > 0 && selectedCourseItem.id !== allItems[0].id && (
                      <Button size="large" icon={<RxChevronLeft />} className="button-learning-header mr-2" onClick={() => previous()}>
                        {t("Previous")}
                      </Button>
                    )}
                    <Button size="large" icon={<RxChevronRight />} iconPlacement="end" className="button-learning-header" onClick={() => next()} disabled={!allowNext}>
                      {t("Next")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center w-full">
              <img src={logo} className="max-h-17.5" />
              <MenuOutlined className="text-xl" onClick={() => setIsOpenDrawerMenu(true)} />
            </div>
          )}
        </div>
      </Header>

      <Layout>
        {windowDimension.width > 1080 ? (
          <Sider width={400} className="bg-white! overflow-auto learning-sider" collapsed={collapsed}>
            {!collapsed && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col w-full p-6 bg-[#506BA4]">
                  <p className="text-white">{t("Course")}</p>
                  <p className="text-[20px] font-bold text-white">{data?.course?.name}</p>
                </div>
                <div className="w-full">
                  {modules?.length > 0 && (
                    <Collapse
                      className="collapse-learning"
                      size="large"
                      bordered={false}
                      items={modules.map((item, mInd) => {
                        return {
                          key: item.id,
                          label: (
                            <div className="flex flex-col">
                              <div onClick={() => selectCourseItem(item)} className="p-2 cursor-pointer flex items-center">
                                {progress.length > 0 && progress.filter((p) => p.activity_type === "module" && p.id_course_module === item.id).length > 0 ? (
                                  <div
                                    className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}
                                  >
                                    <AiOutlineCheck className="text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                )}
                                <p className={`text-sm ml-2`}>{item.title}</p>
                                {data?.course?.settings.progression_type === "linear"
                                  ? mInd > 0 &&
                                    progress.filter((p) => p.activity_type === "module" && p.id_course_module === modules[mInd - 1].id).length === 0 && (
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
                                <div onClick={() => selectCourseItem(_t)} className="p-2 pl-6 cursor-pointer flex items-center">
                                  {progress.length > 0 && progress.filter((p) => p.is_completed && p[`id_course_${_t.type}`] === _t.id).length > 0 ? (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}
                                    >
                                      <AiOutlineCheck className="text-white" />
                                    </div>
                                  ) : (
                                    <div className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                  )}
                                  <p className={`text-sm ml-2 ${selectedCourseItem?.id === _t.id ? "font-bold" : ""}`}>{_t.title}</p>
                                  {data?.course?.settings.progression_type === "linear"
                                    ? ((_i > 0 && mInd === 0) || (mInd > 0 && _i >= 0)) &&
                                      progress.filter((p) =>
                                        p.activity_type !== "enroll" && mInd > 0 && _i === 0
                                          ? p.activity_type === "topic"
                                            ? p.id_course_topic === modules[mInd - 1].items[modules[mInd - 1].items.length - 1]?.id && p.is_completed
                                            : p.id_course_test === modules[mInd - 1].items[modules[mInd - 1].items.length - 1]?.id && p.is_completed
                                          : p.activity_type === "topic"
                                            ? p.id_course_topic === modules[mInd].items[_i - 1]?.id && p.is_completed
                                            : p.id_course_test === modules[mInd].items[_i - 1]?.id && p.is_completed,
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
                        let content = modules.filter((item) => item.id === parseInt(panelProps.panelKey))[0];
                        let topics = content.items?.filter((_t) => _t.type === "topic");
                        let tests = content.items?.filter((_t) => _t.type === "test");
                        return (
                          <div className="flex justify-center items-center">
                            <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                              {panelProps.isActive ? <AiOutlineArrowUp className="w-3.75 h-3.75 text-white" /> : <AiOutlineArrowDown className="w-3.75 h-3.75 text-white" />}
                            </div>
                            <p>
                              {topics && topics.length > 0 ? `${topics.length} ${t("topic")} ${tests.length > 0 ? " | " : ""}` : ""}{" "}
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
        <Content>
          <div className="h-[calc(100vh-100px)] flex flex-col justify-between w-full relative">
            {windowDimension.width > 1080 && (
              <Button
                variant="solid"
                color="yellow"
                className="absolute! top-20 -left-6! h-12! w-12! rounded-full! flex justify-center items-center"
                onClick={() => setCollapsed(!collapsed)}
                icon={collapsed ? <ArrowRight className="w-6! h-6! text-black!" /> : <ArrowLeft className="w-6! h-6! text-black!" />}
              ></Button>
            )}
            <Drawer open={isOpenDrawerMenu} size={"80%"} onClose={closeDrawer} maskClosable={false} extra={[]} className="drawer-learning">
              <div className="flex flex-col h-full">
                <div className="absolute top-5 right-5 flex justify-end">
                  <AiFillCloseCircle className="text-white text-3xl" onClick={closeDrawer} />
                </div>
                <div className="flex flex-col w-full p-6 bg-[#010202]">
                  <p className="text-white">{t("Course")}</p>
                  <p className="text-[20px] font-bold text-white">{data?.course?.name}</p>
                </div>
                <div className="w-full">
                  {modules?.length > 0 && (
                    <Collapse
                      className="collapse-learning"
                      size="large"
                      bordered={false}
                      items={modules.map((item, mInd) => {
                        return {
                          key: item.id,
                          label: (
                            <div className="flex flex-col">
                              <div className="p-2 cursor-pointer flex items-center">
                                {progress.length > 0 && progress.filter((p) => p.activity_type === "module" && p.id_course_module === item.id).length > 0 ? (
                                  <div className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                    <AiOutlineCheck className="text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                )}
                                <p className={`text-sm ml-2`} onClick={() => selectCourseItem(item)}>
                                  {item.title}
                                </p>
                                {data?.course?.settings.progression_type === "linear"
                                  ? mInd > 0 &&
                                    progress.filter((p) => p.activity_type === "module" && p.id_course_module === modules[mInd - 1].id).length === 0 && (
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
                                <div onClick={() => selectCourseItem(_t)} className="p-2 pl-6 cursor-pointer flex items-center">
                                  {progress.length > 0 && progress.filter((p) => p.is_completed && (p.id_course_topic === _t.id || p.id_course_test === _t.id)).length > 0 ? (
                                    <div className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                      <AiOutlineCheck className="text-white" />
                                    </div>
                                  ) : (
                                    <div className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                  )}
                                  <p className={`text-sm ml-2 ${selectedCourseItem?.id === _t.id ? "font-bold" : ""}`}>{_t.title}</p>
                                  {data?.course?.settings.progression_type === "linear"
                                    ? ((_i > 0 && mInd === 0) || (mInd > 0 && _i >= 0)) &&
                                      progress.filter((p) =>
                                        mInd > 0 && _i === 0
                                          ? p.activity_type === "topic"
                                            ? p.id_course_topic === modules[mInd - 1].items[modules[mInd - 1].items.length - 1]?.id && p.is_completed
                                            : p.id_course_test === modules[mInd - 1].items[modules[mInd - 1].items.length - 1]?.id && p.is_completed
                                          : p.activity_type === "topic"
                                            ? p.id_course_topic === modules[mInd].items[_i - 1]?.id && p.is_completed
                                            : p.id_course_test === modules[mInd].items[_i - 1]?.id && p.is_completed,
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
                        let content = modules.filter((item) => item.id === parseInt(panelProps.panelKey))[0];
                        let topics = content.items?.filter((_t) => _t.type === "topic");
                        let tests = content.items?.filter((_t) => _t.type === "test");
                        return (
                          <div className="flex justify-center items-center">
                            <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                              {panelProps.isActive ? <AiOutlineArrowUp className="w-3.75 h-3.75 text-white" /> : <AiOutlineArrowDown className="w-3.75 h-3.75 text-white" />}
                            </div>
                            <p>
                              {topics ? `${topics.length} ${t("topic")} ${tests.length > 0 ? " | " : ""}` : ""} {` ${tests.length > 0 ? `${tests.length} ${t("test")}` : ""}`}
                            </p>
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            </Drawer>
            <div className="overflow-y-auto">
              <div className="flex lg:hidden justify-between bg-white p-6 gap-8">
                {selectedCourseItem?.type && (
                  <>
                    {allItems && allItems.length > 0 && selectedCourseItem.id !== allItems[0].id && (
                      <Button size="large" icon={<RxChevronLeft />} className="button-learning-header mr-2" onClick={() => previous()}></Button>
                    )}
                  </>
                )}
                <div className="flex flex-col justify-center items-center w-full">
                  <p className="leading-[1em] text-[16px] lg:text-[24px] font-bold uppercase mb-2">
                    {progressPercentage}% {t("Complete")}
                  </p>
                  <Progress strokeColor={"#2F8351"} percent={progressPercentage} className="w-full" showInfo={false} />
                </div>

                {selectedCourseItem?.type && (
                  <>
                    <Button size="large" icon={<RxChevronRight />} iconPlacement="end" className="button-learning-header" onClick={() => next()} disabled={!allowNext}></Button>
                  </>
                )}
              </div>
              <div className="p-8 lg:pl-12!">
                {progress?.length > 0 &&
                progress.filter(
                  (p) => p.activity_type === selectedCourseItem?.type && p[`id_course_${selectedCourseItem?.type}`] === selectedCourseItem?.id && p.is_completed === 1,
                ).length > 0 ? (
                  <div className="p-4 bg-black flex justify-between items-center">
                    <p className="text-[20px] text-white">{selectedCourseItem?.title}</p>
                    <div className="p-4 bg-[#2F8351]">
                      <p className="text-white text-[16px]">{t("Completed")}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[26px] text-black font-bold">{selectedCourseItem?.title}</p>
                )}
                {selectedCourseItem &&
                Object.keys(selectedCourseItem).length > 0 &&
                (selectedCourseItem.type === "topic" || selectedCourseItem.type === "test") &&
                (data.course.material || data.course.objection) ? (
                  <Tabs
                    centered={windowDimension.width < 768}
                    items={[
                      {
                        key: "1",
                        label: (
                          <div className="flex flex-col lg:flex-row p-2 justify-center items-center">
                            <CourseIcon className="w-4 h-4 sm:w-6 sm:h-6 sm:mr-2" /> <p className="font-bold text-[14px] mt-2 sm:mt-0 sm:text-[20px]">{t("Course")}</p>
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
                      data.course.material && {
                        key: "2",
                        label: (
                          <div className="flex flex-col lg:flex-row p-2 justify-center items-center">
                            <MaterialIcon className="w-4 h-4 sm:w-6 sm:h-6 sm:mr-2" /> <p className="font-bold text-[14px] mt-2 sm:mt-0 sm:text-[20px]">{t("Materials")}</p>
                          </div>
                        ),
                        children: <CourseMaterial data={data.course} />,
                      },
                      data.course.objection && {
                        key: "3",
                        label: (
                          <div className="flex flex-col lg:flex-row  p-2 justify-center items-center">
                            <ObjectionIcon className="w-4 h-4 sm:w-6 sm:h-6 sm:mr-2" /> <p className="font-bold text-[14px] mt-2 sm:mt-0 sm:text-[20px]">{t("Objection books")}</p>
                          </div>
                        ),
                        children: <CourseObjection data={data.course} />,
                      },
                    ]}
                  />
                ) : selectedCourseItem?.type === "topic" ? (
                  <Topic course={data.course} progress={progress} selectedCourseItem={selectedCourseItem} setAllowNext={setAllowNext} modules={modules} allItems={allItems} />
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
                {selectedCourseItem && Object.keys(selectedCourseItem).length > 0 && !selectedCourseItem.type && (
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
            <div>
              <div className="p-6 flex justify-between items-center bg-[#707070]">
                {selectedCourseItem && (
                  <>
                    {selectedCourseItem.type && allItems && allItems.length > 0 && selectedCourseItem.id !== allItems[0].id ? (
                      <Button size="large" icon={<RxChevronLeft />} className="button-learning-header mr-2" onClick={() => previous()}>
                        {t("Previous")}
                      </Button>
                    ) : (
                      <div></div>
                    )}
                    {selectedCourseItem.type && (
                      <Button
                        icon={<RxChevronRight />}
                        iconPlacement="end"
                        type="primary"
                        size="large"
                        onClick={() => next()}
                        disabled={!allowNext}
                        className="button-learning-footer"
                      >
                        {t("Next")}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
export default Learning;
