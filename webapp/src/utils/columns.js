/**
 * @constant ColumnWidths
 * @description Esta constante define as larguras das colunas para exportação em Excel, mapeando o dataIndex de cada coluna para sua largura correspondente.
 * As larguras são definidas em caracteres (wch) e podem ser ajustadas conforme necessário.
 * A propriedade defaultWidth define a largura padrão para colunas que não possuem uma largura específica definida.
 * @type {Object}
 * @property {Object} columns - Um objeto que mapeia o dataIndex de cada coluna para sua largura correspondente em caracteres (wch).
 * @property {Object} defaultWidth - Um objeto que define a largura padrão para colunas que não possuem uma largura específica definida.
 */

export const columnExcelWidths = {
  columns: {
    name: { wch: 25 }, // 187px
    course_name: { wch: 40 }, // 300px
    test_name: { wch: 40 }, // 300px
    email: { wch: 40 }, // 300px
    user_name: { wch: 25 }, // 187px
    user_email: { wch: 40 }, // 300px
    user_country: { wch: 20 }, // 150px
    course: { wch: 40 }, // 300px
    internal_name: { wch: 40 }, // 300px
    answer: { wch: 75 }, // 757px
    question: { wch: 105 }, // 1058px
  },
  defaultWidth: { wch: 11 }, // Largura padrão para outras colunas
};

/**
 * Gera as colunas da tabela de relatório de cursos
 * @param {Function} t - Função de tradução (i18next)
 * @param {Boolean} includeId - Se true, inclui coluna de ID (para exportação)
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getCourseReportColumns = (t, includeId = false) => {
  const cols = [
    {
      title: t("Course"),
      dataIndex: "course_name",
      key: "course_name",
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
  ];

  if (includeId) {
    cols.unshift({
      title: t("ID"),
      dataIndex: "id",
      key: "id",
    });
  }

  return cols;
};

/**
 * Gera as colunas da tabela de relatório de testes (uma linha por teste)
 * @param {Function} t - Função de tradução (i18next)
 * @param {Boolean} forExport - Se true, o curso aparece como "Nome interno" e juntam-se as colunas só do Excel
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getTestReportColumns = (t, forExport = false) => {
  const col = (title, key, extra = {}) => ({ title: t(title), dataIndex: key, key, ...extra });
  const cols = [
    col("Test", "test_name", { width: "300px" }),
    col("Start date", "start_date"),
    col("End date", "end_date"),
    // Na tabela o nome do curso ("Curso"); no Excel o nome interno ("Nome interno")
    forExport ? col("Internal name", "internal_name") : col("Course", "course_name"),
    col("Approved", "approved"),
    col("Failed", "failed"),
    col("Percentage", "percentage"),
    col("Students", "students"),
    // No Excel, um teste sem limite próprio num curso com limite fica "Todos (países do curso)"
    col("Country", "country", forExport ? { value: (r) => r.country_export || r.country } : {}),
  ];
  if (!forExport) return cols;
  return [
    ...cols,
    col("Language", "lang"),
    col("In progress", "in_progress"),
    col("Not started", "not_started"),
    col("Average result", "avg_result"),
    col("Passing score", "passing_score"),
    col("Time limit", "time_limit"),
    col("Retries allowed", "retries"),
  ];
};

/**
 * Gera as colunas da lista de alunos de um teste (linha expandida do relatório de testes)
 * @param {Function} t - Função de tradução (i18next)
 * @param {Boolean} forExport - Se true, nome e e-mail em colunas separadas e juntam-se as colunas só do Excel
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getTestStudentColumns = (t, forExport = false) => {
  const col = (title, key, extra = {}) => ({ title: t(title), dataIndex: key, key, ...extra });
  const cols = [
    ...(forExport ? [col("ID", "ID"), col("Name", "name"), col("E-mail", "email")] : [col("Name", "name")]),
    col("Country", "country"),
    col("Start date", "start_date"),
    col("End date", "end_date"),
    col("Attempts", "attempts"),
    col("Average Score", "avg_score"),
    col("Average Percentage", "avg_percentage"),
    col("Average Time", "avg_time"),
    col("Status", "status"),
  ];
  if (!forExport) return cols;
  return [...cols, col("Best score (%)", "best_percentage"), col("Test", "test_name"), col("Internal name", "course"), col("Language", "lang")];
};

/**
 * Gera as colunas das tentativas de um aluno num teste
 * @param {Function} t - Função de tradução (i18next)
 * @param {Boolean} forExport - Se true, juntam-se o aluno, o teste, o curso e o idioma (para o Excel)
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getTestAttemptColumns = (t, forExport = false) => {
  const col = (title, key, extra = {}) => ({ title: t(title), dataIndex: key, key, ...extra });
  // No Excel o "Nº" sozinho não se percebe: "Nº da tentativa"
  const cols = [col(forExport ? "Attempt Nº" : "Nº", "attempt_number"), col("Date", "date"), col("Score", "score"), col("Percentage", "percentage"), col("Time", "time"), col("Status", "status")];
  if (!forExport) return cols;
  return [col("Name", "user_name"), col("E-mail", "user_email"), ...cols, col("Test", "test_name"), col("Internal name", "course"), col("Language", "lang")];
};

/**
 * Gera as colunas das perguntas de uma tentativa (resposta do aluno e resultado)
 * @param {Function} t - Função de tradução (i18next)
 * @param {Boolean} forExport - Se true, juntam-se o aluno, a data da tentativa, o teste, o curso e o idioma (para o Excel)
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getTestQuestionColumns = (t, forExport = false) => {
  const col = (title, key, extra = {}) => ({ title: t(title), dataIndex: key, key, ...extra });
  const cols = [col("Question", "question", { width: 320 }), col("Answer", "answer", { width: 260 }), col("Result", "result", { width: 120 })];
  if (!forExport) return cols;
  return [
    col("Name", "user_name"),
    col("E-mail", "user_email"),
    col("Country", "user_country"),
    col("Attempt date", "date"),
    col("Test", "test_name"),
    col("Internal name", "course"),
    col("Language", "lang"),
    ...cols,
  ];
};

/**
 * Gera as colunas para as linhas expandidas (detalhes de estudantes) em relatórios
 * @param {Function} t - Função de tradução (i18next)
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getExpandedStudentColumns = (t) => {
  return [
    {
      title: "ID",
      dataIndex: "ID",
      key: "ID",
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
      // Estado guardado em inglês (chave de tradução): traduz ao mostrar
      render: (value) => (typeof value === "string" ? t(value) : value),
    },
  ];
};

