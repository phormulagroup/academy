import axios from "axios";
import validator from "validator";
import i18n from "./i18n";
import endpoints from "./endpoints";

// Chave de tradução (em inglês); traduzida no momento da validação, no idioma atual
const REQUIRED_MESSAGE = "This field is required";
const requiredMessage = () => i18n.t(REQUIRED_MESSAGE);

/**
 * @function isEmptyValue
 * @description Checks if a value is considered empty (undefined, null, empty string, or empty array).
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is empty, false otherwise.
 */

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/**
 * @constant requiredRule
 * @description Validation rule for required text inputs and hidden fields. Text containing only spaces is also considered empty.
 * @type {Object}
 */ 
// Input de texto e campos escondidos: obrigatório (texto só com espaços também conta como vazio).
// Não usar em DatePicker/Select: com whitespace o antd valida o valor como texto (ver requiredDateRule).
export const requiredRule = {
  required: true,
  whitespace: true,
  // getter: o antd lê a mensagem ao validar, por isso segue o idioma atual
  get message() {
    return requiredMessage();
  },
};

/**
 * @function requireSelection
 * @description Validation function for required selections (single or multiple). Throws an error if the value is empty.
 * @param {any} _ - The rule object (not used).
 * @param {*} value - The value to validate.
 * @returns {Promise<void>} Resolves if the value is valid, rejects with an error if invalid.
 */

// Tem uma opção escolhida (Select simples) ou pelo menos um item (Select múltiplo, Form.List).
// O required do antd não chega para os múltiplos: sem type "array", uma lista vazia conta como preenchida.
const requireSelection = async (_, value) => {
  if (isEmptyValue(value)) throw new Error(requiredMessage());
};

// Selectores (dropdowns, simples ou múltiplos): obrigatório escolher pelo menos uma opção
export const requiredSelectRule = { required: true, validator: requireSelection };

// DatePicker obrigatório: o valor é uma data (dayjs), não texto, por isso só se verifica se existe
export const requiredDateRule = { required: true, validator: requireSelection };

// Form.List obrigatório: pelo menos um item
export const requiredListRule = { validator: requireSelection };

/**
 * @function hasRichText
 * @description Checks if the given HTML content has meaningful text or images. Empty HTML (without text) is considered empty; images count as content.
 * @param {string} html - The HTML content to check.
 * @returns {boolean} True if the content has text or images, false otherwise.
 */

// Editor de texto (TipTap): o HTML sem texto (ex.: "<p></p>") também conta como vazio; imagens contam como conteúdo
const hasRichText = (html) =>
  typeof html === "string" &&
  (/<img\b/i.test(html) ||
    html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "");

/**
 * @constant requiredRichTextRule
 * @description Validation rule for required rich text inputs (TipTap). Considers HTML without text as empty; images count as content.
 * @type {Object}
 */
export const requiredRichTextRule = {
  required: true,
  validator: async (_, value) => {
    if (!hasRichText(value)) throw new Error(requiredMessage());
  },
};

/**
 * @function requiredCheckboxRule
 * @description Returns a validation rule for required checkboxes. Throws an error with the provided message if the checkbox is not checked.
 * @param {string} message - The error message to display if the checkbox is not checked.
 * @returns {Object} Validation rule object for the checkbox.
 */

// Checkbox obrigatório (ex.: aceitar a Política de Privacidade); message já traduzida
export const requiredCheckboxRule = (message) => ({
  required: true,
  validator: async (_, checked) => {
    if (!checked) throw new Error(message);
  },
});

/**
 * @constant emailRule
 * @description Validation rule for email fields. Ensures the value is a valid email format if provided.
 * @type {Object}
 */

export const emailRule = {
  validator: async (_, value) => {
    if (value && !validator.isEmail(value.trim()))
      throw new Error(i18n.t("The e-mail must be valid"));
  },
};

/**
 * @function userEmailRule
 * @description Returns a validation rule for user email fields. Checks if the email exists or not based on the shouldExist flag. Optionally excludes a specific user ID from the check.
 * @param {Object} options - Options for the rule.
 * @param {boolean} options.shouldExist - If true, the email must exist; if false, the email must not exist.
 * @param {string|null} options.excludeId - User ID to exclude from the existence check.
 * @returns {Object} Validation rule object for the user email field.
 */

export const userEmailRule = ({ shouldExist = false, excludeId = null } = {}) => ({
  validator: async (_, value) => {
    const email = (value || "").trim();
    if (!email || !validator.isEmail(email)) return;
    let data;
    try {
      ({ data } = await axios.get(endpoints.user.readByEmail, {
        params: { email },
      }));
    } catch (err) {
      // Sem resposta válida (ex.: rede): não bloqueia o campo; o servidor volta a validar ao gravar
      console.log(err);
      return;
    }
    const exists = (data || []).some(
      (user) => !user.is_deleted && user.id !== excludeId,
    );
    if (shouldExist && !exists)
      throw new Error(i18n.t("There is no account with this e-mail"));
    if (!shouldExist && exists)
      throw new Error(
        i18n.t("This e-mail is already associated with another account"),
      );
  },
});

/**
 * @function setFieldError
 * @description Sets a field error on the form with the provided message.
 * @param {Object} form - The form instance.
 * @param {string} name - The name of the field to set the error on.
 * @param {string} message - The error message to display.
 * @returns {void}
 */

// Mostra no campo um erro devolvido pelo servidor ao submeter (ex.: e-mail sem conta), com a borda a vermelho
export const setFieldError = (form, name, message) =>
  form.setFields([{ name, errors: [message] }]);

// Props do Form.Item do e-mail: ícone de validação e uma pequena espera enquanto se escreve
export const emailFieldProps = { hasFeedback: true, validateDebounce: 500 };

/**
 * @constant emailFieldProps
 * @description Props for the email Form.Item, including validation feedback and debounce while typing.
 * @type {Object}
 */

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
  if (isEmptyValue(value)) return submitted && required ? requiredMessage() : null;
  return errors?.find((error) => error && error !== requiredMessage()) || null;
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
