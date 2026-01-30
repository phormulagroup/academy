import React, { useEffect, useState } from "react";
import { Button, Col, Form, InputNumber, Radio, Drawer, Row, Upload, Spin, Table, Tooltip, Progress, Steps, Input, Select, message } from "antd";
import axios from "axios";
import * as XLSX from "xlsx";

import { AiOutlineInfoCircle, AiOutlineLoading } from "react-icons/ai";

function MatchColumns({ step, next, prev, tableColumns, dbColumns, tableData }) {
  const [isLoading, setIsLoading] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    if (step === 1) {
      let auxFormInitialValues = [];
      for (let i = 0; i < tableColumns.length; i++) {
        auxFormInitialValues.push({
          column: tableColumns[i].title,
          db_column: dbColumns.filter((item) => item.Field.toLowerCase() === tableColumns[i].title)[0]?.Field,
        });
      }

      form.setFieldValue("columns", auxFormInitialValues);
      setIsLoading(false);
    }
  }, []);

  function handleSubmit(values) {
    let newTableData = [];
    let objectKeys = Object.keys(tableData[0]);
    for (let i = 0; i < tableData.length; i++) {
      let newObject = {};
      objectKeys.filter((item) => {
        const findDbColumn = values.columns.filter((d) => d.column === item)[0];
        newObject = { ...newObject, [findDbColumn.db_column]: tableData[i][findDbColumn.column] };
      });
      if (Object.keys(newObject).includes("email") && newObject.email) {
        newObject.email = newObject.email.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        newObject.email = newObject.email.replaceAll(" ", "");
      }

      newTableData.push(newObject);
    }

    next(newTableData);
  }

  return (
    <Spin spinning={isLoading} indicator={<AiOutlineLoading spin />}>
      <Form form={form} onFinish={handleSubmit}>
        <p className="text-[26px] font-bold text-center mb-0">Match Columns</p>
        <p className="text-center mt-2 mb-4">Verifique as colunas se estão associadas a uma coluna da base de dados</p>

        <Table className="import-table" columns={tableColumns ?? []} dataSource={tableData.slice(0, 3) ?? []} scroll={{ x: 1 }} />

        <Form.List name="columns">
          {(fields) => (
            <div>
              {fields.map((field) => (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {field.name === 0 ? <p>Colunas da importação</p> : null}
                    <Form.Item name={[field.name, "column"]}>
                      <Input readOnly size="large" />
                    </Form.Item>
                  </div>
                  <div>
                    {field.name === 0 ? <p>Colunas da base de dados</p> : null}
                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.columns !== currentValues.columns}>
                      {({ getFieldValue }) => {
                        return (
                          <Form.Item name={[field.name, "db_column"]} rules={[{ required: true, message: "Este é um campo obrigatório" }]}>
                            <Select
                              showSearch
                              allowClear
                              key={"type"}
                              size="large"
                              style={{ width: "100%" }}
                              placeholder="Selecione..."
                              filterOption={(input, option) => (option?.value ?? "").toLowerCase().includes(input.toLowerCase())}
                              options={dbColumns.map((value, index) => ({
                                value: value.Field,
                                label: value.Field,
                                disabled:
                                  getFieldValue("columns").filter((item) => item.db_column === value.Field && getFieldValue("columns")[field.name].db_column !== value.Field)
                                    .length > 0,
                              }))}
                              defaultValue={dbColumns.filter((item) => item.Field.toLowerCase() === getFieldValue("columns")[field.name].column)[0]?.Field}
                            />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Form.List>
      </Form>
      <div className="flex justify-center items-center mt-6">
        <Button className="mr-2" onClick={prev}>
          Anterior
        </Button>
        <Button type="primary" onClick={form.submit}>
          Seguinte
        </Button>
      </div>
    </Spin>
  );
}

export default MatchColumns;
