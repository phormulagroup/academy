import { useMemo } from "react";
import { FieldLabel } from "@puckeditor/core";
import { InputNumber } from "antd";

/**
 * PaddingField
 * - value: { pt?: number, pr?: number, pb?: number, pl?: number }
 * - onChange: (value) => void
 */
export default function WidthField({ field, value, onChange }) {
  const v = value || { minW: null, maxW: null, width: null };

  // Helper para escrever menos código
  const makeHandler = (key) => (e) => {
    console.log(e);
    console.log(key);
    const next = Number.isNaN(parseInt(e, 10)) ? 0 : parseInt(e, 10);

    onChange({ ...v, [key]: next });
  };

  return (
    <FieldLabel label={field.label || "Width"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">
            Min <small>(px)</small>
          </label>
          <InputNumber size="large" min={0} className="w-full!" value={v.minW} onChange={makeHandler("minW")} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">
            Max <small>(px)</small>
          </label>
          <InputNumber size="large" min={0} className="w-full!" value={v.maxW} onChange={makeHandler("maxW")} />
        </div>
      </div>
    </FieldLabel>
  );
}
