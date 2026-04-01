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

export default function CourseReport({ data }) {
  const { user, selectedLanguage, languages } = useContext(Context);
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dataToExport, setDataToExport] = useState([]);
  const [courses, setCourses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isOpenExport, setIsOpenExport] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      prepareData(data);
      setCourses(data.courses);
    }
  }, [data]);

  useEffect(() => {
    setCountries(JSON.parse(languages.filter((l) => l.id === selectedLanguage.id)[0].country));
  }, [selectedLanguage]);

  function prepareData(obj) {
    let aux = [];
    if (obj.users && obj.courses && obj.courses.length > 0) {
      for (let i = 0; i < obj.courses.length; i++) {
        let course = obj.courses[i];
        course.settings = course.settings && typeof course.settings === "string" ? JSON.parse(course.settings) : course.settings;
        let modules = obj.modules.filter((t) => t.id_course === course.id);
        let topics = obj.topics.filter((t) => t.id_course === course.id);
        let tests = obj.tests.filter((t) => t.id_course === course.id);
        let approved = obj.activity.filter((a) => a.activity_type === "course" && a.is_completed);
        let repproved = 0;
        let students = obj.users.filter((u) => (course.settings.country_limit ? course.settings.country.includes(u.country) : u.id_lang === course.id_lang));

        for (let t = 0; t < tests.length; t++) {
          let testSettings = tests[t].settings ? JSON.parse(tests[t].settings) : tests[t].settings;
          if (testSettings && testSettings.retries_allowed >= 0) {
            let tries = obj.activity.filter((a) => a.activity_type === "test" && a.id_course_test === tests[t].id && a.is_completed === 0);

            let triesByUser = tries.reduce((acc, attempt) => {
              if (!acc[attempt.id_user]) acc[attempt.id_user] = 0;
              acc[attempt.id_user]++;
              return acc;
            }, {});

            for (let userId in triesByUser) {
              if (triesByUser[userId] >= testSettings.retries_allowed) {
                ++repproved;
              }
            }
          }
        }

        aux.push({
          id: course.id,
          name: course.name,
          start_date:
            course.settings.course_access_expiration && course.settings.course_access_expiration_dates.start_date
              ? dayjs(course.settings.course_access_expiration_dates.start_date).format("DD MMM, YYYY")
              : null,
          end_date:
            course.settings.course_access_expiration && course.settings.course_access_expiration_dates.end_date
              ? dayjs(course.settings.course_access_expiration_dates.end_date).format("DD MMM, YYYY")
              : null,
          lang: languages.filter((l) => l.id === course.id_lang)[0].code.toUpperCase(),
          nr_modules: modules.length,
          nr_topics: topics.length,
          nr_tests: tests.length,
          approved: approved.length,
          repproved: repproved,
          students: students.length,
          percentage: parseFloat(approved.length > 0 ? (approved.length * 100) / students.length : 0).toFixed(2) + "%",
          country: course.settings.country_limit ? course.settings.country.join(", ") : t("All"),
        });
      }
    }
    setTableData(aux);
    setFilteredData(aux);
  }

  function filterData(values) {
    let newData = Object.assign([], courses);

    if (values.course) newData = newData.filter((n) => n.id === values.course);
    if (values.country && values.country.length > 0) {
      newData = newData.filter((n) => {
        const matches = n.settings.country.some((item) => values.country.includes(item));
        return n.settings.country_limit ? matches : true;
      });
    }

    prepareData({ ...data, courses: newData });
  }

  function onChange(pagination, filters, sorter, extra) {
    setFilteredData(extra.currentDataSource);
  }

  function openExport(data) {
    setDataToExport(data);
    setIsOpenExport(true);
  }

  function closeExport() {
    setIsOpenExport(false);
  }

  const expandedRowRender = (e) => {
    const columnsExpanded = [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
      },
      {
        title: t("Name"),
        dataIndex: "name",
        key: "name",
      },
      {
        title: t("E-mail"),
        dataIndex: "email",
        key: "email",
      },
      {
        title: t("Country"),
        dataIndex: "country",
        key: "country",
      },
      {
        title: t("Start date"),
        dataIndex: "start_date",
        key: "start_date",
      },
      {
        title: t("End date"),
        dataIndex: "end_date",
        key: "end_date",
      },
      {
        title: t("Modules"),
        dataIndex: "nr_modules",
        key: "nr_modules",
      },
      {
        title: t("Topics"),
        dataIndex: "nr_topics",
        key: "nr_topics",
      },
      {
        title: t("Tests"),
        dataIndex: "nr_tests",
        key: "nr_tests",
      },
      {
        title: t("Status"),
        dataIndex: "status",
        key: "status",
      },
    ];

    let course = data.courses.filter((c) => c.id === e.id)[0];
    let students = data.users.filter((u) => (course.settings.country_limit ? course.settings.country.includes(u.country) : u.id_lang === course.id_lang));
    let activity = data.activity.filter((a) => a.id_course === e.id);

    const dataExpanded = [];

    for (let i = 0; i < students.length; i++) {
      let student = students[i];
      let studentActivity = activity.filter((a) => a.id_user === student.id);
      if (studentActivity.length === 0) {
        dataExpanded.push({
          id: student.id,
          name: student.name,
          email: student.email,
          start_date: null,
          end_date: null,
          lang: languages.filter((l) => l.id === course.id_lang)[0].code.toUpperCase(),
          nr_modules: null,
          nr_topics: null,
          nr_tests: null,
          status: t("Not started"),
          percentage: null,
          country: student.country,
        });
      } else {
        let approved = studentActivity.filter((a) => a.is_completed && a.activity_type === "course").length > 0;
        let startDate = studentActivity.filter((a) => a.activity_type === "enroll")[0]?.created_at;
        let endDate = studentActivity.filter((a) => a.activity_type === "course" && a.is_completed === 1)[0]?.created_at;
        let tests = data.tests.filter((t) => t.id_course === course.id);
        let repproved = false;
        for (let t = 0; t < tests.length; t++) {
          let testSettings = tests[t].settings ? JSON.parse(tests[t].settings) : tests[t].settings;
          if (testSettings && testSettings.retries_allowed >= 0) {
            let tries = studentActivity.filter((a) => a.activity_type === "test" && a.id_course_test === tests[t].id && a.is_completed === 0);
            if (tries.length >= testSettings.retries_allowed) {
              repproved = true;
            }
          }
        }

        dataExpanded.push({
          id: student.id,
          name: student.name,
          email: student.email,
          start_date: dayjs(startDate).format("DD MMM, YYYY"),
          end_date: endDate ? dayjs(endDate).format("DD MMM, YYYY") : null,
          lang: languages.filter((l) => l.id === course.id_lang)[0].code.toUpperCase(),
          nr_modules: `${studentActivity.filter((a) => a.activity_type === "module" && a.is_completed === 1).length}/${e.nr_modules}`,
          nr_topics: `${studentActivity.filter((a) => a.activity_type === "topic" && a.is_completed === 1).length}/${e.nr_topics}`,
          nr_tests: `${studentActivity.filter((a) => a.activity_type === "test" && a.is_completed === 1).length}/${e.nr_tests}`,
          status: repproved ? t("Failed") : approved ? t("Approved") : t("In progress"),
          country: course.settings.country_limit ? course.settings.country.join(", ") : t("All"),
        });
      }
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="font-bold mb-2 mt-4">{t("Students")}</p>
          <Button className="min-w-[200px]" size="large" variant="solid" color="blue" onClick={() => openExport(dataExpanded)}>
            {t("Export excel")}
          </Button>
        </div>
        <Table className="expanded_table" columns={columnsExpanded} dataSource={dataExpanded} pagination={false} />
      </div>
    );
  };

  return (
    <div className="p-4">
      <ExportTable open={isOpenExport} close={closeExport} data={dataToExport} table={"CoursesReport"} />
      <Form form={form} layout="vertical" onFinish={filterData}>
        <div className="grid grid-cols-4 gap-8 mb-4 mt-4">
          <div className="flex justify-end items-end">
            <Button className="w-full!" size="large" variant="solid" color="blue" onClick={() => openExport(filteredData.length > 0 ? filteredData : tableData)}>
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
              options={courses.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="country" label={t("Country")} className="mb-0!">
            <Select
              mode="multiple"
              allowClear
              size="large"
              className="w-full"
              placeholder={t("Select country")}
              showSearch={{
                optionFilterProp: ["label"],
              }}
              options={countries.map((c) => ({
                label: c,
                value: c,
              }))}
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
        <Table
          onChange={onChange}
          expandable={{
            expandedRowRender,
          }}
          dataSource={tableData}
          pagination={{
            pageSize: 5, // máximo 5 por página
            placement: ["bottomCenter"], // paginação ao centro
          }}
          columns={[
            {
              title: t("Course"),
              dataIndex: "name",
              key: "name",
              width: "300px",
            },
            {
              title: t("Date start"),
              dataIndex: "start_date",
              key: "start_date",
            },
            {
              title: t("Date end"),
              dataIndex: "end_date",
              key: "end_date",
            },
            {
              title: t("Modules"),
              dataIndex: "nr_modules",
              key: "nr_modules",
            },
            {
              title: t("Topics"),
              dataIndex: "nr_topics",
              key: "nr_topics",
            },
            {
              title: t("Tests"),
              dataIndex: "nr_tests",
              key: "nr_tests",
            },
            {
              title: t("Approved"),
              dataIndex: "approved",
              key: "approved",
            },
            {
              title: t("Repproved"),
              dataIndex: "repproved",
              key: "repproved",
            },
            {
              title: t("Percentage"),
              dataIndex: "percentage",
              key: "percentage",
            },
            {
              title: t("Students"),
              dataIndex: "students",
              key: "students",
            },
            {
              title: t("Country"),
              dataIndex: "country",
              key: "country",
            },
          ]}
        />
      </div>
    </div>
  );
}
