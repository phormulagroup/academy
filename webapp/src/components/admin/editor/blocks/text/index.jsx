import React from "react";
import { ALargeSmall, AlignLeft } from "lucide-react";

import { Section } from "../../components/section";
import { withLayout } from "../../components/layout";

const TextInner = {
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      labelIcon: <ALargeSmall size={16} />,
      options: [
        { label: "S", value: "s" },
        { label: "M", value: "m" },
      ],
    },
    align: {
      type: "radio",
      labelIcon: <AlignLeft size={16} />,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    color: {
      type: "radio",
      options: [
        { label: "Default", value: "default" },
        { label: "Muted", value: "muted" },
      ],
    },
    maxWidth: { type: "text" },
  },
  defaultProps: {
    align: "left",
    text: "Text",
    size: "m",
    color: "default",
  },
  render: ({ align, color, text, size, maxWidth }) => {
    return (
      <Section maxWidth={maxWidth}>
        <span
          style={{
            color: color === "default" ? "inherit" : "var(--puck-color-grey-05)",
            display: "flex",
            textAlign: align,
            width: "100%",
            fontSize: size === "m" ? "20px" : "16px",
            fontWeight: 300,
            maxWidth,
            justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
          }}
        >
          {text}
        </span>
      </Section>
    );
  },
};

const Text = withLayout(TextInner);

export default Text;
