import { CSSProperties, forwardRef, ReactNode } from "react";
import styles from "./styles.module.css";
import utils from "../utils";

const getClassName = utils.getClassNameFactory("Section", styles);

export const Section = forwardRef(({ children, className, maxWidth = "1280px", style = {} }, ref) => {
  return (
    <div
      className={`${getClassName()}${className ? ` ${className}` : ""}`}
      style={{
        ...style,
      }}
      ref={ref}
    >
      <div className={getClassName("inner")} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
});
