import { useEffect, useState, useCallback } from "react";
import { Button, Form, Select } from "antd";

import { useTranslation } from "react-i18next";
import { Doughnut } from "react-chartjs-2";
import SearchIcon from "../../../assets/Backoffice/search.svg?react";

export default function TestProgress({ data, products, languages }) {
  const { t } = useTranslation();

  const [graphicGlobal, setGraphicGlobal] = useState({
    notStarted: { value: 0, label: t("Not started"), color: "#C7F1F8" },
    inProgress: { value: 0, label: t("In progress"), color: "#9BE3EF" },
    approved: { value: 0, label: t("Approved"), color: "#40CBE0" },
    notApproved: { value: 0, label: t("Repproved"), color: "#0397AE" },
  });
  const [graphicScore, setGraphicScore] = useState({
    "<= 100%": { value: 0, label: "<= 100%", color: "#0397AE" },
    "< 80%": { value: 0, label: "< 80%", color: "#00B9D6" },
    "< 60%": { value: 0, label: "< 60%", color: "#40CBE0" },
    "< 40%": { value: 0, label: "< 40%", color: "#9BE3EF" },
    "< 20%": { value: 0, label: "< 20%", color: "#C7F1F8" },
  });
  const [graphicAvgScoreByLang, setGraphicAvgScoreByLang] = useState([]);

  const [form] = Form.useForm();

  const filterProgressCourses = useCallback(
    (id_product, obj) => {
      // Verifica se os dados necessários estão presentes
      if (!obj || !obj.courses || !obj.tests || !obj.activity || !obj.users) {
        // Se algum dos dados estiver ausente, reinicializa os gráficos com valores zero
        setGraphicGlobal((prev) => ({
          notStarted: { ...prev.notStarted, value: 0 },
          inProgress: { ...prev.inProgress, value: 0 },
          approved: { ...prev.approved, value: 0 },
          notApproved: { ...prev.notApproved, value: 0 },
        }));
        setGraphicScore((prev) => ({
          "<= 100%": { ...prev["<= 100%"], value: 0 },
          "< 80%": { ...prev["< 80%"], value: 0 },
          "< 60%": { ...prev["< 60%"], value: 0 },
          "< 40%": { ...prev["< 40%"], value: 0 },
          "< 20%": { ...prev["< 20%"], value: 0 },
        }));
        setGraphicAvgScoreByLang(
          (languages || []).map((lang) => ({
            id: lang.id,
            code: lang.code.toUpperCase(),
            avgScore: 0,
            flag: lang.flag,
          })),
        );
        return;
      }

      // Inicializa os contadores para os gráficos
      let auxGraphicGlobalValues = {
        notStarted: 0,
        inProgress: 0,
        approved: 0,
        notApproved: 0,
      };
      let auxGraphicScoreValues = {
        "<= 100%": 0,
        "< 80%": 0,
        "< 60%": 0,
        "< 40%": 0,
        "< 20%": 0,
      };

      // Filtra os cursos com base no produto selecionado (se houver) - admins veem draft e published courses
      let filteredCourses = obj.courses.filter((c) => c.is_deleted !== 1);
      if (id_product) {
        filteredCourses = filteredCourses.filter(
          (c) => c.id_product === id_product,
        );
      }

      // Filtra apenas os users regulares (id_role = 2) com status aprovado (aprovados pelo administrador)
      // Exclui testes de cursos em draft - que só devem ser vistos pelo admin
      let users = obj.users.filter(
        (u) => u.id_role === 2 && u.status?.toLowerCase() === "approved",
      );
      let testScoreMap = {};
      let testUserAttempts = {}; // Agrupa tentativas por combinação de user e test
      let notApprovedTests = new Set(); // Rastreia combinações de user/test que não foram aprovadas

      // Primeira passagem: Agrupa tentativas por combinação de user e test, e calcula a pontuação média
      for (let u = 0; u < users.length; u++) {
        let findActivity = obj.activity.filter(
          (_a) =>
            _a.id_user === users[u].id &&
            _a.activity_type === "test" &&
            _a.is_deleted === 0,
        );

        if (findActivity.length > 0) {
          // Filtra apenas atividades que pertencem a cursos filtrados
          findActivity = findActivity.filter((_a) =>
            filteredCourses.some((c) => c.id === _a.id_course),
          );

          if (findActivity.length > 0) {
            for (let i = 0; i < findActivity.length; i++) {
              let item = findActivity[i];
              let key = `${users[u].id}_${item.id_course_test}`;

              if (!testUserAttempts[key]) {
                testUserAttempts[key] = [];
              }
              testUserAttempts[key].push(item);
            }
          }
        }
      }

      // Segunda passagem: Calcula a pontuação média, status e distribuições para cada combinação de user/test
      for (let key in testUserAttempts) {
        let attempts = testUserAttempts[key];

        // Calcula a porcentagem média em todas as tentativas
        let totalPercentage = 0;
        let firstItem = attempts[0];

        for (let j = 0; j < attempts.length; j++) {
          let item = attempts[j];
          item.meta_data =
            item.meta_data && typeof item.meta_data === "string"
              ? JSON.parse(item.meta_data)
              : item.meta_data;

          let totalItems = item.meta_data.items;
          let percentage =
            totalItems.length > 0
              ? (totalItems.filter((_t) => _t.is_correct).length * 100) /
                totalItems.length
              : 0;

          totalPercentage += percentage;
        }

        let avgPercentage =
          attempts.length > 0 ? totalPercentage / attempts.length : 0;

        // Verifica se o teste foi concluído (is_completed === 1) para determinar se é aprovado
        let isCompleted = attempts.some((a) => a.is_completed === 1);

        if (isCompleted) {
          auxGraphicGlobalValues.approved += 1;
        }

        /**
         * Distribuição de pontuação média em faixas:
         * < 20%: 0 to 19.99%
         * < 40%: 20% to 39.99%
         * < 60%: 40% to 59.99%
         * < 80%: 60% to 79.99%
         * <= 100%: 80% to 100%
         */

        // Distribui a pontuação média em faixas para o gráfico de pontuação
        if (avgPercentage < 20) auxGraphicScoreValues["< 20%"] += 1;
        else if (avgPercentage < 40) auxGraphicScoreValues["< 40%"] += 1;
        else if (avgPercentage < 60) auxGraphicScoreValues["< 60%"] += 1;
        else if (avgPercentage < 80) auxGraphicScoreValues["< 80%"] += 1;
        else if (avgPercentage <= 100) auxGraphicScoreValues["<= 100%"] += 1;

        // Registra a pontuação por idioma - apenas de cursos não deletados (filteredCourses)
        let c = filteredCourses.filter(
          (_c) => _c.id === firstItem.id_course,
        )[0];
        if (c && c.id_lang) {
          if (!testScoreMap[c.id_lang]) {
            testScoreMap[c.id_lang] = { total: 0, count: 0 };
          }
          testScoreMap[c.id_lang].total += avgPercentage;
          testScoreMap[c.id_lang].count += 1;
        }

        // Verifica se o teste tem limite de tentativas e se o user excedeu esse limite sem passar, para marcar como "Not Approved"
        const { id_course_test } = firstItem;
        let findTest = obj.tests.filter(
          (c) => c.id === id_course_test && c.is_deleted !== 1,
        )[0];
        if (findTest && !isCompleted) {
          // Apenas considera para "Not Approved" se o teste não foi concluído
          let testSettings =
            findTest.settings && typeof findTest.settings === "string"
              ? JSON.parse(findTest.settings)
              : findTest.settings;

          // Verifica se o teste tem limite de tentativas configurado
          if (
            testSettings &&
            testSettings.retries_allowed &&
            testSettings.retries_allowed > 0
          ) {
            if (attempts.length >= testSettings.retries_allowed) {
              notApprovedTests.add(key);
            } else {
              // User tem tentativas restantes = In Progress
              auxGraphicGlobalValues.inProgress += 1;
            }
          } else {
            // Se o teste NÃO tem retries_allowed configurado, trata como In Progress (tentativas ilimitadas/em andamento)
            auxGraphicGlobalValues.inProgress += 1;
          }
        }
      }

      // Count "Not Approved" tests - combinações de user/test que excederam o limite de tentativas sem passar
      auxGraphicGlobalValues.notApproved = notApprovedTests.size;

      // Count "Not Started" tests - testes em cursos filtrados que não têm nenhuma tentativa registrada
      // Exclui testes deletados (is_deleted = 1)
      let allTestsInFilteredCourses = new Set();
      for (let i = 0; i < filteredCourses.length; i++) {
        let testsForCourse = obj.tests.filter(
          (t) => t.id_course === filteredCourses[i].id && t.is_deleted !== 1,
        );
        for (let j = 0; j < testsForCourse.length; j++) {
          allTestsInFilteredCourses.add(testsForCourse[j].id);
        }
      }

      // Verifica quais testes em cursos filtrados não têm tentativas registradas
      let testsWithAttempts = new Set();
      for (let key in testUserAttempts) {
        let attempts = testUserAttempts[key];
        if (attempts.length > 0) {
          testsWithAttempts.add(attempts[0].id_course_test);
        }
      }

      // Not started = testes em cursos filtrados que não têm tentativas registradas
      for (let testId of allTestsInFilteredCourses) {
        if (!testsWithAttempts.has(testId)) {
          auxGraphicGlobalValues.notStarted += 1;
        }
      }

      // Calcula a pontuação média por idioma
      const availableLangs = languages || [];
      const avgByLang = availableLangs.map((lang) => {
        const langData = testScoreMap[lang.id];
        const avgScore = langData
          ? (langData.total / langData.count).toFixed(2)
          : 0;
        return {
          id: lang.id,
          code: lang.code.toUpperCase(),
          avgScore: parseFloat(avgScore),
          flag: lang.flag,
        };
      });

      setGraphicAvgScoreByLang(avgByLang);

      // Atualiza os estados dos gráficos com os valores calculados
      setGraphicGlobal((prev) => ({
        notStarted: {
          ...prev.notStarted,
          value: auxGraphicGlobalValues.notStarted,
        },
        inProgress: {
          ...prev.inProgress,
          value: auxGraphicGlobalValues.inProgress,
        },
        approved: { ...prev.approved, value: auxGraphicGlobalValues.approved },
        notApproved: {
          ...prev.notApproved,
          value: auxGraphicGlobalValues.notApproved,
        },
      }));
      setGraphicScore((prev) => ({
        "<= 100%": {
          ...prev["<= 100%"],
          value: auxGraphicScoreValues["<= 100%"],
        },
        "< 80%": { ...prev["< 80%"], value: auxGraphicScoreValues["< 80%"] },
        "< 60%": { ...prev["< 60%"], value: auxGraphicScoreValues["< 60%"] },
        "< 40%": { ...prev["< 40%"], value: auxGraphicScoreValues["< 40%"] },
        "< 20%": { ...prev["< 20%"], value: auxGraphicScoreValues["< 20%"] },
      }));
    },
    [languages],
  );

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      // Recalcula os gráficos com base nos dados recebidos
      form.resetFields();
      filterProgressCourses(null, data); // Chama a função de filtragem sem filtro de produto inicialmente
    }
  }, [data, filterProgressCourses, form]);

  function filterData(values) {
    filterProgressCourses(values.product || null, data);
  }

  return (
    <div className="p-4">
      <Form form={form} layout="vertical" onFinish={filterData}>
        <div className="grid grid-cols-4 gap-8 mb-4 mt-4">
          <div className="col-span-2"></div>
          {/* Filtrar por produto */}
          <Form.Item name="product" label={t("Product")} className="mb-0!">
            <Select
              allowClear
              size="large"
              className="w-full"
              placeholder={t("Select product")}
              showSearch={{
                optionFilterProp: ["label"],
              }}
              options={products?.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          {/* Filtrar por curso */}
          {/* <Form.Item name="course" label={t("Course")} className="mb-0!">
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
          </Form.Item> */}
          <div className="flex justify-center items-end">
            <Button
              className="w-full"
              size="large"
              onClick={form.submit}
              type="primary"
              icon={<SearchIcon />}>
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
                          labels: [
                            graphicGlobal.notStarted?.label,
                            graphicGlobal.approved?.label,
                            graphicGlobal.inProgress?.label,
                            graphicGlobal.notApproved?.label,
                          ],
                          datasets: [
                            {
                              data: [
                                graphicGlobal.notStarted.value,
                                graphicGlobal.approved.value,
                                graphicGlobal.inProgress.value,
                                graphicGlobal.notApproved.value,
                              ],
                              backgroundColor: [
                                graphicGlobal.notStarted.color,
                                graphicGlobal.approved.color,
                                graphicGlobal.inProgress.color,
                                graphicGlobal.notApproved.color,
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
                    <div className="w-1/2">
                      {Object.keys(graphicGlobal).map((_k) => {
                        const item = graphicGlobal[_k];
                        if (!item || !item.label) return null;
                        return (
                          <div
                            key={_k}
                            className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div
                                className={`mr-2 min-w-3 w-3 min-h-3 h-3 rounded-full`}
                                style={{
                                  backgroundColor: item.color,
                                }}></div>
                              <p className="text-[11px]">{item.label}</p>
                            </div>
                            <div className="min-w-10 flex justify-center items-center">
                              <p className="text-[11px]">{item.value}</p>
                            </div>
                          </div>
                        );
                      })}
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
                      {Object.keys(graphicScore).map((_k) => {
                        const item = graphicScore[_k];
                        if (!item || !item.label) return null;
                        return (
                          <div
                            key={_k}
                            className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div
                                className={`mr-2 min-w-3 w-3 min-h-3 h-3 rounded-full`}
                                style={{
                                  backgroundColor: item.color,
                                }}></div>
                              <p className="text-[11px]">{item.label}</p>
                            </div>
                            <div className="min-w-10 flex justify-center items-center">
                              <p className="text-[11px]">{item.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold mb-2">Score médio por idioma</p>
            <div className="p-4 border border-[#C0C0C0] rounded-[5px]">
              {graphicAvgScoreByLang && graphicAvgScoreByLang.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {graphicAvgScoreByLang.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex justify-between items-center pb-2 border-b border-[#E0E0E0]">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.flag}
                          alt={item.code}
                          className="max-w-5 max-h-5 rounded-sm"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <span className="text-sm font-medium">{item.code}</span>
                      </div>
                      <span className="text-sm font-bold">
                        {item.avgScore.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t("No data available")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
