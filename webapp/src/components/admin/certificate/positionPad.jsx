import { useRef } from "react";
import { InputNumber } from "antd";
import { useTranslation } from "react-i18next";

import config from "../../../utils/config";

// Posição do bloco de texto do certificado: percentagem da página (0–100) onde fica o CENTRO do bloco, x da esquerda
// para a direita e y de cima para baixo (ver normalizePosition em server/utils/certificatePdf.js, que aplica o mesmo
// limite de margens). A miniatura mostra a imagem de fundo e onde o texto cai; arrasta-se ou clica-se para o mover,
// e os números afinam.

// A4 horizontal (842×595 pt) e o bloco: 50% da largura, altura aproximada, só para o retângulo da miniatura
// (o PDF real calcula a altura exata)
const PAGE_RATIO = 842 / 595;
const BLOCK_WIDTH_PCT = 50;
const BLOCK_HEIGHT_PCT = 24;
const EDGE_X_PCT = (20 / 842) * 100;
const EDGE_Y_PCT = (20 / 595) * 100;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function PositionPad({ x, y, background, onChange, disabled = false }) {
  const { t } = useTranslation();
  const padRef = useRef(null);
  const dragging = useRef(false);

  function moveTo(event) {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    onChange({
      x: Math.round(clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)),
      y: Math.round(clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)),
    });
  }

  // Mesmo limite do PDF: o bloco nunca sai da página
  const left = clamp(x - BLOCK_WIDTH_PCT / 2, EDGE_X_PCT, 100 - EDGE_X_PCT - BLOCK_WIDTH_PCT);
  const top = clamp(y - BLOCK_HEIGHT_PCT / 2, EDGE_Y_PCT, 100 - EDGE_Y_PCT - BLOCK_HEIGHT_PCT);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={padRef}
        className={`relative w-full overflow-hidden rounded-[10px] border border-solid border-[#D9D9D9] bg-[#163986] touch-none ${disabled ? "opacity-50" : "cursor-crosshair"}`}
        style={{
          aspectRatio: PAGE_RATIO,
          backgroundImage: background ? `url(${config.server_ip}/media/${encodeURIComponent(background)})` : undefined,
          backgroundSize: "100% 100%",
        }}
        onPointerDown={(event) => {
          if (disabled) return;
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveTo(event);
        }}
        onPointerMove={(event) => dragging.current && moveTo(event)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}>
        <div
          className="absolute rounded-[4px] border-2 border-dashed border-white bg-black/35 pointer-events-none"
          style={{ left: `${left}%`, top: `${top}%`, width: `${BLOCK_WIDTH_PCT}%`, height: `${BLOCK_HEIGHT_PCT}%` }}>
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00b9d6] ring-2 ring-white" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Horizontal (X)")}</p>
          <InputNumber className="w-full!" min={0} max={100} precision={0} suffix="%" value={x} disabled={disabled} onChange={(value) => onChange({ x: value ?? x, y })} />
        </div>
        <div>
          <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Vertical (Y)")}</p>
          <InputNumber className="w-full!" min={0} max={100} precision={0} suffix="%" value={y} disabled={disabled} onChange={(value) => onChange({ x, y: value ?? y })} />
        </div>
      </div>
    </div>
  );
}
