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
import DownloadIcon from "../../../assets/Backoffice/download.svg?react";
import SearchIcon from "../../../assets/Backoffice/search.svg?react";
import { getCourseReportColumns, getExpandedStudentColumns } from "../../../utils/columns";

export default function CourseReport({ data }) {
  const { user, selectedLanguage, languages } = useContext(Context);
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dataToExport, setDataToExport] = useState([]);
  const [columnsToExport, setColumnsToExport] = useState([]);
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

  // Função auxiliar para verificar se o aluno é aprovado
  const isStudentApproved = (studentActivity, course, modules, topics, tests) => {

    // Um aluno não pode ser aprovado se o curso não tiver módulos, tópicos ou testes
    if (modules.length === 0 || (topics.length === 0 && tests.length === 0)) {
      return false;
    }
    
    const completedModules = studentActivity.filter((a) => a.activity_type === "module" && a.id_course === course.id && a.is_completed === 1 && a.is_deleted === 0).length;
    const completedTopics = studentActivity.filter((a) => a.activity_type === "topic" && a.id_course === course.id && a.is_completed === 1 && a.is_deleted === 0).length;
    const completedTests = studentActivity.filter((a) => a.activity_type === "test" && a.id_course === course.id && a.is_completed === 1 && a.is_deleted === 0).length;
    
    // Apenas verifica módulos, tópicos e testes se eles existirem no curso
    const needToCheckModules = modules.length > 0;
    const needToCheckTopics = topics.length > 0;
    const needToCheckTests = tests.length > 0;
    
    const allModulesCompleted = !needToCheckModules || completedModules === modules.length;
    const allTopicsCompleted = !needToCheckTopics || completedTopics === topics.length;
    const allTestsCompleted = !needToCheckTests || completedTests === tests.length;
    
    // Aprovado APENAS se completou todos os módulos, tópicos e testes que existem no curso
    return (allModulesCompleted && allTopicsCompleted && allTestsCompleted);
  };

  // Função auxiliar para verificar se o aluno é reprovado
  const isStudentRepproved = (studentActivity, tests) => {
    // Cannot be repproved if course has no tests
    if (tests.length === 0) {
      return false;
    }
    
    for (let t = 0; t < tests.length; t++) {
      let testSettings = tests[t].settings ? JSON.parse(tests[t].settings) : tests[t].settings;
      // Apenas marca como reprovado se retries_allowed for um número válido
      if (testSettings && testSettings.retries_allowed && testSettings.retries_allowed > 0) {
        const testPassed = studentActivity.some((a) => a.activity_type === "test" && a.id_course_test === tests[t].id && a.is_completed === 1 && a.is_deleted === 0);
        if (!testPassed) {
          const failedAttempts = studentActivity.filter((a) => a.activity_type === "test" && a.id_course_test === tests[t].id && a.is_completed === 0 && a.is_deleted === 0).length;
          // Apenas reprovado se tiver tentativas falhadas e se o número de tentativas falhadas for maior ou igual ao permitido
          if (failedAttempts > 0 && failedAttempts >= testSettings.retries_allowed) {
            return true;
          }
        }
      }
    }
    return false;
  };

  function prepareData(obj) {
    let aux = [];
    if (obj.users && obj.courses && obj.courses.length > 0) {
      for (let i = 0; i < obj.courses.length; i++) {
        let course = obj.courses[i];
        course.settings = course.settings && typeof course.settings === "string" ? JSON.parse(course.settings) : course.settings;
        let modules = obj.modules.filter((t) => t.id_course === course.id);
        let topics = obj.topics.filter((t) => t.id_course === course.id);
        let tests = obj.tests.filter((t) => t.id_course === course.id);
        
        // Filtra os estudantes com base no país ou idioma do curso, excluindo admins (id_role = 1), apenas estudantes aprovados
        let students = obj.users.filter((u) => u.id_role === 2 && u.status?.toLowerCase() === "approved" && (course.settings.country_limit ? course.settings.country.includes(u.country) : u.id_lang === course.id_lang));
        
        // Conta os estudantes aprovados: aqueles que completaram ESTE curso (id_course === course.id)
        // Aprovado significa: curso concluído + todos os módulos concluídos + todos os tópicos concluídos + todos os testes concluídos
        let approvedUsers = new Set();
        for (let s = 0; s < students.length; s++) {
          let student = students[s];
          let studentActivity = obj.activity.filter((a) => a.id_user === student.id && a.is_deleted === 0);
          
          if (isStudentApproved(studentActivity, course, modules, topics, tests)) {
            approvedUsers.add(student.id);
          }
        }
        let approved = approvedUsers.size;
        
        // Conta os estudantes reprovados: aqueles que falharam nos testes deste curso
        let repprovedUsers = new Set();
        for (let s = 0; s < students.length; s++) {
          let student = students[s];
          let studentActivity = obj.activity.filter((a) => a.id_user === student.id && a.is_deleted === 0);
          
          if (isStudentRepproved(studentActivity, tests)) {
            repprovedUsers.add(student.id);
          }
        }
        let repproved = repprovedUsers.size;
        
        aux.push({
          id: course.id,
          course_name: course.name,
          start_date:
            course.settings.course_access_expiration &&
            course.settings.course_access_expiration_dates.start_date
              ? dayjs(
                  course.settings.course_access_expiration_dates.start_date,
                ).format("DD MMM, YYYY")
              : "—",
          end_date:
            course.settings.course_access_expiration &&
            course.settings.course_access_expiration_dates.end_date
              ? dayjs(
                  course.settings.course_access_expiration_dates.end_date,
                ).format("DD MMM, YYYY")
              : "—",
          nr_modules: modules.length,
          nr_topics: topics.length,
          nr_tests: tests.length,
          approved: approved,
          repproved: repproved,
          percentage:
            parseFloat(
              students.length > 0
                ? (approved * 100) / students.length
                : 0,
            ).toFixed(2) + "%",
          students: students.length,
          country: course.settings.country_limit
            ? course.settings.country.join(", ")
            : t("All"),
          lang: languages
            .filter((l) => l.id === course.id_lang)[0]
            .code.toUpperCase(), // Para surgir a informação do idioma no Excel
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
        // Se country_limit é true, apenas incluir se o país corresponder
        if (n.settings?.country_limit) {
          return n.settings?.country && Array.isArray(n.settings.country) && n.settings.country.some((item) => values.country.includes(item));
        }
        // Se country_limit é false (All), não incluir quando filtrar por país específico
        return false;
      });
    }

    prepareData({ ...data, courses: newData });
  }

  function onChange(pagination, filters, sorter, extra) {
    setFilteredData(extra.currentDataSource);
  }

  function openExport(data, columns = []) {
    setDataToExport(data);
    setColumnsToExport(columns);
    setIsOpenExport(true);
  }

  function closeExport() {
    setIsOpenExport(false);
  }

  const expandedRowRender = (e) => {
    const columnsExpanded = getExpandedStudentColumns(t);

    let course = data.courses?.filter((c) => c.id === e.id)[0];
    if (!course) return null;
    
    // Filtra apenas os estudantes aprovados pelo administrador, excluindo administradores (id_role = 1)
    let students = data.users?.filter((u) => u.id_role === 2 && u.status?.toLowerCase() === "approved" && (course.settings?.country_limit ? course.settings?.country.includes(u.country) : u.id_lang === course.id_lang)) || [];
    let activity = data.activity?.filter((a) => a.id_course === e.id) || [];

    const dataExpanded = [];

    for (let i = 0; i < students.length; i++) {
      let student = students[i];
      let studentActivity = activity.filter((a) => a.id_user === student.id && a.is_deleted === 0);
      
      // Filtra apenas atividades relevantes (enroll, module, topic, test) - course activity sozinha não conta
      const relevantActivity = studentActivity.filter((a) => ['enroll', 'module', 'topic', 'test'].includes(a.activity_type) && a.is_deleted === 0);
      
      if (relevantActivity.length === 0 && studentActivity.length === 0) {
        // Se o estudante não tiver nenhuma atividade relevante e nenhuma atividade de curso, considera-se que ele não começou o curso
        dataExpanded.push({
          ID: student.id,
          name: student.name,
          email: student.email,
          country: student.country,
          start_date: "—",
          end_date: "—",
          nr_modules: "—",
          nr_topics: "—",
          nr_tests: "—",
          status: t("Not started"),
          lang: languages
            .filter((l) => l.id === course.id_lang)[0]
            .code.toUpperCase(), // Para surgir a informação do idioma no Excel
          course: course.name, // Para surgir a informação do curso no Excel
        });
      } else {
        // Verificar status de inscrição
        const isEnrolled = studentActivity.some((a) => a.activity_type === "enroll" && a.is_completed === 1 && a.is_deleted === 0);
        
        // Obter data de início - preferir registro de inscrição explícito, recorrer à atividade mais antiga
        let startDate = studentActivity.filter((a) => a.activity_type === "enroll" && a.is_deleted === 0)[0]?.created_at;
        if (!startDate) {
          // Fallback: usar a data de atividade mais antiga se não houver início de inscrição (enroll)
          startDate = studentActivity
            .filter((a) => ['topic', 'module', 'test'].includes(a.activity_type) && a.is_deleted === 0)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]?.created_at;
        }
        if (!startDate) {
          // Second fallback: usar qualquer atividade mais antiga se ainda não houver data
          startDate = studentActivity
            .filter((a) => a.is_deleted === 0)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]?.created_at;
        }
        
        let endDate = null; // Será definido apenas se o aluno for aprovado
        
        // Obter todos os testes para este curso
        let tests = data.tests.filter((t) => t.id_course === course.id);
        
        // Verificar se aprovado: deve concluir curso + todos os módulos + todos os tópicos + todos os testes
        const tempCourse = { id: course.id };
        const tempModules = Array(e.nr_modules).fill({});
        const tempTopics = Array(e.nr_topics).fill({});
        const tempTests = Array(e.nr_tests).fill({});
        
        let approved = isStudentApproved(studentActivity, tempCourse, tempModules, tempTopics, tempTests);
        
        // Obter contagens de conclusão para exibição
        const completedModules = studentActivity.filter((a) => a.activity_type === "module" && a.id_course === course.id && a.is_completed === 1 && a.is_deleted === 0).length;
        const completedTopics = studentActivity.filter((a) => a.activity_type === "topic" && a.id_course === course.id && a.is_completed === 1 && a.is_deleted === 0).length;
        const completedTests = studentActivity.filter((a) => a.activity_type === "test" && a.id_course === course.id && a.is_completed === 1 && a.is_deleted === 0).length;
        
        // Apenas verifica módulos, tópicos e testes se eles existirem no curso
        const displayModules = e.nr_modules > 0 ? `${completedModules}/${e.nr_modules}` : "—";
        const displayTopics = e.nr_topics > 0 ? `${completedTopics}/${e.nr_topics}` : "—";
        const displayTests = e.nr_tests > 0 ? `${studentActivity.filter((a) => a.activity_type === "test" && a.is_completed === 1 && a.is_deleted === 0).length}/${e.nr_tests}` : "—";
        
        // Defina endDate apenas se o aluno for aprovado (concluiu tudo)
        if (approved) {
          endDate = studentActivity.filter((a) => a.activity_type === "course" && a.is_completed === 1 && a.is_deleted === 0)[0]?.created_at;
        }
        
        // Verifica se o estudante foi reprovado (independente do status de enrolled)
        let repproved = isStudentRepproved(studentActivity, tests);
        
        // Verificar se o aluno tem qualquer atividade relevante no curso (enroll, module, topic, test, course)
        const hasAnyRelevantActivity = studentActivity.some((a) => 
          ['enroll', 'module', 'topic', 'test', 'course'].includes(a.activity_type) && a.is_deleted === 0
        );
        
        // Determina o status do estudante com base nas condições: Repproved > Approved > In Progress > Not Started
        // Prioridade: Repproved > Approved > In Progress > Not Started
        // "In progress" requer qualquer atividade relevante na course (enroll, module, topic, test, course)
        let status;
        if (repproved) {
          status = t("Repproved");
        } else if (approved) {
          status = t("Approved");
        } else if (isEnrolled || completedModules > 0 || completedTopics > 0 || completedTests > 0 || hasAnyRelevantActivity) {
          // Se o estudante está inscrito, completou atividades, ou tem qualquer atividade relevante, considera-se "In progress"
          status = t("In progress");
        } else {
          status = t("Not started");
        }

        dataExpanded.push({
          ID: student.id,
          name: student.name,
          email: student.email,
          country: student.country,
          start_date: startDate
            ? dayjs(startDate).format("DD MMM, YYYY")
            : "—",
          end_date: repproved
            ? "—" // Indica que o estudante foi reprovado, então não há data de conclusão
            : endDate
              ? dayjs(endDate).format("DD MMM, YYYY")
              : "—",
          nr_modules: displayModules,
          nr_topics: displayTopics,
          nr_tests: displayTests,
          status: status,
          lang: languages
            .filter((l) => l.id === course.id_lang)[0]
            .code.toUpperCase(), // Para surgir a informação do idioma no Excel
          course: course.name, // Para surgir a informação do curso no Excel
        });
      }
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="font-bold mb-2 mt-4">{t("Students")}</p>
          <Button
            className="min-w-50"
            size="large"
            variant="solid"
            color="blue"
            disabled={dataExpanded.length === 0}
            onClick={() => openExport(dataExpanded, columnsExpanded)}
            icon={<DownloadIcon />}
          >
            {t("Export excel")}
          </Button>
        </div>
        <Table
          className="expanded_table"
          columns={columnsExpanded}
          dataSource={dataExpanded}
          pagination={{
            pageSize: 5, // máximo 5 por página
            position: ["bottomCenter"],
          }}
        />
      </div>
    );
  };

  return (
    <div className="p-4">
      <ExportTable
        open={isOpenExport}
        close={closeExport}
        data={dataToExport}
        table={"CoursesReport"}
        columns={columnsToExport}
      />
      <Form form={form} layout="vertical" onFinish={filterData}>
        <div className="grid grid-cols-4 gap-8 mb-4 mt-4">
          <div className="flex justify-end items-end">
            <Button
              className="w-full!"
              size="large"
              variant="solid"
              color="blue"
              // Quando não existe dados na tabela, o botão de exportar é desativado
              disabled={tableData.length === 0}
              onClick={() =>
                openExport(filteredData.length > 0 ? filteredData : tableData, getCourseReportColumns(t, false))
              }
              icon={<DownloadIcon />}
            >
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
            <Button
              className="w-full"
              size="large"
              onClick={form.submit}
              type="primary"
              icon={<SearchIcon />}
            >
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
          rowKey="id"
          dataSource={tableData}
          pagination={{
            pageSize: 5, // máximo 5 por página
            position: ["bottomCenter"], // paginação ao centro
          }}
          columns={getCourseReportColumns(t)}
        />
      </div>
    </div>
  );
}
