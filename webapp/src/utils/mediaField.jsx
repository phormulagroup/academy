import { Button } from "antd";
import { RxTrash } from "react-icons/rx";
import { AiOutlineFile, AiOutlineFileImage } from "react-icons/ai";
import config from "./config";
import FieldLabel from "./fieldLabel";

// Campo da Multimédia (imagem ou ficheiro) dos formulários do backoffice: label com erro, caixa que abre a
// Multimédia e botão de remover. type="image" mostra a pré-visualização; type="file" mostra o nome do ficheiro.
// onRemove limpa o valor ou remove o item inteiro de uma lista; alwaysRemovable mostra o botão mesmo sem valor.
export default function MediaField({
  label,
  error,
  value,
  type = "image",
  placeholder,
  onOpen,
  onRemove,
  alwaysRemovable = false,
}) {
  const Icon = type === "image" ? AiOutlineFileImage : AiOutlineFile;
  const showPreview = type === "image" && value;

  return (
    <>
      {label !== undefined && (
        <p className="pb-2">
          <FieldLabel label={label} error={error} />
        </p>
      )}
      <div className="relative">
        <div
          className={`border border-dashed ${error ? "border-red-500" : "border-gray-300"} mb-6 cursor-pointer flex justify-center items-center h-37.5 w-full overflow-hidden`}
          onClick={onOpen}
          style={
            showPreview
              ? {
                  backgroundImage: `url(${config.server_ip}/media/${value})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }
              : undefined
          }>
          {!showPreview && (
            <div className="flex justify-center items-center flex-col p-10">
              <Icon className="text-[30px]" />
              <p className="text-[11px] text-center mt-2">
                {(type === "file" && value) || placeholder}
              </p>
            </div>
          )}
        </div>
        {onRemove && (value || alwaysRemovable) && (
          <div className="absolute -top-1.25 right-0 w-5 h-5 z-999">
            <Button onClick={onRemove} icon={<RxTrash />} />
          </div>
        )}
      </div>
    </>
  );
}
