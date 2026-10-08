/**
 * @function maskEmail
 * @description Masks an email address by hiding part of the local part with asterisks.
 * @param {string} email - The email address to be masked.
 * @returns {string} The masked email address.
 */
export default function maskEmail(email = "") {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}
