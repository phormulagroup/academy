import ImagePickerField from "./ImagePickerField";
import config from "../../../../../utils/config";
import { AiOutlineColumnHeight, AiOutlineColumnWidth } from "react-icons/ai";

const Image = {
  // ...
  fields: {
    image: { type: "custom", label: "Imagem", render: (props) => <ImagePickerField {...props} /> },
    alt: { type: "text", label: "Alt" },
    size: {
      type: "object",
      objectFields: {
        width: {
          type: "text",
          label: "Width",
          labelIcon: <AiOutlineColumnWidth />,
        },
        height: {
          type: "text",
          label: "Height",
          labelIcon: <AiOutlineColumnHeight />,
        },
      },
    },
  },
  defaultProps: {
    size: {
      width: "100%",
      height: "auto",
    },
  },
  render: ({ image, caption, size }) => {
    if (!image?.url) return null;

    // Add units if only numbers are provided
    const getSize = (value) => {
      if (!value) return "auto";
      if (typeof value === "string" && /^\d+$/.test(value)) {
        return `${value}px`;
      }
      return value;
    };

    const imgStyle = {
      width: getSize(size?.width ?? "100%"),
      height: getSize(size?.height ?? "auto"),
      display: "block",
      objectFit: "contain",
    };

    return (
      <figure style={{ margin: 0, width: "100%" }}>
        <img src={`${config.server_ip}/media/${image.url}`} alt={image.alt ?? ""} style={imgStyle} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  },
};

export default Image;
