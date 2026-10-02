import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Empty, Spin } from "antd";
import { AiOutlineFileText } from "react-icons/ai";
import { LuExternalLink } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

// Mostra o PDF REAL, gerado no servidor (server/routes/certificate.js /preview, o mesmo código do download), em vez de
// tentar aproximar o layout no browser: assim a pré-visualização é sempre igual ao que o aluno descarrega.
//
// `data`: { background, text, text_align, text_x, text_y, sample: { name, course } }; o `sample` é opcional (nome e
// curso de exemplo, para testar textos compridos).
export default function CertificatePreview({ data }) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const urlRef = useRef(null);

  const sample = data?.sample;

  useEffect(() => {
    if (!data?.background) return;

    let cancelled = false;
    setIsLoading(true);
    axios
      .post(
        endpoints.course_certificate.preview,
        { data: { background: data.background, text: data.text, text_align: data.text_align, text_x: data.text_x, text_y: data.text_y, sample } },
        { responseType: "blob" },
      )
      .then((res) => {
        if (cancelled) return;
        setPdfUrl(URL.createObjectURL(res.data));
      })
      .catch(async (err) => {
        if (cancelled) return;
        console.log(err);
        // Com responseType "blob" a mensagem de erro do servidor também chega como blob
        let reason = null;
        try {
          reason = JSON.parse(await err.response.data.text())?.message;
        } catch {
          // sem corpo legível: usa a mensagem genérica
        }
        toastApi.open({ type: "error", content: reason || t("The preview could not be generated") });
        setPdfUrl(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data?.background, data?.text, data?.text_align, data?.text_x, data?.text_y, sample?.name, sample?.course]);

  // Revoga sempre o blob URL anterior antes de o substituir (ou ao desmontar): sem isto, cada pré-visualização
  // acumulava mais 1 objeto na memória do browser
  useEffect(() => {
    if (urlRef.current && urlRef.current !== pdfUrl) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = pdfUrl;
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Sem imagem de fundo não há nada a gerar: o PDF anterior (se houver) deixa de valer
  const currentPdfUrl = data?.background ? pdfUrl : null;

  // Sem PDF e sem nada a gerar: estado vazio
  if (!currentPdfUrl && !isLoading) {
    return (
      <div className="min-h-80 flex items-center justify-center">
        <Empty
          image={<AiOutlineFileText className="text-[56px] text-[#BFBFBF] mx-auto" />}
          styles={{ image: { height: 56 } }}
          description={t("Choose a background image to preview the certificate")}
        />
      </div>
    );
  }

  return (
    <div>
      {/* A4 horizontal (842×595 pt): a caixa já tem a proporção certa antes de o PDF chegar, e o PDF anterior fica
          visível (sob um véu) enquanto o novo é gerado, em vez de desaparecer num ecrã em branco a cada edição */}
      <div className="relative w-full bg-[#F6F7F9]" style={{ aspectRatio: "842 / 595" }}>
        {currentPdfUrl && <iframe title={t("Certificate preview")} src={`${currentPdfUrl}#toolbar=0&navpanes=0`} className="absolute inset-0 h-full w-full border-0" />}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Spin size="large" />
          </div>
        )}
      </div>
      {currentPdfUrl && (
        <div className="flex justify-end border-0 border-t border-solid border-[#E5E7EB] bg-white px-3 py-2">
          <a href={currentPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px]">
            <LuExternalLink /> {t("Open PDF in a new tab")}
          </a>
        </div>
      )}
    </div>
  );
}
