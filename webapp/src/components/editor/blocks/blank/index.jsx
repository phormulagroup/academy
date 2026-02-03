import React from "react";
import styles from "./styles.module.css";
import utils from "../../utils";

const getClassName = utils.getClassNameFactory("Blank", styles);

const Blank = {
  fields: {},
  defaultProps: {},
  render: () => {
    return <div className={getClassName()}></div>;
  },
};

export default Blank;
