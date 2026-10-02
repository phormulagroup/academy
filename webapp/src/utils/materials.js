/**
 * @function courseMaterials
 * @description Course materials visible on the front, filtered by the course country restriction.
 * - Course without country restriction (settings.country_limit off or no countries): all materials.
 * - Course restricted to countries (e.g. only Angola): materials restricted to one of those countries,
 *   plus materials without restriction (no "country" key).
 * Materials without a file are ignored.
 * @param {object} course - Course with parsed `material` (array of { file, name, country? }) and `settings`.
 * @returns {Array} Filtered materials.
 */
export function courseMaterials(course) {
  const materials = (course?.material || []).filter((m) => m.file);
  const courseCountries = course?.settings?.country_limit
    ? course.settings.country || []
    : [];
  if (courseCountries.length === 0) return materials;
  return materials.filter(
    (m) =>
      !m.country ||
      m.country.length === 0 ||
      m.country.some((c) => courseCountries.includes(c)),
  );
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
