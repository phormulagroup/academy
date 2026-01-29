import { useState } from "react";
import { Form, Upload, Spin } from "antd";

import * as XLSX from "xlsx";
import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

function UploadFile({ next }) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const uploadProps = {
    accept: ".xlsx",
    name: "file",
    multiple: false,
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      handleFileChange(file);
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
    fileList,
    defaultFileList: [],
  };

  const handleFileChange = (e) => {
    const file = e;
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: 0,
          defval: null,
        });

        next(jsonData);
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <Spin spinning={isLoading} tip="Uploading..." indicator={<LoadingOutlined spin />}>
      <div>
        <p className="text-[26px] font-bold text-center">Importar ficheiro</p>
        <p className="text-center mt-2 mb-4">Faça importação do ficheiro em XLSX</p>
        <Dragger {...uploadProps} style={{ maxHeight: 400 }} className="import_users_dragger">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="text-[16px]">Click or drag file to this area to upload</p>
          <p className="text-[12px] mt-2">
            Import a <b>XLSX</b> file
          </p>
        </Dragger>
      </div>
    </Spin>
  );
}

export default UploadFile;
