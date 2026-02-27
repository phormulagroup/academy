import { spacingOptions } from "../../options";

import styles from "../styles.module.css";
import utils from "../../utils";

const getClassName = utils.getClassNameFactory("Space", styles);

export const Space = {
  label: "Space",
  fields: {
    size: {
      type: "select",
      options: spacingOptions,
    },
    direction: {
      type: "radio",
      options: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
        { value: "", label: "Both" },
      ],
    },
  },
  defaultProps: {
    direction: "",
    size: "24px",
  },
  inline: true,
  render: ({ direction, size, puck }) => {
    return <div ref={puck.dragRef} className={getClassName(direction ? { [direction]: direction } : {})} style={{ "--size": size }} />;
  },
};
