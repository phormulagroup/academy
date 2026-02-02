import { useMemo } from "react";
import { FieldLabel } from "@puckeditor/core";
import { Input, InputNumber } from "antd";

/**
 * PaddingField
 * - value: { pt?: number, pr?: number, pb?: number, pl?: number }
 * - onChange: (value) => void
 */
export default function PaddingField({ field, value, onChange }) {
  const v = value || { pt: 0, pr: 0, pb: 0, pl: 0 };

  // Helper para escrever menos código
  const makeHandler = (key) => (e) => {
    const next = Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10);

    onChange({ ...v, [key]: next });
  };

  // Exibe um preview tipo shorthand (pt pr pb pl)
  const shorthand = useMemo(() => `${v.pt || 0}px ${v.pr || 0}px ${v.pb || 0}px ${v.pl || 0}px`, [v]);

  return (
    <FieldLabel label={field.label || "Padding"}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Top</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.pt ?? 0} onChange={makeHandler("pt")} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Right</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.pr ?? 0} onChange={makeHandler("pr")} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Bottom</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.pb ?? 0} onChange={makeHandler("pb")} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600 block">Left</label>
          <InputNumber size="large" min={0} className="w-full!" value={v.pl ?? 0} onChange={makeHandler("pl")} />
        </div>
      </div>

      {/* Preview do shorthand */}
      <p className="text-xs text-gray-500 mt-2">Shorthand: {shorthand}</p>
    </FieldLabel>
  );
}
