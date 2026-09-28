// Regras de validação partilhadas pelos formulários do backoffice.
// - Campos visíveis: rules={[...]} com a regra do tipo de campo e o antd mostra o erro por baixo do campo.
// - Campos escondidos da Multimédia (imagens/ficheiros): o erro vai para a label (ver utils/useFormErrors.js).

const REQUIRED_MESSAGE = "This field is required";

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

// Input de texto, DatePicker e campos escondidos: obrigatório (texto só com espaços também conta como vazio)
export const requiredRule = {
  required: true,
  whitespace: true,
  message: REQUIRED_MESSAGE,
};

// Tem uma opção escolhida (Select simples) ou pelo menos um item (Select múltiplo, Form.List).
// O required do antd não chega para os múltiplos: sem type "array", uma lista vazia conta como preenchida.
const requireSelection = async (_, value) => {
  if (isEmptyValue(value)) throw new Error(REQUIRED_MESSAGE);
};

// Selectores (dropdowns, simples ou múltiplos): obrigatório escolher pelo menos uma opção
export const requiredSelectRule = { required: true, validator: requireSelection };

// Form.List obrigatório: pelo menos um item
export const requiredListRule = { validator: requireSelection };

// Editor de texto (TipTap): o HTML sem texto (ex.: "<p></p>") também conta como vazio; imagens contam como conteúdo
const hasRichText = (html) =>
  typeof html === "string" &&
  (/<img\b/i.test(html) ||
    html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "");

export const requiredRichTextRule = {
  required: true,
  validator: async (_, value) => {
    if (!hasRichText(value)) throw new Error(REQUIRED_MESSAGE);
  },
};

// Confirmação de um campo (ex.: confirm_password = password); usar com dependencies={[field]} no Form.Item
export const matchFieldRule =
  (field, message) =>
  ({ getFieldValue }) => ({
    validator: async (_, value) => {
      if (value && getFieldValue(field) !== value) throw new Error(message);
    },
  });

// Erro a mostrar na label: campo vazio → obrigatório, só depois de submeter; os outros erros de validação
// (ex.: nome já existe, formato inválido) aparecem logo que o campo é validado
export function getFieldError({ submitted, value, errors, required = true }) {
  if (isEmptyValue(value)) return submitted && required ? REQUIRED_MESSAGE : null;
  return errors?.find((error) => error && error !== REQUIRED_MESSAGE) || null;
}

const normalize = (value) =>
  typeof value === "string" ? value.toLowerCase().trim() : value;

// Recursos repetidos: rejeita um valor já usado por outro registo ativo (is_deleted = 0), sem distinguir
// maiúsculas nem espaços nas pontas. field indica a coluna comparada (ex.: "internal_name");
// no Update passa-se o id do próprio registo em excludeId.
export const uniqueRule = (
  records,
  message,
  { field = "name", excludeId = null } = {},
) => ({
  validator: async (_, value) => {
    if (!value) return;
    const target = normalize(value);
    const exists = records.some(
      (record) =>
        !record.is_deleted &&
        record.id !== excludeId &&
        normalize(record[field]) === target,
    );
    if (exists) throw new Error(message);
  },
});
