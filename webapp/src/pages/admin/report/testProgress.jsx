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

export default function TestProgress({ data }) {
  const { user, selectedLanguage, languages } = useContext(Context);
  const { t } = useTranslation();

  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tests, setTests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isOpenExport, setIsOpenExport] = useState(false);

  const [graphicGlobal, setGraphicGlobal] = useState({
    notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
    approved: { value: 0, label: t("Approved"), color: "#00B9D6" },
    notApproved: { value: 0, label: t("Not approved"), color: "#40CBE0" },
  });
  const [graphicScore, setGraphicScore] = useState({
    "<= 100%": { value: 0, label: "<= 100%", color: "#0397AE" },
    "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
    "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
    "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
    "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
  });

  const [form] = Form.useForm();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setTests(data.tests);
      setActivity(data.acitivty);
      if (data.courses.length > 0) {
        filterProgressCourses(null, data);
      }
    }
  }, [data]);

  function filterProgressCourses(id_course, obj) {
    let auxGraphicGlobal = {
      notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
      approved: { value: 0, label: t("Approved"), color: "#00B9D6" },
      notApproved: { value: 0, label: t("Not approved"), color: "#40CBE0" },
    };
    let auxGraphicScore = {
      "<= 100%": { value: 0, label: "<= 100%", color: "#0397AE" },
      "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
      "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
      "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
      "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
    };

    let users = obj.users;

    for (let u = 0; u < users.length; u++) {
      let findActivity = obj.activity.filter((_a) => _a.id_user === users[u].id && _a.activity_type === "test");
      if (findActivity.length > 0) {
        if (id_course) findActivity = findActivity.filter((_a) => _a.id_course === id_course);
        for (let i = 0; i < findActivity.length; i++) {
          let item = findActivity[i];
          item.meta_data = item.meta_data && typeof item.meta_data === "string" ? JSON.parse(item.meta_data) : item.meta_data;
          let c = obj.courses.filter((_c) => _c.id === item.id_course)[0];

          if (item.is_completed === 1) {
            auxGraphicGlobal.approved.value += 1;
            auxGraphicScore["<= 100%"].value += 1;
          } else {
            let totalItems = item.meta_data.items;
            let percentage = totalItems.length > 0 ? (totalItems.filter((_t) => _t.is_correct).length * 100) / totalItems.length : 0;

            if (percentage < 20) auxGraphicScore["< 20%"].value += 1;
            else if (percentage < 40) auxGraphicScore["< 40%"].value += 1;
            else if (percentage < 60) auxGraphicScore["< 60%"].value += 1;
            else if (percentage < 80) auxGraphicScore["< 80%"].value += 1;
            else if (percentage <= 100) auxGraphicScore["<= 100%"].value += 1;
          }
        }

        //Calcular os reprovados: se tiver mais tentativas que o permitido, conta como reprovado
        findActivity.reduce((acc, item) => {
          if (item.is_completed === 0) {
            const { id_course_test } = item;
            let findTest = obj.tests.filter((c) => c.id === id_course_test)[0];
            let testSettings = findTest.settings && typeof findTest.settings === "string" ? JSON.parse(findTest.settings) : findTest.settings;

            if (!acc[id_course_test]) {
              acc[id_course_test] = 0;
            }

            acc[id_course_test] = (acc[id_course_test] || 0) + 1;

            if (acc[id_course_test] >= testSettings.retries_allowed) {
              auxGraphicGlobal.notApproved.value += 1;
            }
          }

          return acc;
        }, {});
      } else {
        let findCourseAvailableToUser = obj.tests.filter((t) => {
          let findCourse = obj.courses.filter((c) => c.id === t.id_course)[0];
          if (!findCourse.settings) return true;
          if (findCourse.settings.country_limit) {
            return findCourse.settings.country.includes(users[u].country);
          }

          return true;
        });

        if (findCourseAvailableToUser && findCourseAvailableToUser.length > 0) {
          auxGraphicGlobal.notStarted.value += 1;
        }
      }
    }

    setGraphicGlobal(auxGraphicGlobal);
    setGraphicScore(auxGraphicScore);
  }

  function filterData(values) {
    let newData = Object.assign([], activity);

    if (values.course) newData = newData.filter((n) => n.id_course === values.course);

    filterProgressCourses(values.course, { ...data, activity: newData });
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
                  <p className="font-bold mb-4">Distribuição de status</p>
                  <div className="flex justify-between items-center gap-4 w-full!">
                    <div className="w-1/2">
                      <Doughnut
                        className="w-full! h-full!"
                        data={{
                          labels: [graphicGlobal.notStarted?.label, graphicGlobal.approved?.label, graphicGlobal.notApproved?.label],
                          datasets: [
                            {
                              data: [graphicGlobal.notStarted.value, graphicGlobal.approved.value, graphicGlobal.notApproved.value],
                              backgroundColor: [graphicGlobal.notStarted.color, graphicGlobal.approved.color, graphicGlobal.notApproved.color],
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
                  <p className="font-bold mb-4">Percentagem de score</p>
                  <div className="flex justify-between items-center gap-4 w-full!">
                    <div className="w-1/2">
                      <Doughnut
                        className="w-full! h-full!"
                        data={{
                          labels: [
                            graphicScore["<= 100%"].label,
                            graphicScore["< 80%"].label,
                            graphicScore["< 60%"].label,
                            graphicScore["< 40%"].label,
                            graphicScore["< 20%"].label,
                          ],
                          datasets: [
                            {
                              data: [
                                graphicScore["<= 100%"].value,
                                graphicScore["< 80%"].value,
                                graphicScore["< 60%"].value,
                                graphicScore["< 40%"].value,
                                graphicScore["< 20%"].value,
                              ],
                              backgroundColor: [
                                graphicScore["<= 100%"].color,
                                graphicScore["< 80%"].color,
                                graphicScore["< 60%"].color,
                                graphicScore["< 40%"].color,
                                graphicScore["< 20%"].color,
                              ],
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
                    <div>
                      {Object.keys(graphicScore).map((_k) => (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`mr-2 min-w-3 w-3 min-h-3 h-3 rounded-full`} style={{ backgroundColor: graphicScore[_k].color }}></div>
                            <p className="text-[11px]">{graphicScore[_k].label}</p>
                          </div>
                          <div className="min-w-10 flex justify-center items-center">
                            <p className="text-[11px]">{graphicScore[_k].value}</p>
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
