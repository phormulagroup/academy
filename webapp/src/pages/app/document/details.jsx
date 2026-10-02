import axios from "axios";
import BialSpin from "../../../components/bialSpin";
import { useEffect, useState } from "react";
import { Button, Switch } from "antd";
import { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";
import { RxChevronLeft, RxChevronRight } from "react-icons/rx";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import {
  PDFViewer,
  ScrollStrategy,
  ZoomMode,
} from "@embedpdf/react-pdf-viewer";
import { Helmet } from "react-helmet";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useNavigate, useParams } from "react-router-dom";
import i18n from "../../../utils/i18n";
import { isAllowedByCountry } from "../../../utils/courseStatus";

export default function DocumentDetails({ themePreference = "light" }) {
  const { user, languages, windowDimension } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const viewerRef = useRef(null);
  // Ecrã inteiro do PDF (ecrãs pequenos/mobile), como nos sliders do eLearning
  const fullscreenRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modo "slides" do ecrã inteiro: uma página de cada vez, ajustada ao ecrã. O viewer do embedpdf só faz scroll
  // contínuo (vertical/horizontal), por isso aqui cada página é rasterizada pelo próprio motor do viewer (plugin
  // render) e mostrada num Swiper, como nos sliders de imagens do eLearning
  const registryRef = useRef(null);
  const viewerUnsubsRef = useRef([]);
  const swiperRef = useRef(null);
  const currentPageRef = useRef(1);
  const pageImagesRef = useRef({});
  const [pages, setPages] = useState([]);
  const [pageImages, setPageImages] = useState({});
  const [activePage, setActivePage] = useState(0);
  const activePageRef = useRef(0);
  function goToSlide(index) {
    activePageRef.current = index;
    setActivePage(index);
  }

  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useTranslation();

  // Sair do ecrã inteiro com Esc/gesto do browser mantém o switch sincronizado
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Fullscreen API quando existe; senão (ex.: Safari no iPhone) o viewer fica fixo a ocupar o ecrã (CSS)
  function toggleFullscreen(checked) {
    const el = fullscreenRef.current;
    if (checked) {
      goToSlide(Math.max(0, currentPageRef.current - 1));
      const request = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
      try {
        request?.call(el)?.catch?.(() => {});
      } catch {
        // Sem Fullscreen API: fica o ecrã inteiro em CSS
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  // Ao sair do ecrã inteiro (switch, Esc ou gesto do browser) o viewer volta à página vista nos slides
  const wasFullscreenRef = useRef(false);
  useEffect(() => {
    if (wasFullscreenRef.current && !isFullscreen) {
      const pageNumber = activePageRef.current + 1;
      requestAnimationFrame(() =>
        registryRef.current
          ?.getPlugin("scroll")
          ?.provides()
          ?.scrollToPage({ pageNumber, behavior: "instant" }),
      );
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  // Registo do viewer: páginas do documento (tamanhos) e página atual, para o modo slides
  function onViewerReady(registry) {
    registryRef.current = registry;
    const scroll = registry.getPlugin("scroll")?.provides();
    const loadPages = (documentId) => {
      const core = registry.getStore().getState().core;
      const doc = core.documents[documentId ?? core.activeDocumentId]?.document;
      if (doc?.pages?.length) setPages(doc.pages.map((p) => p.size));
    };
    loadPages();
    if (scroll) {
      viewerUnsubsRef.current = [
        scroll.onLayoutReady((e) => loadPages(e.documentId)),
        scroll.onPageChange((e) => (currentPageRef.current = e.pageNumber)),
      ];
    }
  }

  // Ao sair da página: largar os eventos do viewer e as imagens das páginas
  useEffect(
    () => () => {
      viewerUnsubsRef.current.forEach((unsub) => unsub?.());
      Object.values(pageImagesRef.current).forEach(
        (url) => url && URL.revokeObjectURL(url),
      );
    },
    [],
  );

  // No ecrã inteiro: a página atual e as vizinhas são rasterizadas (uma vez cada) com resolução suficiente
  // para o ecrã em qualquer orientação; o swipe mostra logo a seguinte
  useEffect(() => {
    if (!isFullscreen) return;
    const render = registryRef.current?.getPlugin("render")?.provides();
    if (!render) return;
    const screenPx =
      Math.max(window.screen.width, window.screen.height) *
      (window.devicePixelRatio || 1);
    [activePage, activePage + 1, activePage - 1].forEach((index) => {
      const size = pages[index];
      if (!size || index in pageImagesRef.current) return;
      pageImagesRef.current[index] = null;
      render
        .renderPage({
          pageIndex: index,
          options: {
            scaleFactor: Math.min(2560, Math.max(1280, screenPx)) / size.width,
            dpr: 1,
            imageType: "image/webp",
          },
        })
        .toPromise()
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          pageImagesRef.current[index] = url;
          setPageImages((prev) => ({ ...prev, [index]: url }));
        })
        .catch(() => {
          delete pageImagesRef.current[index];
        });
    });
  }, [isFullscreen, activePage, pages]);

  // No ecrã inteiro: setas do teclado mudam de página; Esc sai (também no ecrã inteiro em CSS);
  // a página por trás não faz scroll
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown")
        swiperRef.current?.slideNext();
      else if (e.key === "ArrowLeft" || e.key === "PageUp")
        swiperRef.current?.slidePrev();
      else if (e.key === "Escape" && !document.fullscreenElement)
        setIsFullscreen(false);
    };
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  // Update theme when preference changes
  useEffect(() => {
    viewerRef.current?.container?.setTheme({ preference: themePreference });
  }, [themePreference]);

  function getData() {
    axios
      .get(endpoints.document.readBySlug, {
        params: {
          slug,
          id_lang: (languages.find((l) => l.code === i18n.language)?.id ?? user?.id_lang),
        },
      })
      .then(async (res) => {
        if (res.data.length > 0) {
          let item = res.data[0];
          item.country = item.country ? JSON.parse(item.country) : null;

          // Documento com restrição de países: só utilizadores desses países (alunos e admin)
          if (!isAllowedByCountry(item.country, user)) {
            setData(null);
            setIsLoading(false);
            return;
          }
          const file = await axios.get(endpoints.document.readFile, {
            params: { file: item.file },
            responseType: "blob", // 👈 MUITO IMPORTANTE
          });

          const blobUrl = URL.createObjectURL(file.data);

          setData(res.data[0] || null);
          setPdfUrl(blobUrl);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  // Espera pelos idiomas (ao abrir/recarregar a página diretamente ainda não estão carregados)
  const hasLanguages = languages?.length > 0;
  useEffect(() => {
    if (hasLanguages) getData();
  }, [hasLanguages]);

  return (
    <div className="page-frame py-6">
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full col-span-3">
          <BialSpin />
        </div>
      ) : data ? (
        <div>
          <Helmet>
            <meta charSet="utf-8" />
            <title>{data.name} - Bial Regional Academy</title>
            <meta
              name="description"
              content={`${data.name} - Bial Regional Academy`}
            />
            <meta
              property="og:title"
              content={`${data.name} - Bial Regional Academy`}
            />
            <meta
              property="og:description"
              content={`${data.name} - Bial Regional Academy`}
            />
          </Helmet>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <p className="font-ryker text-[20px] sm:text-[24px] font-bold text-[#163986] break-words min-w-0">
              {data?.name}
            </p>
            <Button
              className="self-start sm:self-auto shrink-0 px-0!"
              size="large"
              type="text"
              icon={<AiOutlineArrowLeft />}
              onClick={() =>
                navigate(`/${i18n.language}/documents`, { replace: true })
              }>
              {t("Back to documents")}
            </Button>
          </div>
          {/* Área do PDF: largura total até 1100 px e centrada; a altura acompanha a largura (páginas 16:9 da Library
              + barra de ferramentas do viewer), com limite à altura do ecrã, para a página caber inteira (FitPage)
              sem espaço vazio nem overflow, em desktop e telemóvel */}
          <div
            ref={fullscreenRef}
            className={`doc-viewer @container w-full max-w-[1100px] mx-auto ${isFullscreen ? "is-fullscreen" : ""}`}>
            <div
              className="doc-viewer-box w-full h-[calc(70cqw+72px)] sm:h-[calc(56.25cqw+72px)] min-h-[300px] sm:min-h-[260px] max-h-[82dvh] overflow-hidden rounded-[5px] border border-[#C5CEE1] bg-[#F4F6FB] shadow-[0px_3px_6px_#00000029]"
              ref={viewerRef}>
              <PDFViewer
                key={data.id}
                config={{
                  src: pdfUrl,
                  zoom: {
                    // A página inteira cabe na área (largura e altura), centrada
                    defaultZoomLevel: ZoomMode.FitPage,
                  },
                  scroll: {
                    // Vertical: a página fica centrada na horizontal e a seguinte aparece por baixo
                    defaultStrategy: ScrollStrategy.Vertical,
                    defaultPageGap: 12,
                  },

                  // Esconder TODA a UI
                  disabledCategories: [
                    "annotation",
                    "panel-search",
                    "panel-comment",
                    "document",
                    "form",
                    "insert",
                    "redaction",
                  ],

                  theme: {
                    preference: "light",
                  },
                }}
                style={{ width: "100%", height: "100%" }}
                onReady={onViewerReady}
              />
            </div>
            {/* Ecrã inteiro: uma página de cada vez, ajustada ao ecrã (FitPage) e centrada, com swipe/setas */}
            {isFullscreen && pages.length > 0 && (
              <div className="doc-viewer-slides">
                <Swiper
                  initialSlide={activePage}
                  spaceBetween={16}
                  onSwiper={(swiper) => (swiperRef.current = swiper)}
                  onSlideChange={(swiper) => goToSlide(swiper.activeIndex)}>
                  {pages.map((size, i) => (
                    <SwiperSlide key={i}>
                      {pageImages[i] ? (
                        <img
                          src={pageImages[i]}
                          alt={`${data?.name} - ${i + 1}`}
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="doc-viewer-slide-placeholder"
                          style={{ aspectRatio: `${size.width} / ${size.height}` }}
                        />
                      )}
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
            {/* Ecrã inteiro: só em ecrãs pequenos/mobile */}
            {windowDimension.width <= 1024 && (
              <div className="doc-viewer-bar">
                {isFullscreen && pages.length > 1 && (
                  <button
                    type="button"
                    className="doc-viewer-arrow"
                    onClick={() => swiperRef.current?.slidePrev()}
                    disabled={activePage === 0}
                    aria-label={t("Previous")}>
                    <RxChevronLeft />
                  </button>
                )}
                {isFullscreen && pages.length > 0 && (
                  <span className="doc-viewer-counter">
                    {activePage + 1} / {pages.length}
                  </span>
                )}
                <label className="doc-viewer-fullscreen">
                  {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
                  <span>{t("Fullscreen")}</span>
                  <Switch
                    size="small"
                    aria-label={t("Fullscreen")}
                    checked={isFullscreen}
                    onChange={toggleFullscreen}
                  />
                </label>
                {isFullscreen && pages.length > 1 && (
                  <button
                    type="button"
                    className="doc-viewer-arrow"
                    onClick={() => swiperRef.current?.slideNext()}
                    disabled={activePage === pages.length - 1}
                    aria-label={t("Next")}>
                    <RxChevronRight />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Helmet>
            <meta charSet="utf-8" />
            <title>{t("Document not found")} - Bial Regional Academy</title>
            <meta
              name="description"
              content={`${t("Document not found")} - Bial Regional Academy`}
            />
            <meta
              property="og:title"
              content={`${t("Document not found")} - Bial Regional Academy`}
            />
            <meta
              property="og:description"
              content={`${t("Document not found")} - Bial Regional Academy`}
            />
          </Helmet>
          <p>{t("Document not found")}</p>
        </div>
      )}
    </div>
  );
}
