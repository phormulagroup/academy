import { useState } from "react";
import { FieldLabel } from "@puckeditor/core";
import Media from "../../../media/media";
import { Button } from "antd";
import config from "../../../../../utils/config";

function ImagePickerField({ field, name, value, onChange }) {
  const [isOpen, setOpen] = useState(false);

  function openLibrary() {
    setOpen(true);
  }

  function handleSelect(res) {
    console.log(res);
    if (res) {
      onChange({
        url: res.img,
      });
    }
    setOpen(false);
  }

  return (
    <FieldLabel label={field.label ?? "Imagem"}>
      <div style={{ display: "grid", gap: 8 }}>
        {/* Preview */}
        <div
          style={{
            position: "relative",
            border: "1px dashed #ddd",
            borderRadius: 8,
            padding: 8,
            minHeight: 120,
            display: "grid",
            placeItems: "center",
            background: "#fafafa",
          }}
          onClick={openLibrary}
        >
          {value?.url ? (
            <img src={`${config.server_ip}/media/${value.url}`} alt={value.alt ?? ""} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 4 }} />
          ) : (
            <p className="text-[#999] text-[11px]">Nenhuma imagem selecionada</p>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          {value ? (
            <Button type="button" onClick={() => onChange(null)} style={{ background: "#f5f5f5" }}>
              Limpar
            </Button>
          ) : null}
        </div>

        {/* O teu modal (ex.: controla open/close e chama handleSelect) */}
        {isOpen && <Media mediaKey={"img"} open={isOpen} close={handleSelect} />}
      </div>
    </FieldLabel>
  );
}

export default ImagePickerField;
