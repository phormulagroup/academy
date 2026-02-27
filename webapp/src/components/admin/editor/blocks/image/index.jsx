import styles from "../styles.module.css";
import utils from "../../utils";
import ImagePickerField from "./ImagePickerField";
import axios from "axios";
import config from "../../../../../utils/config";
import { AiOutlineColumnHeight, AiOutlineColumnWidth } from "react-icons/ai";

const getClassName = utils.getClassNameFactory("Logos", styles);

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
  render: ({ image, caption, size }) => {
    if (!image?.url) return null;
    return (
      <figure>
        <img src={`${config.server_ip}/media/${image.url}`} alt={image.alt ?? ""} style={{ width: size?.width ?? "auto", height: size?.height ?? "auto" }} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  },
};

export default Image;
