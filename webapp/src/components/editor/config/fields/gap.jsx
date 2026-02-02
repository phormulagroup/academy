import { useMemo } from "react";
import { FieldLabel } from "@puckeditor/core";
import { InputNumber } from "antd";

/**
 * PaddingField
 * - value: { pt?: number, pr?: number, pb?: number, pl?: number }
 * - onChange: (value) => void
 */
export default function GapField({ field, value, onChange }) {
  const v = value || null;

  // Helper para escrever menos código
  const makeHandler = (e) => {
    console.log(e);
    const next = Number.isNaN(parseInt(e, 10)) ? 0 : parseInt(e, 10);

    onChange(next);
  };

  return (
    <FieldLabel label={field.label || "Gap"}>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <InputNumber size="large" min={0} className="w-full!" value={v} onChange={makeHandler} />
        </div>
      </div>
    </FieldLabel>
  );
}
