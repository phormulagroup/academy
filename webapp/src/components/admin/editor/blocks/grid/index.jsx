import React from "react";
import styles from "../styles.module.css";
import { Section } from "../../components/section";
import { withLayout } from "../../components/layout";

import utils from "../../utils";

const getClassName = utils.getClassNameFactory("Grid", styles);

const CustomSlot = (props) => {
  return <span {...props} />;
};

const GridInternal = {
  fields: {
    numColumns: {
      type: "number",
      label: "Number of columns",
      min: 1,
      max: 12,
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
    },
    items: {
      type: "slot",
    },
  },
  defaultProps: {
    numColumns: 4,
    gap: 24,
    items: [],
  },
  render: ({ gap, numColumns, items: Items }) => {
    return (
      <Section>
        <Items
          as={CustomSlot}
          disallow={["Hero", "Stats"]}
          className={getClassName()}
          style={{
            gap,
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          }}
        />
      </Section>
    );
  },
};

const Grid = withLayout(GridInternal);

export default Grid;
