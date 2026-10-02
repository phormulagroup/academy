import { isAllowedByCountry } from "./courseStatus";

/**
 * @function courseMaterials
 * @description Course materials visible on the front for the authenticated user (students and admin):
 * - a material restricted to countries is only visible to users of those countries;
 * - if the course is restricted to countries (e.g. Cabo Verde), only materials of those countries are listed
 *   (materials without restriction are kept).
 * Materials without a file are ignored.
 * @param {object} course - Course with parsed `material` (array of { file, name, country? }) and `settings`.
 * @param {object} user - Authenticated user (country).
 * @returns {Array} Filtered materials.
 */
export function courseMaterials(course, user) {
  const materials = (course?.material || []).filter((m) => m.file);
  const courseCountries = course?.settings?.country_limit
    ? course.settings.country || []
    : [];
  return materials.filter((m) => {
    const countries = m.country || [];
    if (!isAllowedByCountry(countries, user)) return false;
    if (courseCountries.length === 0 || countries.length === 0) return true;
    return countries.some((c) => courseCountries.includes(c));
  });
}

/**
 * @function cleanMaterials
 * @description Prepares materials to save: the "country" key is only kept when the material is restricted
 * to at least one country (default object is { file, name }).
 * @param {Array} materials - Materials from the backoffice form.
 * @returns {Array} Materials ready to be saved.
 */
export function cleanMaterials(materials) {
  return (materials || []).map(({ country, ...m }) =>
    country && country.length > 0 ? { ...m, country } : m,
  );
}
