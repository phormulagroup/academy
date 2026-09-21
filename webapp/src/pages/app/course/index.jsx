import axios from "axios";
import { useEffect, useState } from "react";
import { Button, Empty, Progress } from "antd";
import { useContext } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link, useNavigate, useParams } from "react-router-dom";

import dayjs from "dayjs";
import Lottie from "lottie-react";

import config from "../../../utils/config";
import { getMarginClasses, getPaddingClasses } from "../../../utils/responsive";
import useScrollToTop from "../../../utils/scrollToTop";

import { FaAward, FaRegClock } from "react-icons/fa";
import { FaListCheck } from "react-icons/fa6";
import { AiOutlineCloudDownload, AiOutlinePlayCircle } from "react-icons/ai";

import CertificateIconWhite from "../../../assets/Certificado-digital.svg?react";
import i18n from "../../../utils/i18n";
import { downloadCertificate } from "../../../utils/certificate";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { GridIcon, ListIcon } from "lucide-react";
import Countdown from "../../../components/countdown";
import { Helmet } from "react-helmet";
import { RxChevronUp } from "react-icons/rx";

export default function CourseDetails() {
  const { t, user, windowDimension, selectedLanguage } = useContext(Context);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState("grid");
  const { isVisible: showScrollToTop, scrollToTop } = useScrollToTop();

  let { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) getData();
  }, [user, selectedLanguage]);

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
        if (!canAccess(auxCourse)) continue;

        if (
          user.id_role !== 1 &&
          auxCourse.settings.country_limit &&
          auxCourse.settings.country &&
          !auxCourse.settings.country.includes(user.country)
        )
          auxCourse = null;

        if (auxCourse) {
          let auxObj = {
            course: auxCourse,
          };
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

  function canAccess(obj) {
    let settings = obj.settings;
    if (user.id_role === 1) return true;
    if (settings.course_access_expiration) {
      let today = dayjs();
      if (
        today.diff(
          dayjs(settings.course_access_expiration_dates.start_date).diff(today),
        ) > 0 &&
        today.diff(dayjs(settings.course_access_expiration_dates.end_date)) < 0
      ) {
        return true;
      } else {
        return false;
      }
    } else return true;
  }

  function calcProgress(items, modules) {
    if (items && items.length > 0) {
      // Build a set of visible item references from already-filtered modules
      const visibleItems = new Set();
      modules.forEach((m) => {
        if (m.items && m.items.length > 0) {
          m.items.forEach((item) => {
            const key =
              item.type === "topic" ? `topic_${item.id}` : `test_${item.id}`;
            visibleItems.add(key);
          });
        }
      });

      let steps = visibleItems.size;
      let completed = items.filter(
        (p) =>
          p.is_completed === 1 &&
          p.is_deleted !== 1 &&
          p.activity_type !== "module" &&
          p.activity_type !== "course" &&
          p.activity_type !== "enroll" &&
          ((p.activity_type === "topic" &&
            visibleItems.has(`topic_${p.id_course_topic}`)) ||
            (p.activity_type === "test" &&
              visibleItems.has(`test_${p.id_course_test}`))),
      ).length;

      let progressPercentage = steps > 0 ? (100 * completed) / steps : 0;
      return progressPercentage === 100
        ? 100
        : parseFloat(progressPercentage).toFixed(2);
    }
    return 0;
  }

  function handleDownloadCertificate(item, progress) {
    downloadCertificate(item, progress, user, config, endpoints);
  }

  function updateCourseAvailable(obj) {
    setData((prev) =>
      prev.map((item) =>
        item.course.id === obj.id ? { ...item, is_available: true } : obj,
      ),
    );
  }

  function hasCertificate(course) {
    return course?.id_course_certificate ? true : false;
  }

  function formatDuration(hours, minutes) {
    let duration = "";
    if (hours) duration += `${hours} h`;
    if (minutes) duration += ` ${minutes} m`;
    return duration.trim();
  }

  function countVideosCourse(modules) {
    if (!modules || modules.length === 0) return 0;

    let videoCount = 0;
    modules.forEach((module) => {
      if (module.items && Array.isArray(module.items)) {
        module.items.forEach((item) => {
          if (item.type === "topic" && item.content) {
            try {
              const content =
                typeof item.content === "string"
                  ? JSON.parse(item.content)
                  : item.content;
              if (content?.content && Array.isArray(content.content)) {
                content.content.forEach((block) => {
                  if (block.type === "Video" && block.props?.link) {
                    videoCount++;
                  }
                });
              }
            } catch {
              console.log("Error parsing content for item:", item);
            }
          }
        });
      }
    });

    return videoCount;
  }

  function countActiveTests(modules) {
    if (!modules || modules.length === 0) return 0;

    let activeTestCount = 0;
    modules.forEach((module) => {
      if (module.items && Array.isArray(module.items)) {
        module.items.forEach((item) => {
          if (item.type === "test" && item.status === "published") {
            activeTestCount++;
          }
        });
      }
    });

    return activeTestCount;
  }

  function getCertificateIconClass() {
    return windowDimension.width <= 320
      ? "w-[60px] h-[60px] right-[12px] bottom-[-30px]"
      : windowDimension.width <= 425
        ? "w-[65px] h-[65px] right-[12px] bottom-[-34px]"
        : windowDimension.width < 768
          ? "w-[70px] h-[70px] right-[18px] bottom-[-38px]"
          : windowDimension.width <= 1024
            ? "w-[70px] h-[70px] right-[18px] bottom-[-44px]"
            : windowDimension.width <= 1440
              ? "w-[75px] h-[75px] right-[20px] bottom-[-38px]"
              : windowDimension.width < 1920
                ? "w-[85px] h-[85px] right-[24px] bottom-[-40px]"
                : "w-[90px] h-[90px] right-[24px] bottom-[-40px]";
  }

  function getCourseInfoItems(course, modules) {
    const items = [];

    // Informações do certificado
    items.push({
      id: "certificate",
      icon: FaAward,
      label: hasCertificate(course)
        ? t("With certificate")
        : t("Without certificate"),
    });

    // Vídeos do curso
    const videoCount = countVideosCourse(modules);
    items.push({
      id: "videos",
      icon: AiOutlinePlayCircle,
      label: `${videoCount} ${videoCount === 1 ? t("Video") : t("Videos")}`,
    });

    // Duração do curso
    const duration =
      course.settings?.duration_hours || course.settings?.duration_minutes
        ? formatDuration(
            course.settings.duration_hours,
            course.settings.duration_minutes,
          )
        : t("No duration");
    items.push({
      id: "duration",
      icon: FaRegClock,
      label: duration,
    });

    // Testes ativos do curso
    const testCount = countActiveTests(modules);
    items.push({
      id: "tests",
      icon: FaListCheck,
      label: `${testCount} ${testCount === 1 ? t("Active Test") : t("Active Tests")}`,
    });

    return items;
  }

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
      <div
        className={`container mx-auto ${getPaddingClasses(windowDimension)} ${getMarginClasses(windowDimension)}`}>
        <div className="flex flex-col justify-center items-center mb-8 sm:mb-12 pb-2 sm:pb-4">
          <p className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-center text-[#163986]">
            {t("Online Courses")} - Bial Academy
          </p>
          <p className="italic text-center text-[14px] sm:text-[16px] lg:text-[18px] text-[#163986] mt-2 sm:mt-3">
            Keeping training in mind
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full col-span-3">
            <Lottie
              animationData={trailLoadingAnimation}
              loop={true}
              className="max-w-30"
            />
          </div>
        ) : data.length > 0 ? (
          <div>
            {windowDimension.width > 768 && (
              <div className="col-span-3 flex justify-end items-center gap-4 mb-8">
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
              </div>
            )}
            <div
              className={`grid ${(viewType === "list" && windowDimension.width > 640) || windowDimension.width < 700 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"} gap-5 sm:gap-7 lg:gap-8`}>
              {/* CARD COURSE */}
              {data.map((item) => (
                <div
                  className={`shadow-[0px_3px_6px_#00000029] rounded-[5px] ${viewType === "list" && windowDimension.width > 640 ? "flex" : "flex flex-col"} ${viewType === "list" && windowDimension.width > 640 ? "col-span-3" : "col-span-1"} overflow-hidden`}>
                  <div
                    className={`${viewType === "grid" ? "h-48 sm:h-60 lg:h-75 rounded-tl-[5px] rounded-tr-[5px]" : viewType === "list" && windowDimension.width > 640 ? "h-40 sm:h-full sm:w-40 lg:w-50 rounded-bl-[5px] rounded-tl-[5px]" : "h-48 sm:h-60 lg:h-75 rounded-tl-[5px] rounded-tr-[5px]"} bg-center bg-cover bg-no-repeat p-3 sm:p-4 lg:p-6 flex justify-start items-end relative`}
                    style={{
                      backgroundImage: item.course?.thumbnail
                        ? `url(${config.server_ip}/media/${item.course?.thumbnail})`
                        : "none",
                      backgroundColor: item.course?.thumbnail
                        ? "rgba(0, 0, 0, 0.05)"
                        : "rgb(0, 0, 0)",
                      backgroundBlendMode: "overlay",
                    }}>
                    {(viewType === "grid" || windowDimension.width <= 640) && (
                      <div className="p-[6px_12px] sm:p-[8px_16px] lg:p-[8px_20px] bg-white border border-[#163986] rounded-[40px] max-w-[250px]">
                        <p
                          className={`font-bold text-[#163986] truncate ${viewType === "list" ? "text-[12px] sm:text-[14px]" : "text-[13px] sm:text-[15px] lg:text-[18px]"}`}
                          style={{
                            fontSize:
                              viewType === "grid" &&
                              windowDimension.width > 1200
                                ? "18px"
                                : "inherit",
                          }}>
                          {item.course?.name}
                        </p>
                      </div>
                    )}
                    {(viewType === "grid" ||
                      (viewType === "list" && windowDimension.width <= 640)) &&
                      calcProgress(item.progress, item.modules) === 100 && (
                        <CertificateIconWhite
                          className={`absolute z-10 rounded-full shadow-[0px_3px_6px_#00000029] ${getCertificateIconClass()}`}
                        />
                      )}
                  </div>
                  <div
                    className={`w-full flex-1 ${viewType === "list" && windowDimension.width > 640 ? "grid grid-cols-5" : "flex flex-col"}`}>
                    <div
                      className={`bg-[#C5CEE1] ${viewType === "list" && windowDimension.width > 640 ? "col-span-4 grid grid-cols-3 gap-6 lg:gap-10" : "col-span-1"} p-4 sm:p-5 md:p-6 lg:p-6`}>
                      <div className="flex flex-col col-span-3">
                        {/* Course name for list view on desktop */}
                        {viewType === "list" && windowDimension.width > 640 && (
                          <div className="mb-4">
                            <div className="p-[6px_12px] sm:p-[8px_16px] bg-white border border-[#163986] rounded-[40px] inline-block max-w-full">
                              <p className="font-bold text-[#163986] text-[13px] sm:text-[15px] lg:text-[18px] line-clamp-1">
                                {item.course?.name}
                              </p>
                            </div>
                          </div>
                        )}
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
                        <div className="mt-2 sm:mt-2 lg:mt-[6px] flex flex-col justify-center items-center">
                          {calcProgress(item.progress, item.modules) === 100 ? (
                            <>
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
                                  {t("completed")}
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
                                      % {t("completed")}
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
                                    {t("Not enrolled")}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Informações do curso */}
                          {(() => {
                            const infoItems = getCourseInfoItems(
                              item.course,
                              item.modules,
                            );

                            // For list view, split into 2 groups (left and right)
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
                            // Default grid layout for grid/mobile view - split into left and right groups
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
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="px-4 sm:px-4 md:px-4 lg:px-6 py-4 sm:py-6 md:py-4 lg:py-6 flex flex-col justify-center items-center w-full flex-1">
                      {/* Certificate icon for list view */}
                      {viewType === "list" &&
                        windowDimension.width > 640 &&
                        calcProgress(item.progress, item.modules) === 100 && (
                          <div className="mb-8 flex justify-center">
                            <CertificateIconWhite
                              className={`rounded-full shadow-[0px_3px_6px_#00000029] ${getCertificateIconClass()}`}
                            />
                          </div>
                        )}
                      {/* Action button: Review/Start/Enter or Available countdown */}
                      {canAccess(item.course) || item.is_available ? (
                        <Link
                          to={`/${i18n.language}/courses/${item.course.slug}`}
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
                      ) : (
                        <div className="flex flex-col justify-center items-center">
                          <p className="font-bold text-[12px] sm:text-[14px]">
                            {t("Available in")}
                          </p>
                          <Countdown
                            targetDate={
                              item.course.settings
                                .course_access_expiration_dates.start_date
                            }
                            className="text-[20px]"
                            countdownType="course"
                            updateCourseAvailable={() =>
                              updateCourseAvailable(item.course)
                            }
                          />
                        </div>
                      )}
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
          title="Scroll to top">
          <RxChevronUp className="w-6! h-6! text-black!" />
        </button>
      )}
    </div>
  );
}
