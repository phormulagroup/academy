import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Spin, Steps } from "antd";
import axios from "axios";
import { RxReload } from "react-icons/rx";
import { useTranslation } from "react-i18next";

import UploadFile from "./upload";
import MatchColumns from "./match";
import Submit from "./submit";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

// Assistente de importação em 3 passos: carregar o ficheiro, associar as colunas aos campos e importar (com o resultado por linha).
// `table` diz o que se importa (por agora "user").
export default function Import({ open, close, table }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [fields, setFields] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [rows, setRows] = useState([]); // linhas do ficheiro, como vieram
  const [fileColumns, setFileColumns] = useState([]);
  const [mappedRows, setMappedRows] = useState([]); // linhas já com os nomes dos campos
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (open) loadFields();
  }, [open]);

  function loadFields() {
    setIsLoading(true);
    setHasLoadError(false);
    axios
      .get(endpoints.import.fields, { params: { table } })
      .then((res) => setFields(res.data.fields))
      .catch((err) => {
        console.log(err);
        setHasLoadError(true);
        toastApi.error(err.response?.data?.message || t("Could not load the fields to match. Please try again."));
      })
      .finally(() => setIsLoading(false));
  }

  function reset() {
    setCurrentStep(0);
    setFileInfo(null);
    setRows([]);
    setFileColumns([]);
    setMappedRows([]);
  }

  function handleClose(imported) {
    close(imported === true);
    reset();
  }

  function handleImportedFile(jsonData, file) {
    // Só cabeçalho (ou vazio): não há colunas para associar
    if (!jsonData || jsonData.length === 0) {
      toastApi.error(t("The file has no data rows. Check that the 1st row has the column names and that there is at least one row below it."));
      return;
    }
    setFileInfo(file ? { name: file.name, size: file.size } : null);
    setRows(jsonData);
    setFileColumns(Object.keys(jsonData[0]));
    setCurrentStep(1);
  }

  const steps = [{ title: t("Upload file") }, { title: t("Match columns") }, { title: t("Import") }];

  return (
    <Drawer title={t("Import")} size={1100} onClose={() => handleClose(false)} open={open} destroyOnHidden>
      <Spin spinning={isLoading}>
        <Steps current={currentStep} items={steps} />
        <div className="mt-6">
          {hasLoadError && currentStep > 0 ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <p className="text-[#8A8D98]">{t("Could not load the fields to match.")}</p>
              <Button icon={<RxReload />} onClick={loadFields}>
                {t("Try again")}
              </Button>
            </div>
          ) : currentStep === 0 ? (
            <UploadFile table={table} fields={fields} next={handleImportedFile} />
          ) : currentStep === 1 ? (
            <MatchColumns
              file={fileInfo}
              fields={fields}
              fileColumns={fileColumns}
              rows={rows}
              onRemoveFile={reset}
              prev={() => setCurrentStep(0)}
              next={(mapped) => {
                setMappedRows(mapped);
                setCurrentStep(2);
              }}
            />
          ) : (
            <Submit table={table} fields={fields} rows={mappedRows} prev={() => setCurrentStep(1)} onDone={() => handleClose(true)} />
          )}
        </div>
      </Spin>
    </Drawer>
  );
}
