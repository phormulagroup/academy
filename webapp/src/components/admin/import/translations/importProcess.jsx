import { useState, useContext, useEffect } from "react";
import { Button, Spin, message, Result } from "antd";
import { AiOutlineLoading } from "react-icons/ai";
import axios from "axios";
import { Context } from "../../../../utils/context";
import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";

function ImportProcess({
  step,
  uploadedData,
  selectedLanguages,
  allLanguages,
  prev,
  close,
}) {
  const { getLanguages } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImport = async () => {
    try {
      setIsLoading(true);

      // Simular delay para melhor UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Importar traduções para cada idioma selecionado
      for (const langCode of selectedLanguages) {
        const targetLanguage = allLanguages?.find(
          (l) => l.code.toLowerCase() === langCode.toLowerCase(),
        );

        if (!targetLanguage) {
          message.warning(`${t("Language")} ${langCode} ${t("not found, skipping...")}`);
          continue;
        }

        // Construir array de traduções a partir dos dados carregados
        const translations = uploadedData
          .map((row) => {
            const langName = targetLanguage.name;

            if (row.Key && row[langName]) {
              return {
                key: row.Key,
                value: row[langName],
              };
            }
            return null;
          })
          .filter((item) => item !== null);

        // Mesclar com traduções existentes
        let existingTranslations = [];
        if (targetLanguage.translation) {
          try {
            existingTranslations = JSON.parse(targetLanguage.translation) || [];
          } catch (err) {
            console.error("Erro ao analisar traduções existentes:", err);
          }
        }

        // Estratégia de mesclagem: atualizar chaves existentes, adicionar novas
        const mergedTranslations = [...existingTranslations];

        for (const trans of translations) {
          const existingIndex = mergedTranslations.findIndex(
            (t) => t.key === trans.key,
          );
          if (existingIndex >= 0) {
            mergedTranslations[existingIndex] = trans;
          } else {
            mergedTranslations.push(trans);
          }
        }

        // Preparar dados para atualização
        const countryData =
          typeof targetLanguage.country === "string"
            ? JSON.parse(targetLanguage.country)
            : targetLanguage.country;

        const updateData = {
          data: {
            id: targetLanguage.id,
            country: countryData,
            translation: JSON.stringify(mergedTranslations),
          },
          table: "language",
        };

        // Chamar endpoint de atualização
        await axios.post(endpoints.language.update, updateData);
      }

      // Atualizar cache de idiomas globalmente
      await getLanguages();

      // Mostrar sucesso
      setImportSuccess(true);
      setIsLoading(false);

      // Fechar automaticamente após 3.5 segundos
      setTimeout(() => {
        close(true);
      }, 3500);
    } catch (err) {
      console.error("Erro ao importar traduções:", err);
      message.error(t("Error importing translations. Please try again."));
      setIsLoading(false);
    }
  };

  return (
    <Spin
      spinning={isLoading}
      indicator={<AiOutlineLoading spin />}
      tip={t("Importing translations...")}
    >
      <div>
        {importSuccess ? (
          <Result
            status="success"
            title={t("Translations Imported Successfully!")}
            subTitle={`${selectedLanguages.length} ${t("language(s) updated with")} ${uploadedData?.length || 0} ${t("translations")}`}
            extra={
              <Button type="primary" onClick={() => close(true)}>
                {t("Close")}
              </Button>
            }
          />
        ) : (
          <div>
            <p className="text-[26px] font-bold text-center mb-0">
              {t("Confirm Import")}
            </p>
            <p className="text-center mt-2 mb-6">
              {t("Are you ready to import the translations?")}
            </p>

            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-6">
              <p className="font-semibold mb-2">{t("Import Summary:")}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  {t("Records to import:")}{" "}
                  <strong>{uploadedData?.length || 0}</strong>
                </li>
                <li>
                  {t("Languages to update:")}{" "}
                  <strong>
                    {selectedLanguages
                      .map(
                        (code) =>
                          allLanguages?.find((l) => l.code === code)?.name ||
                          code,
                      )
                      .join(", ")}
                  </strong>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <Button onClick={prev}>{t("Previous")}</Button>
              <Button type="primary" onClick={handleImport} size="large">
                {t("Import Translations")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Spin>
  );
}

export default ImportProcess;
