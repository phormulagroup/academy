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

import { FaAward, FaRegClock } from "react-icons/fa";
import { FaRegSquareCheck } from "react-icons/fa6";
import { AiOutlineCloudDownload, AiOutlinePlayCircle } from "react-icons/ai";

import CertificateIconWhite from "../../../assets/Certificado-digital.svg?react";
import i18n from "../../../utils/i18n";
import { downloadCertificate } from "../../../utils/certificate";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { GridIcon, ListIcon } from "lucide-react";
import Countdown from "../../../components/countdown";
import { Helmet } from "react-helmet";

export default function CourseDetails() {
  const { t, user, windowDimension, selectedLanguage } = useContext(Context);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState("grid");

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

  useEffect(() => {
    console.log("data", data);
  }, [data]);

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
    if (hours) duration += `${hours}h`;
    if (minutes) duration += ` ${minutes}m`;
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

    // Vídeos do curso
    const videoCount = countVideosCourse(modules);
    items.push({
      id: "videos",
      icon: AiOutlinePlayCircle,
      label: `${videoCount} ${videoCount === 1 ? t("Video") : t("Videos")}`,
    });

    // Testes ativos do curso
    const testCount = countActiveTests(modules);
    items.push({
      id: "tests",
      icon: FaRegSquareCheck,
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
      <div className="container mx-auto p-6 mt-10 mb-10">
        <div className="flex flex-col justify-center items-center mb-10">
          <p className="text-[30px] font-bold text-center text-[#163986]">
            {t("Online Courses")} - Bial Academy
          </p>
          <p className="italic text-center text-[21px] text-[#163986]">
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
          <div
            className={`grid ${viewType === "list" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"} gap-0 gap-y-8 sm:gap-8`}>
            <div className="col-span-3 flex justify-end items-center gap-4 mb-4">
              <GridIcon
                className="cursor-pointer"
                onClick={() => setViewType("grid")}
              />
              <ListIcon
                className="cursor-pointer"
                onClick={() => setViewType("list")}
              />
            </div>

            {/* CARD COURSE */}
            {data.map((item) => (
              <div
                className={`shadow-[0px_3px_6px_#00000029] rounded-[5px] ${viewType === "list" ? "flex" : "flex flex-col"} ${viewType === "list" ? "col-span-3" : "col-span-1"}`}>
                <div
                  className={`${viewType === "grid" ? "h-75 rounded-tl-[5px] rounded-tr-[5px]" : "h-full w-50 rounded-bl-[5px] rounded-tl-[5px]"} bg-center bg-cover bg-no-repeat p-6 flex justify-start items-end bg-black relative`}
                  style={{
                    backgroundImage: item.course?.thumbnail
                      ? `url(${config.server_ip}/media/${item.course?.thumbnail})`
                      : "none",
                  }}>
                  <div className="p-[8px_20px_8px_20px] bg-white border border-[#163986] rounded-[40px] max-w-xs">
                    <p
                      className={`font-bold truncate text-[#163986] ${viewType === "list" ? "text-[14px]" : "text-[18px]"}`}>
                      {item.course?.name}
                    </p>
                  </div>
                  {viewType === "grid" &&
                    calcProgress(item.progress, item.modules) === 100 && (
                      <div className="absolute -bottom-4 right-4 rounded-[40px] flex items-center">
                        <CertificateIconWhite className="w-20 h-20" />
                      </div>
                    )}
                </div>
                <div
                  className={`w-full flex-1 ${viewType === "list" ? "grid grid-cols-5" : "flex flex-col"}`}>
                  <div
                    className={`bg-[#F7F7F7] p-6 ${viewType === "list" ? "col-span-4 grid grid-cols-3 gap-10" : "col-span-1"}`}>
                    <div
                      className="flex flex-col col-span-3"
                      // className={`flex flex-col ${item.course.settings?.show_info_on_course_page ? "col-span-1" : "col-span-3 justify-center items-center"}`}
                    >
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
                        className="mt-2 flex flex-col justify-center items-center"
                        // className={`${item.course.settings?.id_trainer ? "mt-4" : "mt-0"} flex flex-col justify-center items-center`}
                      >
                        {calcProgress(item.progress, item.modules) === 100 ? (
                          <>
                            <div className="flex items-center justify-between w-full mb-2 min-h-8.25">
                              <p className="uppercase text-[#2F8351] mb-1">
                                {calcProgress(item.progress, item.modules)}%{" "}
                                {t("completed")}
                              </p>
                              {/* Certificado do Curso */}
                              <Button
                                className="certificate-button"
                                onClick={() =>
                                  handleDownloadCertificate(
                                    item.course,
                                    item.progress,
                                  )
                                }>
                                <div className="flex justify-center items-center">
                                  <AiOutlineCloudDownload className="mr-2 text-[18px]" />
                                  {t("Certificate")}
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
                              railColor="#EAEAEA"
                            />
                          </>
                        ) : (
                          <div className="flex flex-col w-full">
                            {item.progress?.length > 0 ? (
                              <>
                                <div className="flex items-center justify-center w-full mb-3">
                                  <p className="uppercase text-[#163986]">
                                    {calcProgress(item.progress, item.modules)}%{" "}
                                    {t("completed")}
                                  </p>
                                </div>
                                <Progress
                                  percent={calcProgress(
                                    item.progress,
                                    item.modules,
                                  )}
                                  showInfo={false}
                                  strokeColor="#2F8351"
                                  railColor="#EAEAEA"
                                />
                              </>
                            ) : (
                              <div className="flex items-center text-[#163986] font-bold justify-center w-full mb-1">
                                <p>{t("Not enrolled")}</p>
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

                          return (
                            <div className="mt-6 w-full grid grid-cols-2 gap-4">
                              {infoItems.map((infoItem, index) => {
                                const IconComponent = infoItem.icon;
                                return (
                                  <div
                                    key={infoItem.id}
                                    className={`flex items-center ${index % 2 === 1 ? "justify-self-end" : ""}`}>
                                    <IconComponent className="mr-2 text-[18px] text-[#163986]" />
                                    <p className="text-[15px] text-[#163986]">
                                      {infoItem.label}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-0 flex flex-col justify-center items-center w-full flex-1">
                    {canAccess(item.course) || item.is_available ? (
                      <Link
                        to={`/${i18n.language}/courses/${item.course.slug}`}
                        className="w-full! block my-6">
                        {calcProgress(item.progress, item.modules) === 100 ? (
                          <Button
                            size="large"
                            className="w-full! course-button-review">
                            {t("Review")}
                          </Button>
                        ) : (
                          <Button
                            size="large"
                            type="primary"
                            className={`w-full! ${calcProgress(item.progress, item.modules) === 0 ? "course-button-start" : "course-button-enter"}`}>
                            {calcProgress(item.progress, item.modules) === 0
                              ? t("Start")
                              : t("Enter")}
                          </Button>
                        )}
                      </Link>
                    ) : (
                      <div className="flex flex-col justify-center items-center my-6">
                        <p className="font-bold">{t("Available in")}</p>
                        <Countdown
                          targetDate={
                            item.course.settings.course_access_expiration_dates
                              .start_date
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
        ) : (
          <div className="col-span-3 flex flex-col justify-center items-center">
            <Empty description={t("No courses found")} />
          </div>
        )}
      </div>
    </div>
  );
}
