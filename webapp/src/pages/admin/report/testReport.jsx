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
import { getTestReportColumns } from "../../../utils/columns";



export default function TestReport({ data }) {
  const { user, selectedLanguage, languages } = useContext(Context);
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dataToExport, setDataToExport] = useState([]);
  const [columnsToExport, setColumnsToExport] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isOpenExport, setIsOpenExport] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      prepareData(data);
      setCourses(data.courses);
      setActivity(data.activity);
    }
  }, [data]);

  useEffect(() => {
    setCountries(
      JSON.parse(
        languages.filter((l) => l.id === selectedLanguage.id)[0].country,
      ),
    );
  }, [selectedLanguage]);


  function formatAvgTime(seconds) {
    const hours = Math.floor(seconds / 3600);

    if (hours > 0) {
      // Para horas, arredonda os minutos e descarta os segundos
      const remainingSeconds = seconds % 3600;
      const minutes = Math.round(remainingSeconds / 60);
      return `${hours} h ${minutes} min`;
    } else {
      const minutes = Math.floor(seconds / 60);
      if (minutes > 0) {
        // Para minutos, mostra minutos e segundos
        const secs = seconds % 60;
        return `${minutes} min ${secs} s`;
      } else {
        // Para segundos, mostra apenas os segundos
        return `${seconds} s`;
      }
    }
  }

  // Função auxiliar para verificar se o aluno é reprovado num teste
  const isTestRepproved = (testAttempts, test) => {
    // Não é reprovado se não houver tentativas limite
    if (!test || !test.settings) {
      return false;
    }
    
    let testSettings = typeof test.settings === "string" ? JSON.parse(test.settings) : test.settings;
    
    // Apenas marca como reprovado se retries_allowed for um número válido
    if (!testSettings || !testSettings.retries_allowed || testSettings.retries_allowed <= 0) {
      return false;
    }
    
    // Verificar se o aluno passou no teste
    const testPassed = testAttempts.some((a) => a.is_completed === 1);
    if (testPassed) {
      return false; // Se passou, não é reprovado
    }
    
    // Contar tentativas falhadas
    const failedAttempts = testAttempts.filter((a) => a.is_completed === 0).length;
    
    // Apenas reprovado se tiver tentativas falhadas e se o número de tentativas falhadas for >= permitido
    return failedAttempts > 0 && failedAttempts >= testSettings.retries_allowed;
  };

  function prepareData(obj) {
    let aux = [];
    if (obj.users && obj.activity && obj.activity.length > 0) {
      // Filtra apenas os utilizadores regulares (id_role = 2) com status aprovado e as suas atividades de teste não eliminadas
      let regularUsers = obj.users.filter((u) => u.id_role === 2 && u.status?.toLowerCase() === "approved");
      let testsActivity = obj.activity.filter(
        (a) => a.activity_type === "test" && a.is_deleted === 0 && regularUsers.some((u) => u.id === a.id_user),
      );

      // Agrupa as atividades por utilizador e teste, para calcular médias e outras métricas
      const groupedByUserTest = {};

      for (let i = 0; i < testsActivity.length; i++) {
        let item = testsActivity[i];

        item.meta_data =
          item.meta_data && typeof item.meta_data === "string"
            ? JSON.parse(item.meta_data)
            : item.meta_data;

        let test = obj.tests.filter((t) => t.id === item.id_course_test)[0];
        let testQuestions =
          test.question && typeof test.question === "string"
            ? JSON.parse(test.question)
            : test.question;
        const titlesOrder = testQuestions.map((item) => item.title);

        let resTestOrdered = item.meta_data.items.sort(function (a, b) {
          return titlesOrder.indexOf(a.title) - titlesOrder.indexOf(b.title);
        });

        item.meta_data.items = resTestOrdered;

        const groupKey = `${item.id_user}_${item.id_course_test}`;

        // Inicializa o array para cada grupo se ainda não existir
        if (!groupedByUserTest[groupKey]) {
          groupedByUserTest[groupKey] = [];
        }

        // Armazena cada tentativa no grupo correspondente
        groupedByUserTest[groupKey].push(item);
      }

      for (const groupKey in groupedByUserTest) {
        // Itera sobre cada grupo de utilizador-teste
        const activityAttempts = groupedByUserTest[groupKey];
        if (activityAttempts.length === 0) continue;

        const attemptSample = activityAttempts[0]; // Pega a primeira tentativa como amostra para obter informações do teste e do utilizador
        const test = obj.tests.filter(
          (t) => t.id === attemptSample.id_course_test,
        )[0];

        const testSettings =
          test.settings && typeof test.settings === "string"
            ? JSON.parse(test.settings)
            : test.settings;

        const start_date = testSettings?.start_date
          ? dayjs(testSettings.start_date).format("DD MMM, YYYY")
          : null;

        const end_date = testSettings?.end_date
          ? dayjs(testSettings.end_date).format("DD MMM, YYYY")
          : null;

        // Calcula a pontuação média, percentagem média e tempo médio para cada grupo de tentativas
        let totalScore = 0;
        let totalPercentage = 0;
        let totalTimeInSeconds = 0;
        let attemptCount = activityAttempts.length;

        for (let attempt of activityAttempts) {
          const correctCount = attempt.meta_data.items.filter(
            (q) => q.is_correct,
          ).length;
          const totalItems = attempt.meta_data.items.length;
          const percentage =
            totalItems > 0 ? (correctCount * 100) / totalItems : 0;

          totalScore += correctCount;
          totalPercentage += percentage;
          totalTimeInSeconds += attempt.meta_data.time;
        }

        const avgScore = (totalScore / attemptCount).toFixed(2);
        const avgPercentage = (totalPercentage / attemptCount).toFixed(2);
        const avgTimeInSeconds = Math.round(totalTimeInSeconds / attemptCount);

        const avgTime = formatAvgTime(avgTimeInSeconds);

        // Debug status: Approved se passou na última tentativa, Repproved se esgotou as tentativas permitidas
        const sortedAttempts = [...activityAttempts].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const lastAttempt = sortedAttempts[sortedAttempts.length - 1];
        let Status;
        
        if (lastAttempt.is_completed === 1) {
          Status = "Approved";
        } else if (isTestRepproved(activityAttempts, test)) {
          Status = "Repproved";
        } else {
          Status = "In progress";
        }

        aux.push({
          id: `${attemptSample.id_user}_${attemptSample.id_course_test}`, // Chave única para cada combinação de utilizador-teste
          test_name: attemptSample.test_title,
          start_date: start_date,
          end_date: end_date,
          user_name: obj.users.filter((u) => u.id === attemptSample.id_user)[0]
            .name,
          user_email: obj.users.filter((u) => u.id === attemptSample.id_user)[0]
            .email,
          course_name: obj.courses.filter(
            (c) => c.id === attemptSample.id_course,
          )[0].name,
          attempts: attemptCount,
          avg_score: avgScore + "/" + attemptSample.meta_data.items.length,
          avg_percentage: avgPercentage + "%",
          avg_time: avgTime,
          status: Status,
          lang: languages
            .filter(
              (l) =>
                l.id ===
                obj.courses.filter((c) => c.id === attemptSample.id_course)[0]
                  .id_lang,
            )[0]
            .code.toUpperCase(),
          id_course_test: attemptSample.id_course_test,
          id_user: attemptSample.id_user,
          id_course: attemptSample.id_course,
        });
      }
    }
    setTableData(aux);
    setFilteredData(aux);
  }

  function filterData(values) {
    // Começar com as atividades de teste (ignorar outros tipos de atividade)
    let testsActivity = activity.filter((a) => a.activity_type === "test" && a.is_deleted === 0);

    // Filtrar por curso se selecionado
    if (values.course) {
      testsActivity = testsActivity.filter((a) => a.id_course === values.course);
    }

    // Filtrar por país se selecionado
    if (values.country && values.country.length > 0) {
      testsActivity = testsActivity.filter((a) => {
        // Encontrar o curso associado a este teste
        const course = data.courses.find((c) => c.id === a.id_course);
        if (!course) return false;

        // Se country_limit é true, apenas incluir se o país corresponder
        if (course.settings.country_limit) {
          return course.settings.country && Array.isArray(course.settings.country) && course.settings.country.some((item) => values.country.includes(item));
        }
        return false;
      });
    }

    prepareData({ ...data, activity: testsActivity });
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

  const expandedAttemptRowRender = (e) => {
    const columnsExpanded = [
      {
        title: t("Nº"),
        dataIndex: "attempt_number",
        key: "attempt_number",
      },
      {
        title: t("Date"),
        dataIndex: "date",
        key: "date",
      },
      {
        title: t("Score"),
        dataIndex: "score",
        key: "score",
      },
      {
        title: t("Percentage"),
        dataIndex: "percentage",
        key: "percentage",
      },
      {
        title: t("Time"),
        dataIndex: "time",
        key: "time",
      },
      {
        title: t("Approved"),
        dataIndex: "approved",
        key: "approved",
      },
    ];

    
    // Filtra as atividades para o utilizador e teste específicos, excluindo admins
    const regularUsers = data.users.filter((u) => u.id_role === 2);
    const testsActivity = data.activity.filter(
      (a) =>
        a.activity_type === "test" &&
        a.id_user === e.id_user &&
        a.id_course_test === e.id_course_test &&
        a.is_deleted === 0 &&
        regularUsers.some((u) => u.id === a.id_user),
    );

    //Ordena as tentativas por data
    testsActivity.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const dataExpanded = [];

    for (let i = 0; i < testsActivity.length; i++) {
      let attempt = testsActivity[i];

      attempt.meta_data =
        attempt.meta_data && typeof attempt.meta_data === "string"
          ? JSON.parse(attempt.meta_data)
          : attempt.meta_data;

      const correctCount = attempt.meta_data.items.filter(
        (q) => q.is_correct,
      ).length;
      const totalItems = attempt.meta_data.items.length;
      const score = `${correctCount}/${totalItems}`;
      const percentage =
        totalItems > 0 ? `${((correctCount * 100) / totalItems).toFixed(2)}%` : "0%";
      const time = formatAvgTime(attempt.meta_data.time);

      dataExpanded.push({
        key: i, // Chave única para cada tentativa
        attempt_number: i + 1,
        date: attempt.created_at
          ? dayjs(attempt.created_at).format("DD/MM/YYYY")
          : attempt.created_at,
        score: score,
        percentage: percentage,
        time: time,
        approved: attempt.is_completed ? "yes" : "no",
        // Adiciona informações adicionais para exportação
        user_name: data.users.filter((u) => u.id === attempt.id_user)[0].name,
        user_email: data.users.filter((u) => u.id === attempt.id_user)[0].email,
        test_name: attempt.test_title,
        lang: languages
          .filter(
            (l) =>
              l.id ===
              data.courses.filter((c) => c.id === attempt.id_course)[0].id_lang,
          )[0]
          .code.toUpperCase(),
        course: data.courses.filter((c) => c.id === attempt.id_course)[0].name,
        meta_data: attempt.meta_data, // Armazena meta_data para acesso no expandedQuestionRowRender
      });
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="font-bold mb-2 mt-4">{t("Attempts")}</p>
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
          expandable={{ 
            expandedRowRender: expandedQuestionRowRender,
            rowExpandable: (record) => record.meta_data && record.meta_data.items && record.meta_data.items.length > 0
          }}
          pagination={{
            pageSize: 5,
            position: ["bottomCenter"],
          }}
        />
      </div>
    );
  };

  const expandedQuestionRowRender = (e) => {
    const columnsExpanded = [
      {
        title: t("Question"),
        dataIndex: "question",
        key: "question",
        width: 200,
      },
      {
        title: t("Answer"),
        dataIndex: "answer",
        key: "answer",
        width: 200,
      },
      {
        title: t("Result"),
        dataIndex: "result",
        key: "result",
        width: 100,
      },
    ];

    const dataExpanded = [];
    // safeguard para garantir que meta_data e items existem antes de tentar acessá-los
    if (e.meta_data && e.meta_data.items && e.meta_data.items.length > 0) {
      for (let i = 0; i < e.meta_data.items.length; i++) {
        let question = e.meta_data.items[i];
        dataExpanded.push({
          key: i,
          question: question.title,
          answer: question.myAnswer,
          result: question.is_correct ? t("Correct") : t("Incorrect"),
          // Adiciona informações adicionais para exportação no Excel
          user_name: e.user_name,
          user_email: e.user_email,
          course: e.course,
          test_name: e.test_name,
          lang: e.lang,
        });
      }
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="font-bold mb-2 mt-4">{t("Questions")}</p>
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
            pageSize: 5,
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
        table={"TestReport"}
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
                openExport(filteredData.length > 0 ? filteredData : tableData, getTestReportColumns(t))
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
          rowKey="id"
          onChange={onChange}
          expandable={{ expandedRowRender: expandedAttemptRowRender, rowExpandable: (record) => record.attempts > 0 }}
          dataSource={tableData}
          pagination={{
            pageSize: 5, // máximo 5 por página
            position: ["bottomCenter"], // paginação ao centro
          }}
          columns={getTestReportColumns(t)}
        />
      </div>
    </div>
  );
}
