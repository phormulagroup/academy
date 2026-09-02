import { useState, useEffect } from "react";
import { Form, Upload, Spin, Button, message } from "antd";

import * as XLSX from "xlsx";
import {
  UploadOutlined,
  InboxOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

const { Dragger } = Upload;

function UploadFile({
  next,
  requiredColumns = [],
  title = "Importar ficheiro",
  description = "Faça importação do ficheiro em XLSX",
  mode = "dragger",
  successMessage = null,
  formatInfo = null,
  resetTrigger = null,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [validatedData, setValidatedData] = useState(null);

  // Reinicializar estado quando resetTrigger muda
  useEffect(() => {
    if (resetTrigger !== null) {
      setFileList([]);
      setValidatedData(null);
      setIsLoading(false);
    }
  }, [resetTrigger]);

  const uploadProps = {
    accept: ".xlsx, .xls", 
    name: "file",
    multiple: false,
    onRemove: (file) => {
      // Remover ficheiro da lista
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      setValidatedData(null);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      handleFileChange(file);
      return false; // Prevenir upload automático
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
    fileList: mode === "dragger" ? fileList : [],
    defaultFileList: [],
  };

  const handleFileChange = (fileOrEvent) => {
    // Processar ficheiro do Dragger ou Upload button
    const file = fileOrEvent?.file || fileOrEvent;
    if (!file) return;

    // Verificar formato do ficheiro
    const fileName = file.name || file.fileName;
    const isValidFormat = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isValidFormat) {
      message.error("Ficheiro tem formato inválido. Apenas ficheiros .xlsx são aceitos");
      setFileList([file]);
      setValidatedData(null);
      next(null);
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onerror = () => {
      message.error("Erro ao ler o ficheiro. Por favor, verifique o formato.");
      setIsLoading(false);
      setFileList([file]);
      setValidatedData(null);
      next(null);
    };

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: 0,
          defval: null,
        });

        setFileList([file]);

        // Validar colunas obrigatórias
        if (requiredColumns.length > 0) {
          if (jsonData.length === 0) {
            message.error("O ficheiro não contém dados ou está vazio");
            setIsLoading(false);
            setValidatedData(null);
            next(null);
            return;
          }

          const firstRow = jsonData[0];
          const missingColumns = requiredColumns.filter(
            (col) => !Object.prototype.hasOwnProperty.call(firstRow, col),
          );

          if (missingColumns.length > 0) {
            message.error(
              `O ficheiro não contém as colunas obrigatórias.`,
            );
            setIsLoading(false);
            setValidatedData(null);
            next(null);
            return;
          }
        }

        const successMsg =
          successMessage ||
          `Ficheiro carregado com sucesso! ${jsonData.length} linhas encontradas`;
        message.success(successMsg);
        setValidatedData(jsonData);
        setIsLoading(false);
        next(jsonData);
      } catch (err) {
        console.error("Error parsing file:", err);
        message.error("Erro ao ler o ficheiro Excel. Verifique o formato.");
        setIsLoading(false);
        setValidatedData(null);
        next(null);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = () => {
    if (validatedData) {
      next(validatedData);
    }
  };

  return (
    <Spin
      spinning={isLoading}
      tip={mode === "dragger" ? "Uploading..." : undefined}
      indicator={<LoadingOutlined spin />}
    >
      <div>
        <p
          className={
            mode === "dragger"
              ? "text-[26px] font-bold text-center"
              : "text-[26px] font-bold text-center mb-0"
          }
        >
          {title}
        </p>
        <p
          className={
            mode === "dragger"
              ? "text-center mt-2 mb-4"
              : "text-center mt-2 mb-6"
          }
        >
          {description}
        </p>

        {mode === "dragger" ? (
          <Dragger
            {...uploadProps}
            style={{ maxHeight: 400 }}
            className="import_users_dragger"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="text-[16px]">
              Click or drag file to this area to upload
            </p>
            <p className="text-[12px] mt-2">
              Import a <b>XLSX</b> file
            </p>
          </Dragger>
        ) : (
          <div className="flex justify-center mb-6">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} size="large">
                Selecionar Ficheiro
              </Button>
            </Upload>
          </div>
        )}

        {fileList.length > 0 && mode === "button" && (
          <div className="mb-6">
            <p className="font-semibold mb-2">Ficheiro selecionado:</p>
            <div className={`p-3 rounded border flex justify-between items-center ${
              validatedData 
                ? "bg-gray-50 border-gray-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div>
                <span className="text-sm">{fileList[0].name}</span>
                {validatedData && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {validatedData.length} linhas validadas
                  </p>
                )}
                {!validatedData && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ Ficheiro inválido
                  </p>
                )}
              </div>
              <Button 
                danger 
                size="small"
                onClick={() => {
                  setFileList([]);
                  setValidatedData(null);
                  next(null);
                }}
              >
                Remover
              </Button>
            </div>
          </div>
        )}

        {formatInfo && (
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="font-semibold mb-2">Formato esperado:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {formatInfo.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Spin>
  );
}

export default UploadFile;
