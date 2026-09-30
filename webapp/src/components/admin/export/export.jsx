import { useState, useEffect } from "react";
import { Button, Drawer, Steps, Form } from "antd";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

import ChooseColumns from "./columns";
import ExportData from "./data";
import { columnExcelWidths } from "../../../utils/columns";

export default function ExportTable({ open, close, data, table, columns = [] }) {
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [dataToExport, setDataToExport] = useState([]);
  const [columnsToExport, setColumnsToExport] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

    const { t } = useTranslation();
  
  const [form] = Form.useForm();

  // Mapeia os títulos das colunas para exibição amigável (por exemplo, "course_name" para "Nome do Curso")
  useEffect(() => {
    if (columns && columns.length > 0) {
      const mapping = {};
      columns.forEach((col) => {
        if (col.dataIndex) {
          mapping[col.dataIndex] = col.title;
        }
      });
      setColumnMapping(mapping);
    }
  }, [columns]);

  useEffect(() => {
    setDataToExport(data);
  }, [data]);

  // Restaura as colunas selecionadas ao voltar ao passo anterior (apenas quando é clicado "Anterior")
  useEffect(() => {
    if (current === 0 && columnsToExport.length > 0 && open) {
      const columnNames = columnsToExport.map((col) => col.dataIndex);
      form.setFieldValue("columns", columnNames);
      setSelectedColumns(columnNames);
    }
  }, [current, columnsToExport, form, open]);

  // Resetar completamente quando drawer fecha
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSelectedColumns([]);
      setColumnsToExport([]);
      setCurrent(0);
    }
  }, [open, form]);

  function handleClose() {
    close(); 
  }

  function handleExport() {
    setIsButtonLoading(true);
    let fileName = `${dayjs().format("YYYY-MM-DD")}_${dayjs().format("HHmmss")}_${table}Export.xlsx`;
    let exportData = [];

    // Verifica se os dados contêm campos de tentativa (attempt_number, user_name) ou questões (question, answer, user_name)
    const hasAttemptFields = dataToExport.length > 0 && 
      "attempt_number" in dataToExport[0] && 
      "user_name" in dataToExport[0];

    const hasQuestionFields = dataToExport.length > 0 && 
      "question" in dataToExport[0] && 
      "answer" in dataToExport[0] &&
      "user_name" in dataToExport[0];

    let finalColumnsToExport = [...columnsToExport]; // Cria uma cópia das colunas selecionadas para exportação

    if (hasAttemptFields || hasQuestionFields) {
      // Para tabelas de tentativas e questões, filtra as colunas de metadados para exportação
      finalColumnsToExport = finalColumnsToExport.filter(
        (col) => !["user_name", "user_email", "test_name", "course", "course_name", "lang"].includes(col.dataIndex),
      );

      // Adiciona as colunas de metadados na ordem exata: user_name, user_email, test_name, course, lang
      finalColumnsToExport.push({ title: t("Name"), dataIndex: "user_name" });
      finalColumnsToExport.push({ title: "E-mail", dataIndex: "user_email" });
      finalColumnsToExport.push({ title: t("Test"), dataIndex: "test_name" });
      finalColumnsToExport.push({ title: t("Course"), dataIndex: "course" });
      if (dataToExport.length > 0 && "lang" in dataToExport[0]) {
        finalColumnsToExport.push({ title: "lang", dataIndex: "lang" });
      }
    } else {
      // Para tabelas que não são de tentativas, verifica se as colunas "course_name" e "course" estão presentes e ajusta a lista final de colunas para exportação
      const hasCourseName = columnsToExport.some(
        (col) => col.dataIndex === "course_name",
      );
      const hasCourse = columnsToExport.some(
        (col) => col.dataIndex === "course",
      );

      if (hasCourseName && hasCourse) {
        finalColumnsToExport = finalColumnsToExport.filter(
          (col) => col.dataIndex !== "course",
        );
      } else if (
        !hasCourse &&
        !hasCourseName &&
        dataToExport.length > 0 &&
        "course" in dataToExport[0]
      ) {
        finalColumnsToExport.push({ title: "course", dataIndex: "course" });
      }

      // Adiciona a coluna "lang" se não estiver presente e se os dados tiverem essa propriedade
      const hasLang = finalColumnsToExport.some((col) => col.dataIndex === "lang");
      if (!hasLang && dataToExport.length > 0 && "lang" in dataToExport[0]) {
        finalColumnsToExport.push({ title: "lang", dataIndex: "lang" });
      }
    }

    const headers = finalColumnsToExport.map((column) => column.title);
    exportData.push(headers);

    dataToExport.forEach((row) => {
      let rowData = finalColumnsToExport.map((column) => {
        let value = row[column.dataIndex || column.key];
        if (
          typeof value === "object" &&
          value?.props &&
          value.props?.children
        ) {
          value = value?.props?.children;
        }
        return value;
      });
      exportData.push(rowData);
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(exportData);

    // Define as larguras das colunas do Excel baseado na configuração centralizada
    const colWidths = finalColumnsToExport.map((col) => {
      const colConfig = columnExcelWidths.columns[col.dataIndex];
      return colConfig || columnExcelWidths.defaultWidth;
    });
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, fileName);
    close();
    setIsButtonLoading(false);
  }

  function handleChooseColumns(e) {
    let auxColumns = e.columns;
    let aux = [];
    for (let i = 0; i < auxColumns.length; i++) {
      aux.push({
        title: auxColumns[i] === "attempt_number" ? "attempt_number" : columnMapping[auxColumns[i]] || auxColumns[i], // Use friendly title from mapping, except for attempt_number
        dataIndex: auxColumns[i],
      });
    }

    setColumnsToExport(aux);
    setCurrent(1);
  }

  function handleChangeStep(e) {
    setCurrent(e);
  }

  function handleFormColumnsChange(changedValues, allValues) {
    // Atualiza o estado com as colunas selecionadas do formulário em tempo real
    const columns = allValues.columns || [];
    setSelectedColumns(columns);
  }

  return (
    <Drawer
      key="drawer-export"
      title={t("Export")}
      size={800}
      onClose={handleClose}
      open={open}
      extra={[
        <div>
          {current === 0 && (
            <Button
              type="primary"
              onClick={form.submit}
              disabled={selectedColumns.length === 0}
            >
              {t("Next")}
            </Button>
          )}
          {current === 1 && (
            <>
              <Button className="mr-2" onClick={() => setCurrent(0)}>
                {t("Previous")}
              </Button>
              <Button
                loading={isButtonLoading}
                type="primary"
                onClick={handleExport}
              >
                {t("Export")}
              </Button>
            </>
          )}
        </div>,
      ]}
    >
      {open && (
        <div>
          <Steps
            current={current}
            onChange={handleChangeStep}
            className="register-steps"
            items={[
              {
                title: t("Choose columns"),
              },
              {
                title: t("Export data"),
              },
            ]}
          />
          {current === 0 && (
            <ChooseColumns
              form={form}
              handleSubmit={handleChooseColumns}
              onFormChange={handleFormColumnsChange}
              columnMapping={columnMapping}
              columns={columns}
              translate={t}
            />
          )}
          {current === 1 && (
            <ExportData
              data={dataToExport}
              columns={columnsToExport}
              table={table}
              columnMapping={columnMapping}
              translate={t}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}
