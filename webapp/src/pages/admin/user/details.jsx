import axios from "axios";
import { useContext, useEffect, useRef } from "react";
import { useState } from "react";
import { Button, Collapse, DatePicker, Dropdown, Form, Input, Progress, Select, Tabs, Tag } from "antd";
import { IoMdMore, IoMdRefresh } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import Create from "../../../components/admin/user/create";
import Update from "../../../components/admin/user/update";
import Logs from "../../../components/admin/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { RxCheck, RxChevronDown, RxChevronUp, RxSwitch } from "react-icons/rx";
import { useTranslation } from "react-i18next";
import Status from "../../../components/admin/user/status";
import { useNavigate, useParams } from "react-router-dom";
import UserCard from "../../../components/admin/user/card";
import DownloadCloudIcon from "../../../assets/download-cloud.svg?react";
import CertificateIconWhite from "../../../assets/Certificado-digital.svg?react";
import dayjs from "dayjs";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import TimeIcon from "../../../assets/Backoffice/Tempo.svg?react";
import PassedIcon from "../../../assets/Backoffice/Status-01.svg?react";
import NotPassedIcon from "../../../assets/Backoffice/Status-02.svg?react";
import CorrectIcon from "../../../assets/Backoffice/Pontos.svg?react";
import CalendarIcon from "../../../assets/Backoffice/calendar.svg?react";
import TestIcon from "../../../assets/Backoffice/Teste.svg?react";

export default function UserDetails() {
  const { user, languages } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [countries, setCountries] = useState([]);

  const resultsRef = useRef();
  const { t } = useTranslation();
  const { id } = useParams();
  const [form] = Form.useForm();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, [id]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.user.readById, { params: { id } })
      .then((res) => {
        console.log(res.data);
        setData(res.data.user);
        if (res.data.user) {
          setCountries(
            languages
              .filter((lang) => lang.id === res.data.user.id_lang)
              .flatMap((l) =>
                JSON.parse(l.country).map((c) => ({
                  value: c,
                  label: t(`${c}`),
                  id_lang: l.id,
                })),
              )
              .sort((a, b) => a.label.localeCompare(b.label)),
          );

          delete res.data.user.password;
          form.setFieldsValue(res.data.user);

          prepareData(res);
        }
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function prepareData(res) {
    if (res.data.courses.length > 0) {
      let auxCourse = [];
      for (let c = 0; c < res.data.courses.length; c++) {
        let aux = {};
        let auxAllItems = [];
        let course = res.data.courses[c];
        course.settings = course.settings ? JSON.parse(course.settings) : null;

        if (course.settings && course.settings.country_limit && !course.settings.country.includes(res.data.user.country)) continue;

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
          aux.progress = res.data.progress.filter((p) => p.id_course === res.data.courses[c].id && p.id_user === parseInt(id));
          aux.allItems = auxAllItems;
          auxCourse.push(aux);
        }

        console.log(auxCourse);

        setCourseData(auxCourse);
      }
    }
  }

  function calcCourseProgress(a, b, c) {
    let progressPercentage = (100 * a) / (b + c);
    const isInteger = progressPercentage % 1 === 0;
    return (
      <p className={`text-[12px] ${progressPercentage === 100 ? "text-[#2F8351]" : "text-[#707070]"} text-nowrap mr-2`}>
        {!isInteger ? (Math.round(progressPercentage * 100) / 100).toFixed(2) : progressPercentage}% {t("Completed")}
      </p>
    );
  }

  function downloadCertificate(item, progress) {
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

  function submit(values) {
    console.log(values);
  }

  function scrollToResults() {
    console.log(resultsRef);
    resultsRef.current.scrollIntoView();
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-center">
        <p className="font-bold text-[18px]">{t("Student account")}</p>
        <p className="text-sm cursor-pointer" onClick={() => navigate(`/admin/users`)}>
          « {t("Go back")}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <UserCard user={data} courses={courseData} scrollToResults={scrollToResults} />
        <div className="col-span-3">
          <div className="bg-[#D0D7E7] p-10 flex flex-col h-full">
            <p className="text-[26px] font-bold text-center mb-6!">{t("Account")}</p>
            <Form form={form} onFinish={submit} layout="vertical" className="auth-form">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <Form.Item name="name" label={t("Name")} rules={[{ required: true }]} className="mb-0!">
                    <Input size="large" placeholder="John Doe" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item name="country" label={t("Country")} rules={[{ required: true }]} className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Choose a country")}
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      options={countries.map((item) => ({ label: item.label, value: item.value }))}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Academic background")} name="academic_background" rules={[{ required: true }]} className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Academic background")}
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      options={[
                        { label: "Secondary School", value: "Secondary School" },
                        { label: "University Degree", value: "University Degree" },
                        { label: "PhD", value: "PhD" },
                      ]}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item name="email" label={t("E-mail")} rules={[{ required: true }]} className="mb-0!">
                    <Input type="email" size="large" placeholder="E-mail" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Birth date")} name="birth_date" rules={[{ required: true }]} className="mb-0!" getValueProps={(value) => ({ value: value && dayjs(value) })}>
                    <DatePicker size="large" placeholder="Select birth date" className="w-full" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Bial's starting date")}
                    name="bial_starting_date"
                    rules={[{ required: true }]}
                    className="mb-0!"
                    getValueProps={(value) => ({ value: value && dayjs(value) })}
                  >
                    <DatePicker size="large" placeholder="Select Bial's starting date" className="w-full" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item label={t("Password")} name="password" rules={[{ required: false }]} className="mb-0!">
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Confirm password")}
                    name="confirm_password"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: false,
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error(t("The passwords does not match!")));
                        },
                      }),
                    ]}
                    className="mb-0!"
                  >
                    <Input.Password size="large" placeholder="●●●●●●●" />
                  </Form.Item>
                </div>
                <div className="flex justify-end items-end">
                  <Button className="w-full" size="large" variant="solid" color="blue">
                    {t("Save")}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
      {courseData.length > 0 && (
        <div id="results" ref={resultsRef} className="grid grid-cols-4 gap-4">
          <div></div>
          <div className=" col-span-3 mt-10">
            <p className="text-[26px] font-bold text-center mb-6!">{t("Results")}</p>
            {courseData.map((c) => {
              const tests = c.allItems
                .filter((_c) => _c.type === "test")
                .map((_t, _i) => {
                  let tries = c.progress.filter((_p) => _p.activity_type === "test" && _p.id_course_test === _t.id);
                  let testSettings = _t.settings ? JSON.parse(_t.settings) : null;
                  let maxTries = 0;
                  let time = null;
                  let questions = [];
                  if (testSettings) {
                    time = testSettings.time;
                    maxTries = testSettings.retries_allowed;
                  }
                  if (_t.question) questions = JSON.parse(_t.question);
                  return {
                    key: `${_t.id}-test`,
                    label:
                      _i === 0 ? (
                        <div>
                          <p className="mt-6 text-[12px] mb-2">{t("Tests")}</p>
                          <div className="test-title">
                            <p>{_t.title}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p>{_t.title}</p>
                        </div>
                      ),
                    children: (
                      <div className="flex flex-col w-full!">
                        <div className="grid grid-cols-5 mb-6">
                          <div className="flex flex-col justify-center items-center gap-2">
                            <p className="italic text-[11px]">Status</p>
                            {c.progress.filter((_p) => _p.activity_type === "test" && _p.id_course_test === _t.id).length > 0 ? (
                              <>
                                <p className="text-sm">
                                  {c.progress.filter((_p) => _p.activity_type === "test" && _p.id_course_test === _t.id && _p.is_completed).length > 0
                                    ? t("Completed")
                                    : c.progress.filter((_p) => _p.activity_type === "test" && _p.id_course_test === _t.id && _p.is_completed === 0).length === maxTries
                                      ? "Not passed"
                                      : "In progress"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm">{t("Not started")}</p>
                              </>
                            )}
                          </div>

                          <div className="flex flex-col justify-center items-center gap-2">
                            <p className="text-[11px]">{t("Tries")}</p>
                            <p className="text-sm">
                              {tries.length}/{maxTries}
                            </p>
                          </div>

                          <div className="flex flex-col justify-center items-center gap-2">
                            <p className="text-[11px]">{t("Questions")}</p>
                            <p className="text-sm">{questions.length}</p>
                          </div>

                          <div className="flex flex-col justify-center items-center gap-2">
                            <p className="text-[11px]">{t("Time")}</p>
                            <p className="text-sm">{time} min</p>
                          </div>

                          <div className="flex flex-col justify-center items-center gap-2">
                            <p className="text-[11px]">{t("Passing score")}</p>
                            <p className="text-sm">{testSettings.passing_score ?? "80"}%</p>
                          </div>
                        </div>
                        <div className="p-4 border border-dashed rounded-[5px]">
                          <Tabs
                            className="tabs-tries"
                            type="card"
                            items={tries.map((_try, _tryInd) => {
                              let meta_data = _try.meta_data ? JSON.parse(_try.meta_data) : {};
                              let testTime = "";
                              let answers = [];
                              if (meta_data) {
                                testTime = meta_data.time > 60 ? `${Math.floor(meta_data.time / 60)} min` : `${meta_data.time} s`;
                                answers = meta_data.items;
                              }
                              return {
                                key: `${_try.id}-try`,
                                label: `${t("Try")} nº${_tryInd + 1}`,
                                children: (
                                  <div className="grid grid-cols-5">
                                    <div className="flex flex-col justify-center items-center gap-2">
                                      <p className="text-[11px]">{t("Status")}</p>
                                      {_try.is_completed ? <PassedIcon className="text-green-400 w-10 h-10" /> : <NotPassedIcon className="text-green-400 w-10 h-10" />}
                                      <p className="text-sm">{_try.is_completed ? t("Passed") : t("Not passed")}</p>
                                    </div>

                                    <div className="flex flex-col justify-center items-center gap-2">
                                      <p className="text-[11px]">{t("Correct")}</p>
                                      <CorrectIcon className="text-[#010202] w-10 h-10" />
                                      <p className="text-sm">
                                        {answers.filter((_a) => _a.is_correct).length}/{answers.length}
                                      </p>
                                    </div>

                                    <div className="flex flex-col justify-center items-center gap-2">
                                      <p className="text-[11px]">{t("Time")}</p>
                                      <TimeIcon className="text-[#010202] w-10 h-10" />
                                      <p className="text-sm">{testTime}</p>
                                    </div>

                                    <div className="flex flex-col justify-center items-center gap-2">
                                      <p className="text-[11px]">{t("Date")}</p>
                                      <CalendarIcon className="text-[#010202] w-10 h-10" />
                                      <p className="text-sm">{dayjs(_try.created_at).format("DD/MM/YYYY")}</p>
                                    </div>

                                    <div className="flex flex-col justify-center items-center gap-2">
                                      <p className="text-[11px]">{t("Hour")}</p>
                                      <ThumbsUp className="text-[#010202] w-10 h-10" />
                                      <p className="text-sm">{dayjs(_try.created_at).format("HH:mm")}</p>
                                    </div>
                                  </div>
                                ),
                              };
                            })}
                          />
                        </div>
                      </div>
                    ),
                  };
                });

              const tabsInside = [
                {
                  key: `${c.course.id}_course`,
                  label: (
                    <div>
                      <p className="text-[12px] mb-2">{t("Course")}</p>
                      <div className="course-title">
                        <p>{c.course.name}</p>
                      </div>
                    </div>
                  ),
                  children: (
                    <div>
                      <div className="grid grid-cols-5">
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Status")}</p>
                          {c.progress.length > 0 ? (
                            c.progress.filter((_p) => _p.activity_type === "course" && _p.is_completed).length > 0 ? (
                              <>
                                <ThumbsUp className="text-green-400 w-10 h-10" />
                                <p className="text-sm">{t("Passed")}</p>
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="text-green-400 w-10 h-10" />
                                <p className="text-sm">{t("In progress")}</p>
                              </>
                            )
                          ) : (
                            <>
                              <ThumbsDown className="text-green-400 w-10 h-10" />
                              <p className="text-sm">{t("Not started")}</p>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Modules")}</p>
                          <ThumbsUp
                            className={`${c.progress.filter((_p) => _p.activity_type === "module" && _p.is_completed).length === c.modules.length ? "text-green-400" : "text-[#010202]"} w-10 h-10`}
                          />
                          <p className="text-sm">
                            {c.progress.filter((_p) => _p.activity_type === "module" && _p.is_completed).length}/{c.modules.length}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Topics")}</p>
                          <ThumbsUp
                            className={`${c.progress.filter((_p) => _p.activity_type === "topic" && _p.is_completed).length === c.allItems.filter((_c) => _c.type === "topic").length ? "text-green-400" : "text-[#010202]"} w-10 h-10`}
                          />
                          <p className="text-sm">
                            {c.progress.filter((_p) => _p.activity_type === "topic" && _p.is_completed).length}/{c.allItems.filter((_c) => _c.type === "topic").length}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Tests")}</p>
                          <TestIcon
                            className={`${c.progress.filter((_p) => _p.activity_type === "test" && _p.is_completed).length === c.allItems.filter((_c) => _c.type === "test").length ? "text-green-400" : "text-[#010202]"} w-10 h-10`}
                          />
                          <p className="text-sm">
                            {c.progress.filter((_p) => _p.activity_type === "test" && _p.is_completed).length}/{c.allItems.filter((_c) => _c.type === "test").length}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Start Date")}</p>
                          <CalendarIcon className="text-green-400 w-10 h-10" />
                          <p className="text-sm">
                            {c.progress.filter((_p) => _p.activity_type === "enroll").length > 0
                              ? dayjs(c.progress.filter((_p) => _p.activity_type === "enroll")[0].created_at).format("DD/MM/YYYY")
                              : t("Not started")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                },
                ...tests,
              ];

              return (
                <Collapse
                  key={`results-collapse-${c.course.id}`}
                  className={`${c.progress.filter((p) => p.is_completed === 1 && p.activity_type === "course" && p.id_course === c.course.id).length > 0 ? "completed" : "ongoing"} collapse-result`}
                  size="large"
                  bordered={false}
                  items={[
                    {
                      key: c.course.id,
                      label: (
                        <div className="p-2 cursor-pointer flex items-center w-full!">
                          <div className="flex flex-col ml-2 w-full">
                            <div className="flex mb-4">
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
                              {(100 *
                                c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll")
                                  .length) /
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
                                {c.progress.length > 0 ? (
                                  <p className="text-[12px] text-[#707070] text-nowrap">
                                    {t("Last activity at")} {dayjs(c.progress[c.progress.length - 1].created_at).format("YYYY-MM-DD HH:mm")}
                                  </p>
                                ) : (
                                  <p className="text-[12px] text-[#707070] text-nowrap">{t("Not started")}</p>
                                )}
                              </div>
                              <div className="flex justify-start items-center w-full">
                                {calcCourseProgress(
                                  c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll")
                                    .length,
                                  c.allItems.filter((_c) => _c.type === "topic").length,
                                  c.allItems.filter((_c) => _c.type === "test").length,
                                )}
                                <Progress
                                  strokeColor={"#2F8351"}
                                  railColor={"#EAEAEA"}
                                  percent={
                                    (100 *
                                      c.progress.filter((p) => p.is_completed === 1 && p.activity_type !== "module" && p.activity_type !== "course" && p.activity_type !== "enroll")
                                        .length) /
                                    (c.allItems.filter((_c) => _c.type === "topic").length + c.allItems.filter((_c) => _c.type === "test").length)
                                  }
                                  className="max-w-75"
                                  showInfo={false}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ),
                      children: (
                        <div>
                          <Tabs tabPlacement="start" type="card" items={tabsInside} size="large" className="result-tab-course-item" />
                        </div>
                      ),
                    },
                  ]}
                  expandIconPlacement="end"
                  expandIcon={(panelProps) => {
                    return (
                      <div className="flex justify-center items-center">
                        <div className="mr-2">
                          {panelProps.isActive ? <p className="font-bold text-sm">{t("Collapase")}</p> : <p className="font-bold text-sm">{t("Expand")}</p>}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#FFC600] flex justify-center items-center mr-2">
                          {panelProps.isActive ? <RxChevronUp className="w-3.75 h-3.75 text-white" /> : <RxChevronDown className="w-3.75 h-3.75 text-white" />}
                        </div>
                      </div>
                    );
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
