import React, { useContext, useEffect, useState } from "react";
import { Button, Col, Form, InputNumber, Row, Table, Progress, Select, Segmented } from "antd";
import axios from "axios";

import { FaRegCheckCircle } from "react-icons/fa";
import endpoints from "../../../utils/endpoints";

function Submit({ step, prev, dataToImport, table }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [segmentedValue, setSegementedValue] = useState(table);

  const [tableColumns, setTableColumns] = useState([]);
  const [results, setResults] = useState({});

  const [progress, setProgess] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    if (step === 2) {
      let tableColumnsArray = Object.keys(dataToImport[0]);
      let auxTableColumns = [];

      for (let z = 0; z < tableColumnsArray.length; z++) {
        auxTableColumns.push({
          title: tableColumnsArray[z],
          dataIndex: tableColumnsArray[z],
          key: z,
          width: "50%",
        });
      }

      setTableColumns(auxTableColumns);
    }
  }, [step]);

  async function handleSubmit(values) {
    setIsLoading(true);
    setIsButtonLoading(true);
    setIsImporting(true);

    let limit_bulk = values.limit_bulk ? values.limit_bulk : dataToImport.length;
    let auxDataToImport = dataToImport.slice(0, limit_bulk);
    let count = 0;
    let insertedData = {
      inserted: [],
      all: dataToImport,
    };

    values.type = "skip";

    handleManageImportData(auxDataToImport, limit_bulk, values.type, count, insertedData)
      .then((res) => {
        console.log(res);
        setResults(res);
        setShowResult(true);
        setIsLoading(false);
        setIsButtonLoading(false);
        setIsImporting(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        setIsButtonLoading(false);
      });
  }

  async function handleManageImportData(data, limit_bulk, type, count, insertedData) {
    return handleImport(data, type).then((importedData) => {
      setProgess(parseInt(((count + 1) * limit_bulk * 100) / dataToImport.length));

      console.log(importedData);
      insertedData.inserted = [...insertedData.inserted, ...importedData.data.inserted];

      console.log("----- insertedData -----");
      console.log(insertedData);
      console.log("----------");

      count++;
      let auxDataToImport = dataToImport.slice(count * limit_bulk, limit_bulk * count + limit_bulk);
      if (auxDataToImport.length > 0) {
        return handleManageImportData(auxDataToImport, limit_bulk, type, count, insertedData);
      } else {
        return {
          insertedData,
        };
      }
    });
  }

  function handleImport(e, type) {
    return new Promise((resolve, reject) => {
      axios
        .post(endpoints.import[table], {
          data: { values: e, table, type },
        })
        .then((res) => {
          resolve(res);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  return (
    <div>
      {isImporting ? (
        <div className="flex justify-center items-center" style={{ minHeight: 300 }}>
          <div>
            <Progress type="circle" percent={progress} />
          </div>
        </div>
      ) : showResult ? (
        <div className="flex flex-col justify-center items-center w-full">
          <p className="text-[26px] font-bold text-center mb-0">Sucesso!</p>
          <p className="text-center mt-2">Os dados foram importados com sucesso</p>
          <div className="grid grid-cols-2 w-full max-w-[400px]">
            <div className="flex flex-col justify-center items-center">
              <p className="m-0 text-[12px] text-center">Atualizados</p>
              <div className="import-data updated">
                <p className="text-[40px] font-bold m-0 text-center orange">{dataToImport.length - results.insertedData?.inserted?.length}</p>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center">
              <p className="m-0 text-[12px] text-center">Novos</p>
              <div className="import-data inserted">
                <p className="text-[40px] font-bold m-0 text-center green">{results.insertedData?.inserted?.length}</p>
              </div>
            </div>
          </div>

          <Table
            className="import-table w-full"
            columns={[
              ...tableColumns,
              {
                title: "status",
                dataIndex: "status",
                key: "status",
              },
            ]}
            dataSource={dataToImport.map((item) => ({
              ...item,
              status:
                results.insertedData.inserted.filter((e) => e.domain === item.domain).length > 0 ? (
                  <FaRegCheckCircle className="text-green-500" />
                ) : (
                  <FaRegCheckCircle className="text-orange-500" />
                ),
            }))}
            loading={isTableLoading}
            scroll={{ x: 1 }}
          />
        </div>
      ) : (
        <div>
          <p className="text-[26px] font-bold text-center mb-0">Importar dados</p>
          <p className="text-center mt-2 mb-4">Verifique se os dados estão todos corretos</p>
          <Table
            className="import-table"
            columns={tableColumns}
            dataSource={dataToImport}
            loading={isTableLoading}
            scroll={{ x: 1 }}
            pagination={{
              pageSize: 5,
            }}
          />

          <div className="flex flex-col justify-center items-center">
            <p className="mb-0">Nº de linhas a importar:</p>
            <p className="text-[24px] font-bold mb-4">{dataToImport.length}</p>
          </div>
          <Form form={form} id="form-import" onFinish={handleSubmit} className="form w-full" autoComplete="off" layout="vertical">
            <Form.Item label="Limit bulk" name="limit_bulk">
              <InputNumber className="w-full" size="large" placeholder="0" />
            </Form.Item>
          </Form>
          {!showResult && (
            <div className="flex justify-center items-center mt-6">
              <Button className="mr-2" onClick={prev} loading={isButtonLoading}>
                Anterior
              </Button>
              <Button type="primary" onClick={form.submit} loading={isButtonLoading}>
                Importar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Submit;
