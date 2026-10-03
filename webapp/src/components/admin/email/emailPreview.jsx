import { Button, Empty, Segmented } from "antd";
import { useMemo, useState } from "react";
import { LuMonitor, LuPencilLine, LuSmartphone } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { fillSample } from "../../../utils/emailHtml";

// Pré-visualização de um e-mail (HTML já compilado) em ecrã de computador ou de telemóvel, com dados de exemplo nas variáveis.
// `onEdit`: mostra o botão "Editar conteúdo" (a edição faz-se noutra página, só com o editor).
export default function EmailPreview({ html, sample, onEdit, editLabel, height = 620 }) {
  const { t } = useTranslation();
  const [device, setDevice] = useState("desktop");
  const doc = useMemo(() => (html ? fillSample(html, sample) : ""), [html, sample]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Segmented
          value={device}
          onChange={setDevice}
          options={[
            { value: "desktop", label: <span className="inline-flex items-center gap-1.5"><LuMonitor /> {t("Computer")}</span> },
            { value: "mobile", label: <span className="inline-flex items-center gap-1.5"><LuSmartphone /> {t("Mobile")}</span> },
          ]}
        />
        {onEdit && (
          <Button type="primary" icon={<LuPencilLine />} onClick={onEdit}>
            {editLabel || t("Edit content")}
          </Button>
        )}
      </div>
      {doc ? (
        <div className="rounded-xl bg-[#F4F5F7] p-4 flex justify-center overflow-auto">
          {/* sandbox sem permissões: o HTML do e-mail não executa scripts nem navega a página */}
          <iframe title={t("Preview")} sandbox="" srcDoc={doc} style={{ width: device === "mobile" ? 375 : "100%", height }} className="border-0 rounded-lg bg-white transition-all" />
        </div>
      ) : (
        <Empty className="py-16" description={t("This e-mail has no content yet")} />
      )}
    </div>
  );
}
