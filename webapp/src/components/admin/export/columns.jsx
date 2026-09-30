import { useEffect, useState } from "react";
import { Checkbox, Divider, Form } from "antd";
import { useTranslation } from "react-i18next";

function ChooseColumns({ form, handleSubmit, onFormChange, columnMapping = {}, columns = [], translate }) {
  const { t } = useTranslation();
  const [indeterminate, setIndeterminate] = useState(false);
  const [checkAll, setCheckAll] = useState(false);

  useEffect(() => {
    // Sincronizar apenas os estados visuais (indeterminate/checkAll) com o formulário
    if (columns && columns.length > 0) {
      const currentColumns = form.getFieldValue("columns") || [];
      setIndeterminate(
        currentColumns.length > 0 && currentColumns.length < columns.length,
      );
      setCheckAll(currentColumns.length === columns.length);
    }
  }, [columns, form]);

  function handleCheckAll(e) {
    if (columns && columns.length > 0) {
      const columnDataIndexes = columns.map((col) => col.dataIndex);
      const columnsToSet = e.target.checked ? columnDataIndexes : [];
      form.setFieldValue("columns", columnsToSet);
      if (e.target.checked) setIndeterminate(false);
      setCheckAll(e.target.checked);
      // Notifica o componente pai sobre as mudanças em tempo real
      if (onFormChange) {
        onFormChange(null, { columns: columnsToSet });
      }
    }
  }

  function handleChangeValues(e, all) {
    if (columns && columns.length > 0) {
      const selectedColumns = all.columns || [];
      setIndeterminate(
        columns.length > 0 &&
          selectedColumns.length > 0 &&
          selectedColumns.length < columns.length,
      );
      setCheckAll(selectedColumns.length === columns.length);
      if (onFormChange) {
        onFormChange(null, all);
      }
    }
  }

  return (
    <div className="flex flex-col justify-center items-center p-2">
      <p className="font-bold blue text-[20px] mb-6 mt-6">
        {t("Choose the columns you want to export")}
      </p>
      <p className="text-gray-500 text-[13px] italic mb-4 text-center">
       {t("Note: The exported Excel file may include additional columns with complementary information.")}
      </p>
      <Form
        form={form}
        onFinish={handleSubmit}
        onValuesChange={handleChangeValues}
      >
        <Checkbox
          indeterminate={indeterminate}
          onChange={handleCheckAll}
          checked={indeterminate ? false : checkAll}
        >
          {t("Check all")}
        </Checkbox>
        <Divider />
        <Form.Item name="columns">
          <Checkbox.Group>
            {columns && columns.length > 0
              ? columns.map((col) => {
                  const dataIndex = col.dataIndex;
                  const displayTitle = dataIndex === "attempt_number" ? "attempt_number" : columnMapping[dataIndex] || col.title;
                  return (
                    <Checkbox value={dataIndex} key={dataIndex}>
                      {displayTitle}
                    </Checkbox>
                  );
                })
              : null}
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </div>
  );
}

export default ChooseColumns;
