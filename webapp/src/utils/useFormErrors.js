import { createElement, useState } from "react";
import FieldLabel from "./fieldLabel";
import { getFieldError } from "./formFieldError";

// Erros na label dos campos que o antd não consegue mostrar (campos escondidos da Multimédia) ou quando a
// mensagem deve ficar na label: só aparecem depois de submeter e desaparecem quando o campo tem conteúdo.
// Uso: <Form onFieldsChange={onFieldsChange}>, botão onClick={() => submit()}, reset() ao fechar.
export default function useFormErrors(form) {
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const pathKey = (name) => [].concat(name).join(".");

  // Guarda os erros de validação de cada campo (o antd chama-o sempre que valida)
  const onFieldsChange = (changedFields) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      changedFields.forEach((field) => {
        next[pathKey(field.name)] = field.errors;
      });
      return next;
    });

  // Marca a submissão antes de validar: os erros aparecem mesmo que a validação falhe
  const submit = () => {
    setSubmitted(true);
    form.submit();
  };

  const reset = () => {
    setSubmitted(false);
    setFieldErrors({});
  };

  // Erro a mostrar na label do campo (name como em Form: "img" ou ["items", 0, "file"])
  const errorOf = (name, value, { required = true } = {}) =>
    getFieldError({
      submitted,
      value,
      errors: fieldErrors[pathKey(name)],
      required,
    });

  // Props de um Form.Item visível com o erro na label em vez de por baixo do campo
  const labelErrorProps = (name, value, label) => {
    const error = errorOf(name, value);
    return {
      label: createElement(FieldLabel, { label, error }),
      help: "",
      validateStatus: error ? "error" : "",
    };
  };

  return { submitted, submit, reset, onFieldsChange, errorOf, labelErrorProps };
}
