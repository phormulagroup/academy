import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Form, Select, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";
import { RxReload } from "react-icons/rx";

import Table from "../../../components/admin/table";

import { Context } from "../../../utils/context";

import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import ExportTable from "../../../components/admin/export/export";
import { Doughnut } from "react-chartjs-2";

export default function ReportTest({ data }) {
  const { user, selectedLanguage, languages } = useContext(Context);
  const { t } = useTranslation();

  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tests, setTests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isOpenExport, setIsOpenExport] = useState(false);

  const [graphicGlobal, setGraphicGlobal] = useState({
    notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
    inProgress: { value: 0, label: t("In progress"), color: "#80DCEB" },
    completed: { value: 0, label: t("Completed"), color: "#00B9D6" },
  });
  const [graphicProgress, setGraphicProgress] = useState({
    "< 100%": { value: 0, label: "< 100%", color: "#0397AE" },
    "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
    "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
    "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
    "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
  });

  const [form] = Form.useForm();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      prepareData(data);
      setTests(data.tests);
      setActivity(data.acitivty);
    }
  }, [data]);

  useEffect(() => {
    setCountries(JSON.parse(languages.filter((l) => l.id === selectedLanguage.id)[0].country));
  }, [selectedLanguage]);

  function prepareData(obj) {
    if (obj.courses.length > 0) {
      filterProgressCourses(null, obj.users, obj.activity, obj.courses);
    }
  }

  function filterProgressCourses(id_course, users, courseActivity, courses) {
    let auxGraphicGlobal = {
      notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
      inProgress: { value: 0, label: t("In progress"), color: "#80DCEB" },
      completed: { value: 0, label: t("Completed"), color: "#00B9D6" },
    };

    let auxGraphicProgress = {
      "< 100%": { value: 0, label: "< 100%", color: "#0397AE" },
      "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
      "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
      "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
      "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
    };

    for (let u = 0; u < users.length; u++) {
      let findActivity = courseActivity.filter((_a) => _a.id_user === users[u].id);
      if (findActivity.length > 0) {
        if (id_course) findActivity.filter((_a) => _a.id_course === id_course);
        if (findActivity.filter((_f) => _f.activity_type === "test" && _f.is_completed === 1).length > 0) {
          auxGraphicGlobal.completed.value += 1;
        } else {
          let totalSteps = findActivity.filter((_f) => _f.activity_type === "topic" || _f.activity_type === "test");
          let percentage = (totalSteps.filter((_t) => _t.is_completed).length * 100) / totalSteps.length;
          if (totalSteps > 0) {
            if (percentage >= 0) {
              if (percentage < 20) auxGraphicProgress["< 20%"].value += 1;
              else if (percentage < 40) auxGraphicProgress["< 40%"].value += 1;
              else if (percentage < 60) auxGraphicProgress["< 60%"].value += 1;
              else if (percentage < 80) auxGraphicProgress["< 80%"].value += 1;
              else if (percentage < 100) auxGraphicProgress["< 100%"].value += 1;
            }
          } else {
            auxGraphicProgress["< 20%"].value += 1;
          }

          auxGraphicGlobal.inProgress.value += 1;
        }
      } else {
        let findCourseAvailableToUser = courses.filter((c) => {
          if (!c.settings) return true;

          console.log(c.settings);
          if (c.settings.country_limit) {
            return c.settings.country.includes(users[u].country);
          }

          return true;
        });

        if (findCourseAvailableToUser && findCourseAvailableToUser.length > 0) {
          if (courses) auxGraphicGlobal.notStarted.value += 1;
        }
      }
    }

    setGraphicGlobal(auxGraphicGlobal);
  }

  function filterData(values) {
    let newData = Object.assign([], activity);

    if (values.course) newData = newData.filter((n) => n.id_course === values.course);

    filterProgressCourses({ ...data, activity: newData });
  }

  function closeExport() {
    setIsOpenExport(false);
  }

  return (
    <div className="p-4">
      <ExportTable open={isOpenExport} close={closeExport} data={filteredData.length > 0 ? filteredData : tableData} table={"CoursesReport"} />
      <Form form={form} layout="vertical" onFinish={filterData}>
        <div className="grid grid-cols-4 gap-8 mb-4 mt-4">
          <div className="flex justify-end items-end">
            <Button className="w-full!" size="large" variant="solid" color="blue" onClick={() => setIsOpenExport(true)}>
              {t("Export excel")}
            </Button>
          </div>
          <Form.Item name="course" label={t("Course")} className="mb-0!">
            <Select
              allowClear
              size="large"
              className="w-full"
              placeholder={t("Select course")}
              showSearch={{
                optionFilterProp: ["label"],
              }}
              options={data.courses?.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <div className="flex justify-center items-end">
            <Button className="w-full" size="large" onClick={form.submit} type="primary">
              {t("Search")}
            </Button>
          </div>
        </div>
      </Form>
      <div className="p-4 bg-white rounded-[5px]">
        <p className="font-bold">Progresso teste</p>
        <div className="grid grid-cols-2 gap-16 mt-4">
          <div>
            <p className="font-bold mb-2">Global</p>
            <div className="p-4 border border-[#C0C0C0] rounded-[5px] flex flex-col">
              <div className="grid grid-cols-2 gap-10 w-full">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center gap-4 w-full!">
                    <div className="w-1/2">
                      <Doughnut
                        className="w-full! h-full!"
                        data={{
                          labels: [graphicGlobal.notStarted?.label, graphicGlobal.inProgress?.label, graphicGlobal.completed?.label],
                          datasets: [
                            {
                              data: [graphicGlobal.notStarted.value, graphicGlobal.inProgress.value, graphicGlobal.completed.value],
                              backgroundColor: [graphicGlobal.notStarted.color, graphicGlobal.inProgress.color, graphicGlobal.completed.color],
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="w-1/2">
                      {Object.keys(graphicGlobal).map((_k) => (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`mr-2 min-w-3 w-3 min-h-3 h-3 rounded-full`} style={{ backgroundColor: graphicGlobal[_k].color }}></div>
                            <p className="text-[11px]">{graphicGlobal[_k].label}</p>
                          </div>
                          <div className="min-w-10 flex justify-center items-center">
                            <p className="text-[11px]">{graphicGlobal[_k].value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex justify-between items-center gap-4 w-full!">
                    <div className="w-1/2">
                      <Doughnut
                        className="w-full! h-full!"
                        data={{
                          labels: [graphicGlobal.notStarted?.label, graphicGlobal.inProgress?.label, graphicGlobal.completed?.label],
                          datasets: [
                            {
                              data: [graphicGlobal.notStarted.value, graphicGlobal.inProgress.value, graphicGlobal.completed.value],
                              backgroundColor: [graphicGlobal.notStarted.color, graphicGlobal.inProgress.color, graphicGlobal.completed.color],
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="w-1/2">
                      {Object.keys(graphicGlobal).map((_k) => (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`mr-2 min-w-3 w-3 min-h-3 h-3 rounded-full`} style={{ backgroundColor: graphicGlobal[_k].color }}></div>
                            <p className="text-[11px]">{graphicGlobal[_k].label}</p>
                          </div>
                          <div className="min-w-10 flex justify-center items-center">
                            <p className="text-[11px]">{graphicGlobal[_k].value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold mb-2">Score médio por idioma</p>
            <div className="p-4 border border-[#C0C0C0] rounded-[5px]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
