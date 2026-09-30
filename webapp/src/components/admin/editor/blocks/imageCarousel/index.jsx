import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Switch } from "antd";
import { useTranslation } from "react-i18next";
import { RxChevronLeft, RxChevronRight } from "react-icons/rx";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

import { Section } from "../../components/section";
import ImagePickerField from "../image/ImagePickerField";

// Import Swiper styles
import "swiper/css";

import "./styles.css";

import config from "../../../../../utils/config";

const ImageCarousel = {
  fields: {
    images: {
      type: "array",
      getItemSummary: (item, i) => item.alt || `Feature #${i}`,
      defaultItemProps: {
        alt: "",
        image: "",
      },
      arrayFields: {
        alt: { type: "text" },
        image: {
          type: "custom",
          label: "Imagem",
          render: (props) => <ImagePickerField {...props} />,
        },
      },
    },
    maxWidth: { type: "number" },
    justifyContent: {
      label: "Justify Content",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
    alignItems: {
      label: "Align Items",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
  },
  defaultProps: {
    images: [],
    maxWidth: 700,
    justifyContent: "center",
    alignItems: "center",
  },
  render: (props) => <Carousel {...props} />,
};

function Carousel({ images, alignItems, justifyContent, maxWidth }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = (images || []).filter((item) => item.image?.url);

  // Mantém o switch sincronizado quando se sai do ecrã inteiro com Esc
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen(checked) {
    if (checked) containerRef.current?.requestFullscreen?.();
    else if (document.fullscreenElement) document.exitFullscreen?.();
  }

  if (slides.length === 0) return null;

  return (
    <Section
      maxWidth={maxWidth}
      justifyContent={justifyContent}
      alignItems={alignItems}>
      <div
        ref={containerRef}
        className={`bial-carousel ${isFullscreen ? "is-fullscreen" : ""}`}>
        <div className="bial-carousel-stage">
          <Swiper
            spaceBetween={10}
            onSwiper={(swiper) => (swiperRef.current = swiper)}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}>
            {slides.map((item, i) => (
              <SwiperSlide key={i}>
                <img
                  alt={item.alt}
                  src={`${config.server_ip}/media/${item.image.url}`}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* */}
        <div className="bial-carousel-footer">
          <div className="bial-carousel-dots">
            {slides.length > 1 &&
              slides.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  className={`bial-carousel-dot ${i === activeIndex ? "active" : ""}`}
                  onClick={() => swiperRef.current?.slideTo(i)}
                  aria-label={`${i + 1} / ${slides.length}`}
                />
              ))}
            <span className="bial-carousel-counter">
              {activeIndex + 1} / {slides.length}
            </span>
          </div>
          <div className="bial-carousel-nav">
            {slides.length > 1 ? (
              <button
                type="button"
                className="bial-carousel-arrow"
                onClick={() => swiperRef.current?.slidePrev()}
                disabled={activeIndex === 0}
                aria-label={t("Previous")}>
                <RxChevronLeft />
              </button>
            ) : (
              <span />
            )}
            <label className="bial-carousel-fullscreen">
              {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
              <span>{t("Fullscreen")}</span>
              <Switch
                size="small"
                aria-label={t("Fullscreen")}
                checked={isFullscreen}
                onChange={toggleFullscreen}
              />
            </label>
            {slides.length > 1 ? (
              <button
                type="button"
                className="bial-carousel-arrow"
                onClick={() => swiperRef.current?.slideNext()}
                disabled={activeIndex === slides.length - 1}
                aria-label={t("Next")}>
                <RxChevronRight />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

export default ImageCarousel;
