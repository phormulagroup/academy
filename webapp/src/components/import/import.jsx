import React, { useEffect, useState } from "react";
import { Form, Drawer, Spin, Steps } from "antd";
import axios from "axios";
import { AiOutlineLoading } from "react-icons/ai";

import UploadFile from "./upload";
import MatchColumns from "./match";
import Submit from "./submit";

import endpoints from "../../utils/endpoints";

function Import({ open, close, table }) {
  const [isLoading, setIsLoading] = useState(false);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [dbColumns, setDbColumns] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [form] = Form.useForm();

  const stepsContent = [
    <UploadFile next={handleImportedFile} />,
    <MatchColumns step={currentStep} next={handleColumnsChecked} prev={handlePrevious} dbColumns={dbColumns} tableColumns={tableColumns} tableData={originalTableData} />,
    <Submit
      step={currentStep}
      otherTable={"event_user"}
      table={table}
      next={handleColumnsChecked}
      prev={handlePrevious}
      dbColumns={dbColumns}
      tableColumns={tableColumns}
      dataToImport={tableData}
    />,
  ];

  const steps = [
    {
      title: "Upload file",
    },
    {
      title: "Match columns",
    },
    {
      title: "Import",
    },
  ];

  useEffect(() => {
    if (open) {
      handleGetTableInfo();
    }
  }, [open]);

  function handleGetTableInfo() {
    axios
      .get(endpoints.import.table, {
        params: { table },
      })
      .then((res) => {
        let newDbColumns = res.data.table;
        if (res.data.otherTable) {
          newDbColumns = [...newDbColumns, ...res.data.otherTable.map((item) => ({ ...item, Field: `${"event_user"}_${item.Field}` }))];
        }

        setDbColumns(newDbColumns);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function handleClose() {
    close();
    setCurrentStep(0);
    form.resetFields();
  }

  function handleImportedFile(jsonData) {
    console.log(jsonData);
    setOriginalTableData(jsonData);

    let tableColumnsArray = Object.keys(jsonData[0]);
    let auxTableColumns = [];

    for (let z = 0; z < tableColumnsArray.length; z++) {
      auxTableColumns.push({
        title: tableColumnsArray[z],
        dataIndex: tableColumnsArray[z],
        key: z,
      });
    }
    setTableColumns(auxTableColumns);
    setCurrentStep(currentStep + 1);
  }

  function handleColumnsChecked(newTableData) {
    setTableData(newTableData);
    setCurrentStep(currentStep + 1);
  }

  function handlePrevious() {
    setCurrentStep(currentStep - 1);
  }

  return (
    <Drawer className="drawer-user" key={`drawer-import`} title="Importar" size={1200} onClose={handleClose} open={open}>
      <Spin spinning={isLoading} tip="Uploading..." indicator={<AiOutlineLoading spin />}>
        <Steps current={currentStep} items={steps} />
        <div className="mt-6">{stepsContent[currentStep]}</div>
      </Spin>
    </Drawer>
  );
}

export default Import;
