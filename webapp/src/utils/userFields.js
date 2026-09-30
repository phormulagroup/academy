/**
 * @function genderOptions
 * @description Returns gender options for a select input, with the order depending on the language.
 * @param {function} t - Translation function.
 * @param {string} lang - Language code.
 * @returns {Array} Array of gender option objects with label and value.
 */

export const genderOptions = (t, lang) => {
  const male = { label: t("Male"), value: "Male" };
  const female = { label: t("Female"), value: "Female" };
  return [
    ...(lang === "pt" ? [female, male] : [male, female]),
    { label: t("Prefer not to say"), value: "Prefer not to say" },
  ];
};

/**
 * @function academicBackgroundOptions
 * @description Returns academic background options for a select input.
 * @param {function} t - Translation function.
 * @returns {Array} Array of academic background option objects with label and value.
 */

export const academicBackgroundOptions = (t) => [
  { label: t("Secondary School"), value: "Secondary School" },
  { label: t("University Degree"), value: "University Degree" },
  { label: t("PhD"), value: "PhD" },
  { label: t("Other"), value: "Other" },
];


/**
 * @function splitName
 * @description Splits a full name into first name and last name. The last term is considered the last name, and the rest is the first name.
 * @param {string} name - The full name to split.
 * @returns {Object} An object containing first_name and last_name.
 */

export function splitName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first_name: parts[0] || "", last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

/**
 * @constant NAME_PLACEHOLDERS
 * @description Provides example first and last names for different languages (placeholders).
 */ 

// Exemplos de Nome e Apelido por idioma (placeholders)
const NAME_PLACEHOLDERS = {
  pt: { first_name: "Maria", last_name: "Silva" },
  es: { first_name: "Lucía", last_name: "García" },
  en: { first_name: "John", last_name: "Smith" },
  fr: { first_name: "Marie", last_name: "Dubois" },
};

/**
 * @function namePlaceholders
 * @description Returns example first and last names for a given language.
 * @param {string} lang - Language code.
 * @returns {Object} An object containing first_name and last_name placeholders.
 */

export const namePlaceholders = (lang) =>
  NAME_PLACEHOLDERS[lang] || NAME_PLACEHOLDERS.en;
