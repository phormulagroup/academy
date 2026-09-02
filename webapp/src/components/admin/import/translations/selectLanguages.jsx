import { useState, useEffect } from "react";
import { Button, message, Spin } from "antd";
import { AiOutlineLoading } from "react-icons/ai";

function SelectLanguages({ step, uploadedData, allLanguages, next, prev, hideButtons, headerSelectedLanguage }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);

  useEffect(() => {
    if (step === 1 && uploadedData && uploadedData.length > 0) {
      // Obter nomes das colunas do ficheiro carregado
      const fileColumns = Object.keys(uploadedData[0]);

      // Encontrar idiomas na base de dados que correspondam às colunas do ficheiro
      const available =
        allLanguages?.filter(
          (lang) => fileColumns.includes(lang.name) && lang.code !== "en",
        ) || [];

      setAvailableLanguages(available);

      // Lógica: usar idioma selecionado do header se disponível no ficheiro, senão usar o primeiro disponível
      let initialSelection = [];

      if (headerSelectedLanguage) {
        const headerLangCode = headerSelectedLanguage.code;
        if (available.some((lang) => lang.code === headerLangCode)) {
          initialSelection = [headerLangCode];
        }
      }

      // Se o idioma do header não estiver no ficheiro, usar o primeiro disponível
      if (initialSelection.length === 0 && available.length > 0) {
        initialSelection = [available[0].code];
      }

      // Definir seleção e notificar pai
      if (initialSelection.length > 0) {
        setSelectedLanguages(initialSelection);
        next(initialSelection);
      }

      setIsLoading(false);
    }
  }, [step, uploadedData, allLanguages, headerSelectedLanguage]);

  const toggleLanguage = (code) => {
    let updatedLanguages;
    if (selectedLanguages.includes(code)) {
      updatedLanguages = selectedLanguages.filter((c) => c !== code);
    } else {
      updatedLanguages = [...selectedLanguages, code];
    }
    setSelectedLanguages(updatedLanguages);
    // Atualizar seleção pai automaticamente
    next(updatedLanguages);
  };

  const handleNext = () => {
    if (selectedLanguages.length === 0) {
      message.error("Por favor, selecione pelo menos um idioma");
      return;
    }
    next(selectedLanguages);
  };

  return (
    <Spin spinning={isLoading} indicator={<AiOutlineLoading spin />}>
      <div>
        <p className="text-[26px] font-bold text-center mb-0">
          Selecionar Idiomas
        </p>
        <p className="text-center mt-2 mb-6">
          Escolha os idiomas que deseja importar do ficheiro
        </p>

        {availableLanguages.length > 0 ? (
          <>
            {/* Languages Grid */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableLanguages.map((lang) => (
                  <div
                    key={lang.id}
                    className={`p-4 rounded border-2 cursor-pointer transition ${
                      selectedLanguages.includes(lang.code)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                    onClick={() => toggleLanguage(lang.code)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      {lang.flag && (
                        <img
                          src={lang.flag}
                          alt={lang.name}
                          className="w-8 h-6 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{lang.name}</p>
                        <p className="text-sm text-gray-500">
                          {lang.code.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-6">
              <p className="font-semibold text-sm">
                Idiomas Selecionados:{" "}
                <strong>{selectedLanguages.length}</strong>
              </p>
              {selectedLanguages.length > 0 && (
                <p className="text-sm mt-1">
                  {selectedLanguages
                    .map(
                      (code) =>
                        availableLanguages.find((l) => l.code === code)?.name ||
                        code,
                    )
                    .join(", ")}
                </p>
              )}
            </div>

            {/* Action Buttons - hidden if parent handles navigation */}
            {!hideButtons && (
              <div className="flex justify-center items-center mt-6 gap-2">
                <Button onClick={prev}>Anterior</Button>
                <Button type="primary" onClick={handleNext} size="large">
                  Seguinte
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">
              Nenhum idioma encontrado no ficheiro que corresponda à base de
              dados.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Certifique-se de que os nomes das colunas no Excel correspondem
              aos nomes dos idiomas configurados.
            </p>
            {!hideButtons && <Button onClick={prev}>Anterior</Button>}
          </div>
        )}
      </div>
    </Spin>
  );
}

export default SelectLanguages;
