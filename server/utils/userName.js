/**
 * @function mergeName
 * @description Merges first_name and last_name into a single name field and removes the original fields from the data object.
 * @param {Object} data - The data object containing first_name and last_name.
 * @returns {Object} The modified data object with the name field.
 */

function mergeName(data) {
  if (!data || (data.first_name === undefined && data.last_name === undefined)) return data;

  const name = [data.first_name, data.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");

  if (name) data.name = name;
  delete data.first_name;
  delete data.last_name;
  return data;
}

module.exports = { mergeName };
