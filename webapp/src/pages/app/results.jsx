import axios from "axios";
import { useEffect, useState } from "react";
import { Button, Collapse, Progress } from "antd";
import { useContext } from "react";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";
import UserCard from "../../components/app/user/card";
import { RxCheck, RxChevronDown, RxChevronUp } from "react-icons/rx";
import DownloadCloudIcon from "../../assets/download-cloud.svg?react";
import CertificateIconWhite from "../../assets/Certificado-digital.svg?react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { downloadCertificate } from "../../utils/certificate";
import config from "../../utils/config";

export default function Result() {
  const { user, selectedLanguage } = useContext(Context);
  const [data, setData] = useState([]);
  const [coursesData, setCoursesData] = useState([]);

  const { t } = useTranslation();

  const navigate = useNavigate();

  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      getData();
    }
  }, [user, selectedLanguage]);

  function getData() {
    const params = {
      id: user.id,
      id_role: user.id_role,
    };
    // For admins: pass the selected language; for students: no parameter needed
    if (user.id_role === 1 && selectedLanguage) {
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

        // Only apply country limit for regular students, not admins
        if (
          res.data.user.id_role !== 1 &&
          course.settings &&
          course.settings.country_limit &&
          !course.settings.country.includes(res.data.user.country)
        ) {
          // console.log("Course skipped due to country limit:", course.name);
          continue;
        }

        let courseModules = res.data.modules.filter(
          (m) => m.id_course === course.id,
        );

        // Always add course, regardless of modules
        aux.course = course;
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
                  if (
                    testData &&
                    testData.is_deleted !== 1 &&
                    (res.data.user.id_role === 1 || testData.status !== "draft")
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

        auxCourse.push(aux);
        // console.log("Course added:", course.name, "Modules:", courseModules.length);
      }

      // console.log("Total courses prepared:", auxCourse.length);
      setCoursesData(auxCourse);
    } else {
      // console.log("No courses returned from server");
    }
  }

  function calcProgress(items, progress) {
    if (items && items.length > 0) {
      let completed = items
        .map(
          (item) =>
            progress.filter(
              (p) =>
                p.is_completed === 1 &&
                p.is_deleted !== 1 &&
                p.id_course_module === item.id_course_module &&
                p.activity_type === item.type &&
                (item.id === p.id_course_topic || item.id === p.id_course_test),
            ).length,
        )
        .reduce((acc, v) => acc + v, 0);

      let progressPercentage = (100 * completed) / items.length;
      const isInteger = progressPercentage % 1 === 0;
      return (
        <p className="text-white">
          <span className="font-bold uppercase">
            {!isInteger
              ? (Math.round(progressPercentage * 100) / 100).toFixed(2)
              : progressPercentage}
            % {t("Completed")}
          </span>{" "}
          | {completed}/{items.length} {t("Steps")}
        </p>
      );
    }
    return <p></p>;
  }

  function calcCourseProgress(a, b, c) {
    let progressPercentage = (100 * a) / (b + c);
    const isInteger = progressPercentage % 1 === 0;
    return !isInteger ? (
      <p className={"text-[12px] text-[#707070] text-nowrap mr-2"}>
        {(Math.round(progressPercentage * 100) / 100).toFixed(2)}%{" "}
        {t("Completed")}
      </p>
    ) : (
      <p
        className={`text-[12px] ${progressPercentage === 100 ? "text-[#2F8351]" : "text-[#707070]"} text-nowrap mr-2`}>
        {progressPercentage}% {t("Completed")}
      </p>
    );
  }

  function handleDownloadCertificate(item, progress) {
    downloadCertificate(item, progress, user, config, endpoints);
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <div className="container m-auto">
        <div className="grid grid-cols-4">
          <UserCard courses={coursesData} />
          <div className="bg-[#F7F7F7] col-span-3 p-10">
            <p className="text-[26px] font-bold text-center mb-6!">
              {t("Results")}
            </p>
            {coursesData.map((c) => {
              const validCompletions = c.progress.filter(
                (p) =>
                  p.is_completed === 1 &&
                  p.activity_type !== "module" &&
                  p.activity_type !== "course" &&
                  p.activity_type !== "enroll" &&
                  c.allItems.some(
                    (item) =>
                      (p.activity_type === "topic" &&
                        item.type === "topic" &&
                        p.id_course_topic === item.id) ||
                      (p.activity_type === "test" &&
                        item.type === "test" &&
                        p.id_course_test === item.id),
                  ),
              ).length;
              const totalItems = c.allItems.length;
              const progressPercent =
                totalItems > 0 ? (100 * validCompletions) / totalItems : 0;

              return (
                <Collapse
                  key={`results-collapse-${c.course.id}`}
                  className={`${progressPercent === 100 ? "completed" : "ongoing"} collapse-result`}
                  size="large"
                  bordered={false}
                  items={[
                    {
                      key: c.course.id,
                      label: (
                        <div className="p-2 cursor-pointer flex items-center">
                          <div className="flex flex-col ml-2 w-full">
                            <div className="flex mb-4">
                              <p className={`text-[20px] font-bold`}>
                                {c.course.name}
                              </p>
                              {progressPercent === 100 && (
                                <div className="flex items-center w-full">
                                  <Button
                                    className="certificate-button  ml-4"
                                    onClick={() =>
                                      handleDownloadCertificate(
                                        c.course,
                                        c.progress,
                                      )
                                    }>
                                    <div className="flex justify-center items-center">
                                      <DownloadCloudIcon className="mr-2 h-3" />
                                      <p className="text-[12px]">
                                        {t("Certificate")}
                                      </p>
                                    </div>
                                  </Button>
                                  <CertificateIconWhite className="ml-2 h-7" />
                                </div>
                              )}
                            </div>
                            <div className="flex w-full gap-8">
                              {c.progress.length > 0 && (
                                <div className="flex items-center">
                                  <p className="text-[12px] text-[#707070] text-nowrap">
                                    {t("Last activity at")}{" "}
                                    {dayjs(
                                      c.progress[c.progress.length - 1]
                                        .created_at,
                                    ).format("YYYY-MM-DD HH:mm")}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-start items-center w-full">
                                {calcCourseProgress(
                                  validCompletions,
                                  totalItems,
                                  0,
                                )}
                                <Progress
                                  strokeColor={"#2F8351"}
                                  railColor={"#EAEAEA"}
                                  percent={progressPercent}
                                  className="max-w-75"
                                  showInfo={false}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ),
                      children: (
                        <Collapse
                          className="collapse-course"
                          size="large"
                          bordered={false}
                          items={c.modules?.map((item) => ({
                            key: item.id,
                            label: (
                              <div className="flex flex-col">
                                <div className="p-2 cursor-pointer flex">
                                  {c.progress.length > 0 &&
                                  c.progress.filter(
                                    (p) =>
                                      p.id_course === c.course.id &&
                                      p.activity_type === "module" &&
                                      p.id_course_module === item.id,
                                  ).length > 0 ? (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                      <RxCheck className="text-white" />
                                    </div>
                                  ) : (
                                    <div
                                      className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                  )}
                                  <div className="flex flex-col ml-4">
                                    <p className={`text-[16px]`}>
                                      {item.title}
                                    </p>
                                    <p className="text-[12px] mt-1">
                                      {c.allItems.filter(
                                        (_t) =>
                                          _t.type === "topic" &&
                                          _t.id_course_module === item.id,
                                      ).length > 0
                                        ? `${c.allItems.filter((_t) => _t.type === "topic" && _t.id_course_module === item.id).length} ${t("topic")} ${c.allItems.length > 0 && c.allItems.filter((_t) => _t.type === "test" && _t.id_course_module === item.id).length > 0 ? " | " : ""}`
                                        : ""}{" "}
                                      {` ${c.allItems.filter((_t) => _t.type === "test" && _t.id_course_module === item.id).length > 0 && c.allItems.filter((_t) => _t.type === "test" && _t.id_course_module === item.id).length > 0 ? `${c.allItems.filter((_t) => _t.type === "test" && _t.id_course_module === item.id).length} ${t("test")}` : ""}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ),
                            children: (
                              <div className="flex flex-col">
                                {item.description && (
                                  <div className="p-6">{item.description}</div>
                                )}
                                <div className="p-6 bg-[#414141] flex justify-between items-center">
                                  <p className="text-white">
                                    {t("Module content")}
                                  </p>
                                  <div>
                                    {calcProgress(item.items, c.progress)}
                                  </div>
                                </div>
                                <div className="p-4">
                                  {item.items.map((_t, i) => (
                                    <div
                                      className={`p-4 pl-6 cursor-pointer flex items-center ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""}`}>
                                      {c.progress.length > 0 &&
                                      c.progress.filter(
                                        (p) =>
                                          p.is_completed === 1 &&
                                          p.id_course === c.course.id &&
                                          (p.id_course_topic === _t.id ||
                                            p.id_course_test === _t.id),
                                      ).length > 0 ? (
                                        <div
                                          className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                          <RxCheck className="text-white" />
                                        </div>
                                      ) : (
                                        <div
                                          className={`w-6.25 h-6.25 min-w-6.25 min-h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                      )}
                                      <p className="text-sm ml-2">{_t.title}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ),
                          }))}
                          expandIconPlacement="end"
                          expandIcon={(panelProps) => {
                            return (
                              <div className="flex justify-center items-center">
                                <div className="mr-2">
                                  {panelProps.isActive ? (
                                    <p className="font-bold text-sm">
                                      {t("Collapse")}
                                    </p>
                                  ) : (
                                    <p className="font-bold text-sm">
                                      {t("Expand")}
                                    </p>
                                  )}
                                </div>
                                <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                                  {panelProps.isActive ? (
                                    <RxChevronUp className="w-3.75 h-3.75 text-white" />
                                  ) : (
                                    <RxChevronDown className="w-3.75 h-3.75 text-white" />
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                      ),
                    },
                  ]}
                  expandIconPlacement="end"
                  expandIcon={(panelProps) => {
                    return (
                      <div className="flex justify-center items-center">
                        <div className="mr-2">
                          {panelProps.isActive ? (
                            <p className="font-bold text-sm">{t("Collapse")}</p>
                          ) : (
                            <p className="font-bold text-sm">{t("Expand")}</p>
                          )}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                          {panelProps.isActive ? (
                            <RxChevronUp className="w-3.75 h-3.75 text-white" />
                          ) : (
                            <RxChevronDown className="w-3.75 h-3.75 text-white" />
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
