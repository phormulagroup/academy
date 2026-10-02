import { Form } from "antd";
import React from "react";

import RichTextEditor from "./richTextEditor";

/**
 * Campo de texto rico para usar dentro de um Form.Item (recebe value/onChange do antd).
 * Mesmas props do antigo TipTapFormField: value, onChange, richMedia, placeholder (+ readOnly).
 * A borda fica a vermelho quando o Form.Item tem erro (ex.: requiredRichTextRule).
 */
export default function RichTextFormField(props) {
  const { status } = Form.Item.useStatus();
  return <RichTextEditor status={status} {...props} />;
}
