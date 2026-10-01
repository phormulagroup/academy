import axios from "axios";
import { useContext, useEffect, useRef } from "react";
import { useState } from "react";
import {
  Button,
  Collapse,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  Progress,
  Select,
  Tabs,
} from "antd";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { RxChevronDown, RxChevronUp } from "react-icons/rx";
import { useTranslation } from "react-i18next";

import { useNavigate, useParams } from "react-router-dom";
import UserCard from "../../../components/admin/user/card";
import dayjs from "dayjs";
import { downloadCertificate } from "../../../utils/certificate";
import config from "../../../utils/config";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
  LuAward,
  LuCalendar,
  LuCircleCheck,
  LuClipboardList,
  LuClock,
  LuCloudDownload,
  LuThumbsDown,
  LuThumbsUp,
  LuTimer,
} from "react-icons/lu";
import CourseProgress from "./progress";
import {
  emailFieldProps,
  emailRule,
  matchFieldRule,
  requiredDateRule,
  requiredRule,
  requiredSelectRule,
  uniqueRule,
} from "../../../utils/formFieldError";
import {
  academicBackgroundOptions,
  genderOptions,
  namePlaceholders,
  splitName,
} from "../../../utils/userFields";

export default function UserDetails() {
  const { user, languages, messageApi } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [countries, setCountries] = useState([]);
  // Utilizadores existentes, para o uniqueRule do e-mail
  const [users, setUsers] = useState([]);

  const resultsRef = useRef();
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  // Exemplos de Nome e Apelido no idioma atual
  const placeholders = namePlaceholders(i18n.language);
  const [form] = Form.useForm();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, [id]);

  useEffect(() => {
    axios
      .get(endpoints.user.read)
      .then((res) => setUsers(res.data))
      .catch((err) => console.log(err));
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.user.readById, { params: { id, id_role: user.id_role } })
      .then((res) => {
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
          // A BD guarda só name: é dividido em Nome + Apelido para editar
          form.setFieldsValue({
            ...res.data.user,
            ...splitName(res.data.user.name),
          });

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

        // Admin can see all courses including draft - backend already filters for regular users
        if (
          course.settings &&
          course.settings.country_limit &&
          !course.settings.country.includes(res.data.user.country)
        )
          continue;

        let courseModules = res.data.modules.filter(
          (m) => m.id_course === course.id,
        );
        let newModules = [];

        if (courseModules.length > 0) {
          for (let i = 0; i < courseModules.length; i++) {
            courseModules[i].items = courseModules[i].items
              ? JSON.parse(courseModules[i].items)
              : null;
            if (courseModules[i].items) {
              for (let y = 0; y < courseModules[i].items.length; y++) {
                if (courseModules[i].items[y].type === "topic")
                  courseModules[i].items[y] = {
                    type: courseModules[i].items[y].type,
                    ...res.data.topics.filter(
                      (_t) => _t.id === courseModules[i].items[y].id,
                    )[0],
                  };
                if (courseModules[i].items[y].type === "test")
                  courseModules[i].items[y] = {
                    type: courseModules[i].items[y].type,
                    ...res.data.tests.filter(
                      (_t) => _t.id === courseModules[i].items[y].id,
                    )[0],
                  };

                auxAllItems.push(courseModules[i].items[y]);
              }
              newModules.push(courseModules[i]);
            }
          }
        }

        aux.course = course;
        aux.modules = newModules;
        aux.progress = res.data.progress.filter(
          (p) => p.id_course === course.id && p.id_user === parseInt(id),
        );
        aux.allItems = auxAllItems;
        auxCourse.push(aux);
      }
      setCourseData(auxCourse);
    }
  }

  function calcCourseProgress(a, b, c) {
    let progressPercentage = (100 * a) / (b + c);
    const isInteger = progressPercentage % 1 === 0;
    return (
      <p
        className={`text-[12px] ${progressPercentage === 100 ? "text-[#2F8351]" : "text-[#707070]"} text-nowrap mr-2`}>
        {!isInteger
          ? (Math.round(progressPercentage * 100) / 100).toFixed(2)
          : progressPercentage}
        % {t("Completed")}
      </p>
    );
  }

  function handleDownloadCertificate(item, progress) {
    downloadCertificate(item, progress, user, config, endpoints);
  }

  function submit(values) {
    const data = { ...values, id };
    if (data.password) data.new_password = data.password;
    delete data.password;
    delete data.confirm_password;

    axios
      .post(endpoints.user.update, { data })
      .then((res) => {
        if (res.data.user) {
          messageApi.open({
            type: "success",
            content: t("Account updated successfully!"),
          });
          getData();
        } else {
          messageApi.open({
            type: "error",
            content: t("Something wrong happened, try again please."),
          });
        }
      })
      .catch((err) => {
        console.log(err);
        messageApi.open({
          type: "error",
          content: t("Something wrong happened, try again please."),
        });
      });
  }

  function scrollToResults() {
    console.log(resultsRef);
    resultsRef.current.scrollIntoView();
  }

  async function deleteTry(_try) {
    console.log(_try);
    try {
      const res = await axios.post(endpoints.course.deleteTry, {
        data: { id: _try.id },
      });
      console.log(res.data.affectedRows);
      if (res.data.affectedRows > 0) {
        // Update the course data
        const updatedCourseData = courseData.map((c) => {
          console.log(c);
          if (c.course.id === _try.id_course) {
            console.log(c.progress.filter((t) => t.id !== _try.id));
            return {
              ...c,
              progress: c.progress.filter((t) => t.id !== _try.id),
            };
          }
          return course;
        });

        setCourseData(updatedCourseData);
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-center">
        <p className="font-bold text-[18px] font-ryker">{t("Student account")}</p>
        <p
          className="text-sm cursor-pointer"
          onClick={() => navigate(`/admin/users`)}>
          « {t("Go back")}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <UserCard
          user={data}
          courses={courseData}
          scrollToResults={scrollToResults}
        />
        <div className="col-span-3">
          <div className="bg-[#D0D7E7] p-10 flex flex-col h-full">
            <p className="text-[26px] font-bold text-center mb-6! font-ryker">
              {t("Account")}
            </p>
            <Form
              form={form}
              onFinish={submit}
              layout="vertical"
              className="auth-form">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <Form.Item
                    name="first_name"
                    label={t("First Name")}
                    rules={[requiredRule]}
                    className="mb-0!">
                    <Input size="large" placeholder={placeholders.first_name} />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="last_name"
                    label={t("Last Name")}
                    rules={[requiredRule]}
                    className="mb-0!">
                    <Input size="large" placeholder={placeholders.last_name} />
                  </Form.Item>
                </div>
                <div>
                  {/* Formato do e-mail e não usado por outra conta (a do próprio aluno é ignorada) */}
                  <Form.Item
                    name="email"
                    label={t("E-mail")}
                    {...emailFieldProps}
                    rules={[
                      requiredRule,
                      emailRule,
                      uniqueRule(
                        users,
                        t(
                          "This e-mail is already associated with another account",
                        ),
                        { field: "email", excludeId: Number(id) },
                      ),
                    ]}
                    className="mb-0!">
                    <Input
                      type="email"
                      size="large"
                      placeholder={t("youremail@domain.com")}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="gender"
                    label={t("Gender")}
                    rules={[requiredSelectRule]}
                    className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Gender")}
                      allowClear
                      options={genderOptions(t, i18n.language)}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Birth date")}
                    name="birth_date"
                    rules={[requiredDateRule]}
                    className="mb-0!"
                    getValueProps={(value) => ({
                      value: value && dayjs(value),
                    })}>
                    <DatePicker
                      size="large"
                      placeholder={t("Select birth date")}
                      className="w-full"
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    name="country"
                    label={t("Country")}
                    rules={[requiredSelectRule]}
                    className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Choose a country")}
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      options={countries.map((item) => ({
                        label: item.label,
                        value: item.value,
                      }))}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Academic background")}
                    name="academic_background"
                    rules={[requiredSelectRule]}
                    className="mb-0!">
                    <Select
                      size="large"
                      placeholder={t("Academic background")}
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      options={academicBackgroundOptions(t)}
                    />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Bial's starting date")}
                    name="bial_starting_date"
                    rules={[requiredDateRule]}
                    className="mb-0!"
                    getValueProps={(value) => ({
                      value: value && dayjs(value),
                    })}>
                    <DatePicker
                      size="large"
                      placeholder={t("Select Bial's starting date")}
                      className="w-full"
                    />
                  </Form.Item>
                </div>
                {/* Divide os dados pessoais das passwords */}
                <div className="col-span-full">
                  <Divider className="my-0!" style={{ borderColor: "#8b9cc3" }} />
                </div>
                <div>
                  <Form.Item
                    label={t("Password")}
                    name="password"
                    className="mb-0!">
                    <Input.Password size="large" placeholder={t("Enter a new password")} />
                  </Form.Item>
                </div>
                <div>
                  <Form.Item
                    label={t("Confirm password")}
                    name="confirm_password"
                    dependencies={["password"]}
                    rules={[
                      matchFieldRule(
                        "password",
                        t("The passwords does not match!"),
                      ),
                    ]}
                    className="mb-0!">
                    <Input.Password size="large" placeholder={t("Repeat the new password")} />
                  </Form.Item>
                </div>
                <div className="flex justify-end items-end">
                  <Button
                    className="w-full"
                    size="large"
                    variant="solid"
                    color="blue"
                    onClick={form.submit}>
                    {t("Save")}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
      <div id="results" ref={resultsRef} className="grid grid-cols-4 gap-4">
        <div></div>
        <div className=" col-span-3 mt-10">
          <p className="text-[26px] font-bold text-center mb-6! font-ryker">
            {t("Results")}
          </p>
          {courseData.length > 0 ? (
            courseData.map((c) => {
              const tests = c.allItems
                .filter((_c) => _c.type === "test")
                .map((_t, _i) => {
                  let tries = c.progress.filter(
                    (_p) =>
                      _p.activity_type === "test" &&
                      _p.id_course_test === _t.id,
                  );
                  let testSettings = _t.settings
                    ? JSON.parse(_t.settings)
                    : null;
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
                            <p className="italic text-[11px]">{t("Status")}</p>
                            {c.progress.filter(
                              (_p) =>
                                _p.activity_type === "test" &&
                                _p.id_course_test === _t.id,
                            ).length > 0 ? (
                              <>
                                <p className="text-sm">
                                  {c.progress.filter(
                                    (_p) =>
                                      _p.activity_type === "test" &&
                                      _p.id_course_test === _t.id &&
                                      _p.is_completed,
                                  ).length > 0
                                    ? t("Completed")
                                    : c.progress.filter(
                                          (_p) =>
                                            _p.activity_type === "test" &&
                                            _p.id_course_test === _t.id &&
                                            _p.is_completed === 0,
                                        ).length === maxTries
                                      ? t("Not passed")
                                      : t("In progress")}
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
                            <p className="text-sm">
                              {testSettings?.passing_score ?? "80"}%
                            </p>
                          </div>
                        </div>
                        <div className="p-4">
                          <Divider dashed className="mb-4! mt-6!" />
                          <p className="text-center font-bold">{t("Tries")}</p>
                          {tries.length > 0 ? (
                            <Tabs
                              className="tabs-tries"
                              type="card"
                              items={tries.map((_try, _tryInd) => {
                                let meta_data = _try.meta_data
                                  ? JSON.parse(_try.meta_data)
                                  : {};
                                let testTime = "";
                                let answers = [];
                                if (meta_data) {
                                  testTime =
                                    meta_data.time > 60
                                      ? `${Math.floor(meta_data.time / 60)} min`
                                      : `${meta_data.time} s`;
                                  answers = meta_data.items;
                                }
                                return {
                                  key: `${_try.id}-try`,
                                  label: `${t("Try")} nº${_tryInd + 1}`,
                                  children: (
                                    <div className="grid grid-cols-5">
                                      <div className="flex flex-col justify-center items-center gap-2">
                                        <p className="text-[11px]">
                                          {t("Status")}
                                        </p>
                                        {_try.is_completed ? (
                                          <LuThumbsUp className="text-[#2F8351] w-10 h-10 p-1" />
                                        ) : (
                                          <LuThumbsDown className="text-[#DB0709] w-10 h-10 p-1" />
                                        )}
                                        <p className="text-sm">
                                          {_try.is_completed
                                            ? t("Passed")
                                            : t("Not passed")}
                                        </p>
                                      </div>

                                      <div className="flex flex-col justify-center items-center gap-2">
                                        <p className="text-[11px]">
                                          {t("Correct")}
                                        </p>
                                        <LuCircleCheck className="text-[#163986] w-10 h-10 p-1" />
                                        <p className="text-sm">
                                          {
                                            answers.filter(
                                              (_a) => _a.is_correct,
                                            ).length
                                          }
                                          /{answers.length}
                                        </p>
                                      </div>

                                      <div className="flex flex-col justify-center items-center gap-2">
                                        <p className="text-[11px]">
                                          {t("Time")}
                                        </p>
                                        <LuTimer className="text-[#163986] w-10 h-10 p-1" />
                                        <p className="text-sm">{testTime}</p>
                                      </div>

                                      <div className="flex flex-col justify-center items-center gap-2">
                                        <p className="text-[11px]">
                                          {t("Date")}
                                        </p>
                                        <LuCalendar className="text-[#163986] w-10 h-10 p-1" />
                                        <p className="text-sm">
                                          {dayjs(_try.created_at).format(
                                            "DD/MM/YYYY",
                                          )}
                                        </p>
                                      </div>

                                      <div className="flex flex-col justify-center items-center gap-2">
                                        <p className="text-[11px]">
                                          {t("Hour")}
                                        </p>
                                        <LuClock className="text-[#163986] w-10 h-10 p-1" />
                                        <p className="text-sm">
                                          {dayjs(_try.created_at).format(
                                            "HH:mm",
                                          )}
                                        </p>
                                      </div>
                                      <div className="col-span-5 flex flex-col justify-center items-center mt-6">
                                        <Button
                                          dashed
                                          onClick={() => deleteTry(_try)}>
                                          {t("Delete try")}
                                        </Button>
                                      </div>
                                    </div>
                                  ),
                                };
                              })}
                            />
                          ) : (
                            <Empty
                              className="mt-6"
                              description={t("No tries made yet")}
                            />
                          )}
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
                        <p className="font-ryker">{c.course.name}</p>
                      </div>
                    </div>
                  ),
                  children: (
                    <div>
                      <div className="grid grid-cols-5">
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Status")}</p>
                          {c.progress.length > 0 ? (
                            c.progress.filter(
                              (_p) =>
                                _p.activity_type === "course" &&
                                _p.is_completed,
                            ).length > 0 ? (
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
                            className={`${c.progress.filter((_p) => _p.activity_type === "module" && _p.is_completed).length === c.modules.length ? "text-green-400" : "text-[#163986]"} w-10 h-10`}
                          />
                          <p className="text-sm">
                            {
                              c.progress.filter(
                                (_p) =>
                                  _p.activity_type === "module" &&
                                  _p.is_completed,
                              ).length
                            }
                            /{c.modules.length}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Topics")}</p>
                          <ThumbsUp
                            className={`${c.progress.filter((_p) => _p.activity_type === "topic" && _p.is_completed).length === c.allItems.filter((_c) => _c.type === "topic").length ? "text-green-400" : "text-[#163986]"} w-10 h-10`}
                          />
                          <p className="text-sm">
                            {
                              c.progress.filter(
                                (_p) =>
                                  _p.activity_type === "topic" &&
                                  _p.is_completed,
                              ).length
                            }
                            /
                            {
                              c.allItems.filter((_c) => _c.type === "topic")
                                .length
                            }
                          </p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Tests")}</p>
                          <LuClipboardList
                            className={`${c.progress.filter((_p) => _p.activity_type === "test" && _p.is_completed).length === c.allItems.filter((_c) => _c.type === "test").length ? "text-green-400" : "text-[#163986]"} w-10 h-10 p-1`}
                          />
                          <p className="text-sm">
                            {
                              c.progress.filter(
                                (_p) =>
                                  _p.activity_type === "test" &&
                                  _p.is_completed,
                              ).length
                            }
                            /
                            {
                              c.allItems.filter((_c) => _c.type === "test")
                                .length
                            }
                          </p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                          <p className="text-[11px]">{t("Start Date")}</p>
                          <LuCalendar className="text-[#163986] w-10 h-10 p-1" />
                          <p className="text-sm">
                            {c.progress.filter(
                              (_p) => _p.activity_type === "enroll",
                            ).length > 0
                              ? dayjs(
                                  c.progress.filter(
                                    (_p) => _p.activity_type === "enroll",
                                  )[0].created_at,
                                ).format("DD/MM/YYYY")
                              : t("Not started")}
                          </p>
                        </div>
                      </div>
                      {c.progress.length > 0 && (
                        <CourseProgress data={c} user={data} />
                      )}
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
                              <p className={`text-[20px] font-bold font-ryker`}>
                                {c.course.name}
                              </p>
                              {data?.course?.settings.progression_type ===
                              "linear"
                                ? mInd > 0 &&
                                  c.progress.filter(
                                    (p) =>
                                      p.id_course === c.course.id &&
                                      p.activity_type === "module" &&
                                      p.id_course_module ===
                                        modules[mInd - 1].id,
                                  ).length === 0 && (
                                    <div className="flex justify-center items-center ml-4">
                                      <RxLockClosed className="w-3.75 h-3.75" />
                                    </div>
                                  )
                                : null}
                              {(100 *
                                c.progress.filter(
                                  (p) =>
                                    p.is_completed === 1 &&
                                    p.activity_type !== "module" &&
                                    p.activity_type !== "course" &&
                                    p.activity_type !== "enroll",
                                ).length) /
                                (c.allItems.filter((_c) => _c.type === "topic")
                                  .length +
                                  c.allItems.filter((_c) => _c.type === "test")
                                    .length) ===
                                100 && (
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
                                      <LuCloudDownload className="mr-2 text-[14px] text-[#163986]" />
                                      <p className="text-[12px]">
                                        {t("Certificate")}
                                      </p>
                                    </div>
                                  </Button>
                                  <div className="ml-2 w-7 h-7 rounded-full bg-[#163986] flex justify-center items-center shrink-0">
                                    <LuAward className="text-[16px] text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex w-full gap-8">
                              <div className="flex items-center">
                                {c.progress.length > 0 ? (
                                  <p className="text-[12px] text-[#707070] text-nowrap">
                                    {t("Last activity at")}{" "}
                                    {dayjs(
                                      c.progress[c.progress.length - 1]
                                        .created_at,
                                    ).format("YYYY-MM-DD HH:mm")}
                                  </p>
                                ) : (
                                  <p className="text-[12px] text-[#707070] text-nowrap">
                                    {t("Not started")}
                                  </p>
                                )}
                              </div>
                              <div className="flex justify-start items-center w-full">
                                {calcCourseProgress(
                                  c.progress.filter(
                                    (p) =>
                                      p.is_completed === 1 &&
                                      p.activity_type !== "module" &&
                                      p.activity_type !== "course" &&
                                      p.activity_type !== "enroll",
                                  ).length,
                                  c.allItems.filter((_c) => _c.type === "topic")
                                    .length,
                                  c.allItems.filter((_c) => _c.type === "test")
                                    .length,
                                )}
                                <Progress
                                  strokeColor={"#2F8351"}
                                  railColor={"#EAEAEA"}
                                  percent={
                                    (100 *
                                      c.progress.filter(
                                        (p) =>
                                          p.is_completed === 1 &&
                                          p.activity_type !== "module" &&
                                          p.activity_type !== "course" &&
                                          p.activity_type !== "enroll",
                                      ).length) /
                                    (c.allItems.filter(
                                      (_c) => _c.type === "topic",
                                    ).length +
                                      c.allItems.filter(
                                        (_c) => _c.type === "test",
                                      ).length)
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
                          <Tabs
                            tabPlacement="start"
                            type="card"
                            items={tabsInside}
                            size="large"
                            className="result-tab-course-item"
                          />
                        </div>
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
            })
          ) : (
            <Empty description={t("No courses available")} />
          )}
        </div>
      </div>
    </div>
  );
}
