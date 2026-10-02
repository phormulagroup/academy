import { useContext, useState } from "react";
import { Button, Spin, Upload } from "antd";
import * as XLSX from "xlsx";
import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import { FaFileExcel } from "react-icons/fa";
import { LuDownload } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";

const { Dragger } = Upload;

// Primeiro passo: escolher o ficheiro .xlsx. Dá também um modelo para descarregar, com as colunas esperadas e uma linha de exemplo.
function UploadFile({ next, fields = [], table }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  function downloadTemplate() {
    const headers = fields.map((f) => f.Field);
    const example = fields.map((f) => f.example ?? "");
    const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
    sheet["!cols"] = headers.map((h) => ({ wch: Math.max(16, h.length + 4) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Data");
    XLSX.writeFile(workbook, `${table}-import-template.xlsx`);
  }

  function handleFile(file) {
    // Leitura/parse síncronos: o Spin dá feedback enquanto decorre
    setIsLoading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      toastApi.error(t("Error reading the file. Please check the format."));
      setIsLoading(false);
    };
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target.result), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // raw:false devolve o texto como aparece no Excel (datas incluídas), em vez de números de série
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 0, defval: null, raw: false, dateNF: "yyyy-mm-dd" });
        next(jsonData, file);
      } catch (err) {
        console.log(err);
        toastApi.error(t("Error reading the Excel file. Check the format."));
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <Spin spinning={isLoading} tip={t("Loading...")} indicator={<LoadingOutlined spin />}>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F9FC]">
          <FaFileExcel className="text-[22px] text-[#163986]" />
        </div>
        <p className="mb-1! text-[22px] font-bold">{t("Import file")}</p>
        <p className="mb-3! text-[#8A8D98]">{t("Upload an XLSX file with the data to import.")}</p>
        {fields.length > 0 && (
          <Button icon={<LuDownload />} onClick={downloadTemplate}>
            {t("Download template")}
          </Button>
        )}
      </div>
      <Dragger
        accept=".xlsx,.xls"
        name="file"
        multiple={false}
        showUploadList={false}
        beforeUpload={(file) => {
          handleFile(file);
          return Upload.LIST_IGNORE; // não envia nada: o ficheiro é lido aqui
        }}
        className="rounded-[15px]!">
        <p className="ant-upload-drag-icon">
          <InboxOutlined className="text-[#163986]!" />
        </p>
        <p className="mb-1! text-[16px] font-medium">{t("Click or drag the file to this area to upload it")}</p>
        <p className="mb-0! text-[12px] text-[#8A8D98]">
          {t("Only")} <b>.xlsx</b> {t("files — the 1st row must have the column names")}
        </p>
      </Dragger>
      {fields.length > 0 && (
        <div className="mt-6 rounded-[12px] bg-[#F6F7F9] p-4">
          <p className="mb-2! text-[13px] font-bold">{t("Expected columns")}</p>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <span key={f.Field} className="rounded-full border border-solid border-[#E5E7EB] bg-white px-3 py-1 text-[12px]">
                <b>{f.Field}</b> <span className="text-[#8A8D98]">· {t(f.label)}</span>
                {f.required === true && <span className="ml-1 text-[#DB0709]">*</span>}
              </span>
            ))}
          </div>
          <p className="mb-0! mt-3 text-[12px] text-[#8A8D98]">{t("Required: e-mail and a name (first and last name, or the full name). The other columns are optional.")}</p>
        </div>
      )}
    </Spin>
  );
}

export default UploadFile;
