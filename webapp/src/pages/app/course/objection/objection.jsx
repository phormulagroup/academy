import { useContext, useEffect, useState } from "react";
import { Collapse, Image, Tabs } from "antd";
import "./objection.css";
import { Context } from "../../../../utils/context";
import config from "../../../../utils/config";

// Imagens no HTML das objecções são guardadas como src="/media/<ficheiro>" e resolvidas para o servidor atual
const withMediaUrl = (html) =>
  html
    ? html.replaceAll('src="/media/', `src="${config.server_ip}/media/`)
    : html;

export default function CourseObjection({ data }) {
  const { t, windowDimension } = useContext(Context);
  const [activeKey, setActiveKey] = useState("0");
  const [preview, setPreview] = useState({
    open: false,
    items: [],
    current: 0,
  });

  // Clique numa imagem do HTML abre a pré-visualização com zoom (as restantes imagens do mesmo texto ficam navegáveis)
  function openImagePreview(e) {
    if (e.target.tagName !== "IMG") return;
    const images = [...e.currentTarget.querySelectorAll("img")];
    setPreview({
      open: true,
      items: images.map((img) => img.src),
      current: images.indexOf(e.target),
    });
  }

  useEffect(() => {
    console.log(data);
  }, [data]);

  return (
    <div className="mb-10">
      <Image.PreviewGroup
        items={preview.items}
        preview={{
          open: preview.open,
          current: preview.current,
          onOpenChange: (open) => setPreview((p) => ({ ...p, open })),
          onChange: (current) => setPreview((p) => ({ ...p, current })),
        }}
      />
      {data.objection &&
      Object.keys(data.objection).length > 0 &&
      data.objection.tabs &&
      data.objection.tabs.length > 0 ? (
        <div className="flex flex-col">
          {data.objection.text && (
            <div key="objection-text" className="prose-content">
              <div
                onClick={openImagePreview}
                dangerouslySetInnerHTML={{
                  __html: withMediaUrl(data.objection.text),
                }}
              />
            </div>
          )}
          <div className="w-full mt-4">
            <Tabs
              className="objection-tabs"
              type="card"
              size="large"
              activeKey={activeKey}
              onChange={(key) => setActiveKey(key)}
              items={data.objection.tabs
                .filter((tabItem) => tabItem.items && tabItem.items.length > 0)
                .map((tabItem, _tind) => ({
                  key: String(_tind),
                  label: (
                    <p
                      className="font-bold text-[14px] sm:text-sm md:text-base"
                      style={{
                        fontSize:
                          windowDimension.width >= 1225
                            ? "16px"
                            : windowDimension.width >= 425 &&
                                windowDimension.width < 1225
                              ? "14px"
                              : "",
                      }}>
                      {t(tabItem.label)}
                    </p>
                  ),
                  // Só uma objeção aberta de cada vez (abrir outra fecha a anterior), como nos FAQs
                  children: (
                    <Collapse
                      accordion
                      className="collapse-accordion collapse-objection"
                      size="large"
                      bordered={false}
                      items={tabItem.items.map((_i, _ind) => ({
                        key: `${tabItem.label}-${_ind}`,
                        label: (
                          <p className="font-ryker font-semibold leading-snug text-[14px] sm:text-[15px] md:text-[15px] lg:text-[15px]">
                            {_i.title}
                          </p>
                        ),
                        // Resposta sempre mais pequena que a pergunta (ver .objection-answer em objection.css)
                        children: (
                          <div
                            className="prose-content objection-answer text-[13px] leading-[1.6] sm:text-[13px] md:text-[14px]"
                            onClick={openImagePreview}
                            dangerouslySetInnerHTML={{
                              __html: withMediaUrl(_i.text),
                            }}
                          />
                        ),
                      }))}
                    />
                  ),
                }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
