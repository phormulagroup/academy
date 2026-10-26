import { Input, InputNumber, Select, Radio } from "antd";
import { FieldLabel } from "@puckeditor/core";

function TextFieldOverride({ field, name, value, onChange, readOnly }) {
  return (
    <FieldLabel label={field.label || name} readOnly={readOnly} icon={field.labelIcon}>
      <Input value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} disabled={readOnly} />
    </FieldLabel>
  );
}

// Nota: este field type é partilhado por Root.description (renderizado como
// <meta name="description">/og:description em texto simples — ver topic.jsx),
// Heading.text e Card.description (ambos renderizados como {texto} direto,
// sem dangerouslySetInnerHTML). Passar a Quill aqui produziria HTML visível
// nas meta tags e nos títulos/cards — decidido não converter.
function TextareaFieldOverride({ field, name, value, onChange, readOnly }) {
  return (
    <FieldLabel label={field.label || name} readOnly={readOnly} icon={field.labelIcon}>
      <Input.TextArea size="large" value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} disabled={readOnly} autoSize={{ minRows: 2 }} />
    </FieldLabel>
  );
}

function NumberFieldOverride({ field, name, value, onChange, readOnly }) {
  return (
    <FieldLabel label={field.label || name} readOnly={readOnly} icon={field.labelIcon}>
      <InputNumber
        style={{ width: "100%" }}
        value={value ?? undefined}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(v) => onChange(v)}
        disabled={readOnly}
      />
    </FieldLabel>
  );
}

function SelectFieldOverride({ field, name, value, onChange, readOnly }) {
  return (
    <FieldLabel label={field.label || name} readOnly={readOnly} icon={field.labelIcon}>
      <Select style={{ width: "100%" }} value={value} options={field.options} onChange={onChange} disabled={readOnly} />
    </FieldLabel>
  );
}

function RadioFieldOverride({ field, name, value, onChange, readOnly }) {
  return (
    <FieldLabel label={field.label || name} readOnly={readOnly} icon={field.labelIcon}>
      <Radio.Group
        size="large"
        options={field.options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        optionType="button"
        buttonStyle="solid"
        className="el-radio-buttons"
      />
    </FieldLabel>
  );
}

export const fieldTypes = {
  text: TextFieldOverride,
  textarea: TextareaFieldOverride,
  number: NumberFieldOverride,
  select: SelectFieldOverride,
  radio: RadioFieldOverride,
};
