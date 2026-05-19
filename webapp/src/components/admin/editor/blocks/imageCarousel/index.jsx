import { Swiper, SwiperSlide } from "swiper/react";

import styles from "../styles.module.css";
import { Section } from "../../components/section";
import utils from "../../utils";
import ImagePickerField from "../image/ImagePickerField";

// Import Swiper styles
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";

import "./styles.css";

// import required modules
import { FreeMode, Navigation, Thumbs } from "swiper/modules";
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
        image: { type: "custom", label: "Imagem", render: (props) => <ImagePickerField {...props} /> },
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
    maxWidth: { type: "text" },
  },
  defaultProps: {
    images: [],
    maxWidth: 700,
    justifyContent: "center",
    alignItems: "center",
  },
  render: ({ images, alignItems, justifyContent, maxWidth }) => {
    return (
      <Section maxWidth={maxWidth} justifyContent={justifyContent} alignItems={alignItems}>
        <Swiper spaceBetween={10} navigation={true} modules={[FreeMode, Navigation]} className="mySwiper2">
          {images.map((item, i) => (
            <SwiperSlide>
              <img alt={item.alt} src={`${config.server_ip}/media/${item.image.url}`}></img>
            </SwiperSlide>
          ))}
        </Swiper>
      </Section>
    );
  },
};

export default ImageCarousel;
