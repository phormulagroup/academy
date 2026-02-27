import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Progress } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useNavigate } from "react-router-dom";
import UserCard from "../../components/app/userCard";
import i18n from "../../utils/i18n";
import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineCheck } from "react-icons/ai";
import { RxCheck, RxChevronDown, RxChevronUp, RxLockClosed } from "react-icons/rx";
import DownloadCloudIcon from "../../assets/download-cloud.svg?react";
import CertificateIconWhite from "../../assets/Certificado-digital.svg?react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import certificate from "../../utils/certificate";
import config from "../../utils/config";

export default function Result() {
  const { user, courses } = useContext(Context);
  const [data, setData] = useState([]);

  const { t } = useTranslation();

  const navigate = useNavigate();

  useEffect(() => {
    console.log(courses);
  }, [courses]);

  useEffect(() => {
    getData();
  }, []);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readByLang, { params: { id_user: user.id, id_lang: user.id_lang } });
      console.log(res);
      if (res.data.courses.length > 0) {
        let auxCourse = [];
        for (let c = 0; c < res.data.courses.length; c++) {
          let aux = {};
          let auxAllItems = [];
          aux.settings = aux.settings ? JSON.parse(aux.settings) : null;

          let courseModules = res.data.modules.filter((m) => m.id_course === res.data.courses[c].id);
          if (courseModules.length > 0) {
            let newModules = [];
            for (let i = 0; i < courseModules.length; i++) {
              courseModules[i].items = courseModules[i].items ? JSON.parse(courseModules[i].items) : null;
              if (courseModules[i].items) {
                for (let y = 0; y < courseModules[i].items.length; y++) {
                  if (courseModules[i].items[y].type === "topic")
                    courseModules[i].items[y] = { type: courseModules[i].items[y].type, ...res.data.topics.filter((_t) => _t.id === courseModules[i].items[y].id)[0] };
                  if (courseModules[i].items[y].type === "test")
                    courseModules[i].items[y] = { type: courseModules[i].items[y].type, ...res.data.tests.filter((_t) => _t.id === courseModules[i].items[y].id)[0] };

                  auxAllItems.push(courseModules[i].items[y]);
                }
                newModules.push(courseModules[i]);
              }
            }

            aux.course = res.data.courses[c];
            aux.modules = newModules;
            aux.progress = res.data.progress.filter((p) => p.id_course === res.data.courses[c].id);
            aux.allItems = auxAllItems;
            auxCourse.push(aux);
          }

          console.log(auxCourse);
          setData(auxCourse);
        }
      }
    } catch (err) {
      console.log(err);
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
            {!isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage}% {t("Completed")}
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
        {(Math.round(progressPercentage * 100) / 100).toFixed(2)}% {t("Completed")}
      </p>
    ) : (
      <p className={`text-[12px] ${progressPercentage === 100 ? "text-[#2F8351]" : "text-[#707070]"} text-nowrap mr-2`}>
        {progressPercentage}% {t("Completed")}
      </p>
    );
  }

  function downloadCertificate(item, progress) {
    console.log(item);
    axios
      .get(endpoints.course_certificate.readById, { params: { id: item.id_course_certificate } })
      .then((res) => {
        certificate.generate(
          {
            background: `${config.server_ip}/media/${res.data[0].background}`,
            text: res.data[0].text,
            fileName: `${item.name}-${user.name.replace(/\s+/g, "-")}.pdf`,
          },
          {
            name: user.name,
            course: item.name,
            date:
              progress.filter((p) => p.id_course === item.id && p.activity_type === "course").length > 0
                ? dayjs(progress.filter((p) => p.id_course === item.id && p.activity_type === "course")[0]?.created_at).format("YYYY-MM-DD HH:mm")
                : null,
          },
        );
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <div className="container m-auto">
        <div className="grid grid-cols-4">
          <UserCard />
          <div className="bg-[#F7F7F7] col-span-3 p-10">
            <p className="text-[26px] font-bold text-center mb-6!">{t("Results")}</p>
            {data.map((c) => (
              <Collapse
                key={`results-collapse-${c.course.id}`}
                className={`${(100 * c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length) / (c.allItems.filter((_c) => _c.type === "topic").length + c.allItems.filter((_c) => _c.type === "test").length) === 100 ? "completed" : "ongoing"} collapse-result`}
                size="large"
                bordered={false}
                items={[
                  {
                    key: c.course.id,
                    label: (
                      <div className="p-2 cursor-pointer flex items-center">
                        <div className="flex flex-col ml-2 w-full">
                          <div className="flex justify-center mb-4">
                            <p className={`text-[20px] font-bold`}>{c.course.name}</p>
                            {data?.course?.settings.progression_type === "linear"
                              ? mInd > 0 &&
                                c.progress.filter((p) => p.id_course === c.course.id && p.activity_type === "module" && p.id_course_module === modules[mInd - 1].id).length ===
                                  0 && (
                                  <div className="flex justify-center items-center ml-4">
                                    <RxLockClosed className="w-3.75 h-3.75" />
                                  </div>
                                )
                              : null}
                            {(100 * c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length) /
                              (c.allItems.filter((_c) => _c.type === "topic").length + c.allItems.filter((_c) => _c.type === "test").length) ===
                              100 && (
                              <div className="flex items-center w-full">
                                <Button className="certificate-button  ml-4" onClick={() => downloadCertificate(c.course, c.progress)}>
                                  <div className="flex justify-center items-center">
                                    <DownloadCloudIcon className="mr-2 h-3" />
                                    <p className="text-[12px]">{t("Certificate")}</p>
                                  </div>
                                </Button>
                                <CertificateIconWhite className="ml-2 h-7" />
                              </div>
                            )}
                          </div>
                          <div className="flex w-full gap-8">
                            <div className="flex items-center">
                              {c.progress.length > 0 && (
                                <p className="text-[12px] text-[#707070] text-nowrap">
                                  {t("Last activity at")} {dayjs(c.progress[c.progress.length - 1].created_at).format("YYYY-MM-DD HH:mm")}
                                </p>
                              )}
                            </div>
                            <div className="flex justify-start items-center w-full">
                              {calcCourseProgress(
                                c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length,
                                c.allItems.filter((_c) => _c.type === "topic").length,
                                c.allItems.filter((_c) => _c.type === "test").length,
                              )}
                              <Progress
                                strokeColor={"#2F8351"}
                                railColor={"#EAEAEA"}
                                percent={
                                  (100 * c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course").length) /
                                  (c.allItems.filter((_c) => _c.type === "topic").length + c.allItems.filter((_c) => _c.type === "test").length)
                                }
                                className="max-w-[300px]"
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
                                c.progress.filter((p) => p.id_course === c.course.id && p.activity_type === "module" && p.id_course_module === item.id).length > 0 ? (
                                  <div className={`w-6.25 h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                    <RxCheck className="text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-6.25 h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                )}
                                <div className="flex flex-col ml-4">
                                  <p className={`text-[16px]`}>{item.title}</p>
                                  <p className="text-[12px] mt-1">
                                    {c.allItems.filter((_t) => _t.type === "topic" && _t.id_course_module === item.id).length > 0
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
                              {item.description && <div className="p-6">{item.description}</div>}
                              <div className="p-6 bg-[#414141] flex justify-between items-center">
                                <p className="text-white">{t("Module content")}</p>
                                <div>{calcProgress(item.items, c.progress)}</div>
                              </div>
                              <div className="p-4">
                                {item.items.map((_t, i) => (
                                  <div className={`p-4 pl-6 cursor-pointer flex items-center ${i < item.items.length - 1 ? "border-b border-[#969696]" : ""}`}>
                                    {c.progress.length > 0 &&
                                    c.progress.filter((p) => p.is_completed === 1 && p.id_course === c.course.id && (p.id_course_topic === _t.id || p.id_course_test === _t.id))
                                      .length > 0 ? (
                                      <div className={`w-6.25 h-6.25 rounded-full bg-[#2F8351] border border-[#2F8351] flex justify-center items-center`}>
                                        <RxCheck className="text-white" />
                                      </div>
                                    ) : (
                                      <div className={`w-6.25 h-6.25 rounded-full bg-white border border-[#2F8351]`}></div>
                                    )}
                                    <p className="text-[14px] ml-2">{_t.title}</p>
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
                                {panelProps.isActive ? <p className="font-bold text-[14px]">{t("Collapase")}</p> : <p className="font-bold text-[14px]">{t("Expand")}</p>}
                              </div>
                              <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                                {panelProps.isActive ? <RxChevronUp className="w-3.75 h-3.75 text-white" /> : <RxChevronDown className="w-3.75 h-3.75 text-white" />}
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
                        {panelProps.isActive ? <p className="font-bold text-[14px]">{t("Collapase")}</p> : <p className="font-bold text-[14px]">{t("Expand")}</p>}
                      </div>
                      <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                        {panelProps.isActive ? <RxChevronUp className="w-3.75 h-3.75 text-white" /> : <RxChevronDown className="w-3.75 h-3.75 text-white" />}
                      </div>
                    </div>
                  );
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
