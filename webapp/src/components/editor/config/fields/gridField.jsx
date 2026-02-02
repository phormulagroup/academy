import { useMemo } from "react";
import { FieldLabel } from "@puckeditor/core";
import { InputNumber } from "antd";

/**
 * PaddingField
 * - value: { pt?: number, pr?: number, pb?: number, pl?: number }
 * - onChange: (value) => void
 */
export default function GridField({ field, value, onChange }) {
  const v = value || { colsMobile: null, colsTablet: null, colsDesktop: null };

  // Helper para escrever menos código
  const makeHandler = (key) => (e) => {
    console.log(e);
    console.log(key);
    const next = Number.isNaN(parseInt(e, 10)) ? 0 : parseInt(e, 10);

    onChange({ ...v, [key]: next });
  };

  return (
    <FieldLabel label={field.label || "Cols"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs text-gray-600 block">Desktop</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.colsDesktop} onChange={makeHandler("colsDesktop")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Mobile</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.colsMobile} onChange={makeHandler("colsMobile")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Tablet</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.colsTablet} onChange={makeHandler("colsTablet")} />
        </div>
      </div>
    </FieldLabel>
  );
}
