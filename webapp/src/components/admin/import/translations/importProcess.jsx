import { useState, useContext, useEffect } from "react";
import { Button, Spin, message, Result } from "antd";
import { AiOutlineLoading } from "react-icons/ai";
import axios from "axios";
import { Context } from "../../../../utils/context";
import endpoints from "../../../../utils/endpoints";

function ImportProcess({
  step,
  uploadedData,
  selectedLanguages,
  allLanguages,
  prev,
  close,
}) {
  const { getLanguages } = useContext(Context);
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
          message.warning(`Idioma ${langCode} não encontrado, a saltar...`);
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
      message.error("Erro ao importar traduções. Por favor, tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <Spin
      spinning={isLoading}
      indicator={<AiOutlineLoading spin />}
      tip="Importando traduções..."
    >
      <div>
        {importSuccess ? (
          <Result
            status="success"
            title="Traduções Importadas com Sucesso!"
            subTitle={`${selectedLanguages.length} idioma(s) atualizado(s) com ${uploadedData?.length || 0} traduções`}
            extra={
              <Button type="primary" onClick={() => close(true)}>
                Fechar
              </Button>
            }
          />
        ) : (
          <div>
            <p className="text-[26px] font-bold text-center mb-0">
              Confirmar Importação
            </p>
            <p className="text-center mt-2 mb-6">
              Está pronto para importar as traduções?
            </p>

            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-6">
              <p className="font-semibold mb-2">Resumo da Importação:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Registos a importar:{" "}
                  <strong>{uploadedData?.length || 0}</strong>
                </li>
                <li>
                  Idiomas a atualizar:{" "}
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
              <Button onClick={prev}>Anterior</Button>
              <Button type="primary" onClick={handleImport} size="large">
                Importar Traduções
              </Button>
            </div>
          </div>
        )}
      </div>
    </Spin>
  );
}

export default ImportProcess;
