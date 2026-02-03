import React from "react";
import { Button as _Button } from "@puckeditor/core";

const Button = {
  label: "Button",
  fields: {
    label: {
      type: "text",
      placeholder: "Lorem ipsum...",
      contentEditable: true,
    },
    href: { type: "text" },
    variant: {
      type: "radio",
      options: [
        { label: "primary", value: "primary" },
        { label: "secondary", value: "secondary" },
      ],
    },
  },
  defaultProps: {
    label: "Button",
    href: "#",
    variant: "primary",
  },
  render: ({ href, variant, label, puck }) => {
    return (
      <div>
        <_Button href={puck.isEditing ? "#" : href} variant={variant} size="large" tabIndex={puck.isEditing ? -1 : undefined}>
          {label}
        </_Button>
      </div>
    );
  },
};

export default Button;
