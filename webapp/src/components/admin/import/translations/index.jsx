import React, { useEffect, useState, useContext } from "react";
import { Drawer, Spin, Steps, Button } from "antd";
import { AiOutlineLoading } from "react-icons/ai";

import UploadFile from "../upload";
import SelectLanguages from "./selectLanguages";
import ImportProcess from "./importProcess";

import { Context } from "../../../../utils/context";
import { useTranslation } from "react-i18next";

function TranslationsImport({ open, close }) {
  const { languages, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedData, setUploadedData] = useState(null);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  const handleUploadComplete = (data) => {
    if (data === null) {
      // Ficheiro foi removido
      setUploadedData(null);
    } else {
      // Ficheiro foi carregado e validado
      setUploadedData(data);
    }
    // Don't auto-advance, wait for user to click Seguinte button
  };

  const handleLanguagesSelected = (langs) => {
    setSelectedLanguages(langs);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && uploadedData) {
      setCurrentStep(1);
    } else if (currentStep === 1 && selectedLanguages.length > 0) {
      setCurrentStep(2);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setUploadedData(null);
    setSelectedLanguages([]);
    setResetCounter(prev => prev + 1); // Reinicializar componente upload
    close(true);
  };

  const handleDrawerClose = () => {
    handleClose();
  };

  const formatInfo = [
    t("Key column (translation identifier)"),
    t("English column (reference language)"),
    `${t("Language columns")}: Português, Español, Français, etc.`,
    `${t("File format")}: XLSX`,
  ];

  const steps = [
    {
      title: t("File Upload"),
    },
    {
      title: t("Select Languages"),
    },
    {
      title: t("Import"),
    },
  ];

  const stepsContent = [
    <UploadFile
      key="upload"
      next={handleUploadComplete}
      requiredColumns={["Key", "English"]}
      title={t("File Upload")}
      description={t("Select an Excel file with the translations to import")}
      mode="button"
      successMessage={t("File uploaded successfully!")}
      formatInfo={formatInfo}
      resetTrigger={resetCounter}
    />,
    <SelectLanguages
      key="select"
      step={currentStep}
      uploadedData={uploadedData}
      allLanguages={languages}
      next={handleLanguagesSelected}
      prev={handlePrevious}
      hideButtons={true}
      headerSelectedLanguage={selectedLanguage}
    />,
    <ImportProcess
      key="import"
      step={currentStep}
      uploadedData={uploadedData}
      selectedLanguages={selectedLanguages}
      allLanguages={languages}
      prev={handlePrevious}
      close={handleClose}
    />,
  ];

  return (
    <Drawer
      open={open}
      onClose={handleDrawerClose}
      maskClosable={false}
      size="large"
      title={t("Import Translations")}
      extra={[]}
    >
      <Spin spinning={isLoading} indicator={<AiOutlineLoading spin />}>
        <Steps
          current={currentStep}
          items={steps}
          size="small"
          style={{ marginBottom: "40px" }}
        />
        <div style={{ minHeight: "400px" }}>{stepsContent[currentStep]}</div>
        
        {/* Botões de navegação para os passos 0 e 1 */}
        {currentStep < 2 && (
          <div className="flex justify-center items-center mt-6 gap-2">
            <Button 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              {t("Previous")}
            </Button>
            <Button 
              type="primary" 
              onClick={handleNext}
              disabled={currentStep === 0 ? !uploadedData : currentStep === 1 ? selectedLanguages.length === 0 : false}
            >
              {t("Next")}
            </Button>
          </div>
        )}
      </Spin>
    </Drawer>
  );
}

export default TranslationsImport;
