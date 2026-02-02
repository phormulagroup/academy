import { DropZone } from "@puckeditor/core";
import React, { useState } from "react";
import PaddingField from "../fields/padding";
import WidthField from "../fields/width";
import GapField from "../fields/gap";
import GridField from "../fields/gridField";
import styles from "../styles/styles.module.css";

const Grid = {
  fields: {
    items: {
      type: "array",
      arrayFields: {
        span: {
          label: "Span",
          type: "number",
          min: 0,
        },
      },
      getItemSummary: (_, id) => `Column ${id + 1}`,
    },
    cols: {
      type: "custom",
      label: "Cols",
      render: GridField,
      defaultValue: { colsMobile: null, colsTablet: null, colsDesktop: null },
    },
    gap: {
      type: "custom",
      label: "Gap",
      render: GapField,
      defaultValue: 20,
    },
    width: {
      type: "custom",
      label: "Width",
      render: WidthField,
      defaultValue: { minW: null, maxW: null, w: null },
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingField,
      defaultValue: { pt: 40, pr: 40, pb: 40, pl: 40 },
    },
  },
  defaultProps: {
    items: [{}],
    cols: { colsMobile: 1, colsTablet: 1, colsDesktop: 2 },
    minItemWidth: 356,
    padding: { pt: 20, pb: 20, pl: 20, pr: 20 },
    width: { minW: null, maxW: null, width: null },
    gap: 20,
  },
  render: (props) => {
    const colMap = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" };
    const mobile = colMap[props.cols.colsMobile] ?? "grid-cols-1";
    const tablet = colMap[props.cols.colsTablet] ?? "grid-cols-2";
    const desktop = colMap[props.cols.colsDesktop] ?? "grid-cols-3";

    return (
      <div
        className={`grid ${mobile} sm:${tablet} lg:${desktop}`}
        style={{
          paddingTop: props.padding.pt,
          paddingRight: props.padding.pr,
          paddingBottom: props.padding.pb,
          paddingLeft: props.padding.pl,
          maxWidth: props.width.maxW ?? "unset",
          minWidth: props.width.minW ?? "unset",
          gap: props.gap,
        }}
      >
        {props.items.map((item, idx) => (
          <div key={idx} className={`${item.span && `col-span-${item.span}`}`}>
            <DropZone zone={`column-${idx}`} />
          </div>
        ))}
      </div>
    );
  },
};

export default Grid;
