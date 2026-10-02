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
 * Gera as colunas da tabela de relatório de testes
 * @param {Function} t - Função de tradução (i18next)
 * @returns {Array} Array de colunas para Ant Design Table
 */
export const getTestReportColumns = (t) => {
  return [
    {
      title: t("Test"),
      dataIndex: "test_name",
      key: "test_name",
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
      title: t("Name"),
      dataIndex: "user_name",
      key: "user_name",
    },
    {
      title: t("E-mail"),
      dataIndex: "user_email",
      key: "user_email",
    },
    {
      title: t("Course"),
      dataIndex: "course_name",
      key: "course_name",
    },
    {
      title: t("Attempts"),
      dataIndex: "attempts",
      key: "attempts",
    },
    {
      title: t("Average Score"),
      dataIndex: "avg_score",
      key: "avg_score",
    },
    {
      title: t("Average Percentage"),
      dataIndex: "avg_percentage",
      key: "avg_percentage",
    },
    {
      title: t("Average Time"),
      dataIndex: "avg_time",
      key: "avg_time",
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

