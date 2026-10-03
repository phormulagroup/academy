import { Button, Tooltip } from "antd";
import { LuImagePlus, LuReplace, LuTrash2, LuUpload } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import config from "./config";
import FieldLabel from "./fieldLabel";
import { CHECKER, FileBadge, fileKind } from "./fileKind";

// Campo da Multimédia (imagem ou ficheiro) dos formulários do backoffice: label com erro e um cartão que abre a Multimédia.
// Com valor, o cartão mostra a imagem (ou o tipo e o nome do ficheiro) e, ao passar o rato, os botões de trocar e remover, dentro do
// próprio cartão. type="image" mostra a pré-visualização; type="file" mostra o ficheiro.
// onRemove limpa o valor ou remove o item inteiro de uma lista; alwaysRemovable mostra o botão mesmo sem valor.
export default function MediaField({ label, error, value, type = "image", placeholder, onOpen, onRemove, alwaysRemovable = false }) {
  const { t } = useTranslation();
  const hasValue = !!value;
  const isImage = type === "image" && hasValue;
  const { color, ext } = fileKind(value);
  const removable = !!onRemove && (hasValue || alwaysRemovable);

  const border = error ? "border-red-500" : hasValue ? "border-[#E5E7EB] hover:border-[#163986]/60" : "border-[#D0D4DC] hover:border-[#163986]";

  return (
    <>
      {label !== undefined && (
        <p className="pb-2">
          <FieldLabel label={label} error={error} />
        </p>
      )}
      <div className="mb-6">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen?.();
            }
          }}
          className={`group relative h-37.5 w-full overflow-hidden rounded-xl cursor-pointer transition-colors ${hasValue ? "border border-solid bg-white" : "border-2 border-dashed bg-[#FAFAFB]"} ${border}`}>
          {/* Sem valor: convite a escolher */}
          {!hasValue && (
            <div className="h-full flex flex-col items-center justify-center gap-1.5 px-4 text-center text-[#8A8D98] group-hover:text-[#163986] transition-colors">
              {type === "image" ? <LuImagePlus className="text-[28px]" /> : <LuUpload className="text-[26px]" />}
              <p className="text-[12px] mb-0! leading-snug">{placeholder || (type === "image" ? t("Choose an image") : t("Choose a file"))}</p>
            </div>
          )}

          {/* Imagem: pré-visualização inteira, sobre o fundo xadrez, e o nome do ficheiro por baixo */}
          {isImage && (
            <>
              <div className="h-full w-full flex items-center justify-center p-2" style={CHECKER}>
                <img src={`${config.server_ip}/media/${encodeURIComponent(value)}`} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-white/90 px-3 py-1.5 text-[11px] text-[#3b4258] truncate border-0 border-t border-solid border-[#F0F0F0]">{value}</div>
            </>
          )}

          {/* Ficheiro: ícone do tipo, nome e extensão */}
          {hasValue && !isImage && (
            <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
              <FileBadge name={value} />
              <p className="text-[12px] mb-0! leading-snug break-all line-clamp-2 max-w-full text-[#3b4258]" title={value}>
                {value}
              </p>
              {ext && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${color}14`, color }}>
                  {ext}
                </span>
              )}
            </div>
          )}

          {/* Ações dentro do cartão: aparecem ao passar o rato (ou ao focar com o teclado; em ecrãs táteis ficam sempre à vista) */}
          {(hasValue || removable) && (
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
              {hasValue && (
                <Tooltip title={t("Change")}>
                  <Button
                    size="small"
                    shape="circle"
                    icon={<LuReplace />}
                    aria-label={t("Change")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen?.();
                    }}
                    className="shadow!"
                  />
                </Tooltip>
              )}
              {removable && (
                <Tooltip title={t("Remove")}>
                  <Button
                    size="small"
                    shape="circle"
                    danger
                    icon={<LuTrash2 />}
                    aria-label={t("Remove")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="shadow!"
                  />
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
