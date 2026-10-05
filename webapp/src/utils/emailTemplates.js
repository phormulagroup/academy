// Templates de e-mail que a plataforma envia sozinha (utils/email.js no servidor procura-os pela chave `<tipo>_<id do idioma>`).
// Apagá-los faria falhar o envio, por isso só se editam. Cada tipo tem as variáveis que o servidor preenche ao enviar.
const SYSTEM_TYPES = {
  registration_received: { label: "Registration received", description: "Sent when a person registers, while the account waits for approval", audience: "user", variables: ["name"] },
  account_approved: { label: "Account approved", description: "Sent when an administrator approves an account", audience: "user", variables: ["name", "url"] },
  account_rejected: { label: "Account not approved", description: "Sent when an account is marked as not approved", audience: "user", variables: ["name"] },
  account_access: { label: "Account access", description: "Sent to people whose account was created or imported by an administrator, with the code to set their password", audience: "user", variables: ["name", "email", "code", "url"] },
  recover: { label: "Password recovery", description: "Sent with the code to recover a password", audience: "user", variables: ["name", "code", "url"] },
  password_changed: { label: "Password changed", description: "Sent to confirm that the password of an account was changed", audience: "user", variables: ["name", "url"] },
  ticket_received: { label: "Request received", description: "Sent to a person when they open a ticket", audience: "user", variables: ["name", "subject", "url"] },
  ticket_reply: { label: "Reply to the request", description: "Sent to a person when the team replies to their ticket", audience: "user", variables: ["name", "subject", "message", "url"] },
  contact_received: { label: "Contact message received", description: "Sent to the person who writes in the contact form", audience: "user", variables: ["name", "subject"] },
  contact_new: { label: "New contact message", description: "Sent to the team when someone writes in the contact form", audience: "staff", variables: ["name", "email", "subject", "message", "url"] },
  contact_reply: { label: "Reply to the contact form", description: "Sent to the person when the team replies to their message from the Submissions page", audience: "user", variables: ["name", "subject", "reply", "original"] },
  registration_new: { label: "New registration", description: "Sent to the team when someone registers and the account waits for approval", audience: "staff", variables: ["name", "email", "country", "url"] },
  ticket_new: { label: "New request", description: "Sent to the team when someone opens a ticket", audience: "staff", variables: ["name", "email", "subject", "message", "url"] },
  ticket_user_reply: { label: "Reply to a request", description: "Sent to whoever has the ticket assigned (or to the team) when the person replies to their ticket", audience: "staff", variables: ["name", "email", "subject", "message", "url"] },
  course_completed: { label: "Course completed", description: "Sent to a person when they complete a course", audience: "user", variables: ["name", "course", "url"] },
};

export const VARIABLES = {
  name: { label: "Name", hint: "The name of the person the e-mail is about (in the team e-mails, the person who registered or wrote)", sample: "Maria Silva" },
  email: { label: "E-mail", hint: "The e-mail address of the person the e-mail is about (in the team e-mails, the person who registered or wrote)", sample: "maria@example.com" },
  url: { label: "Button link", hint: "The address the button of the e-mail opens", sample: "https://academy.example.com" },
  subject: { label: "Subject", hint: "The subject of the ticket or of the contact message", sample: "Medical and scientific information" },
  message: { label: "Message", hint: "The text of the message", sample: "Hello, I would like to know more about this product." },
  reply: { label: "Reply", hint: "The reply written by the team", sample: "Thank you for your message. Here is the information you asked for." },
  original: { label: "Original message", hint: "The message the person sent in the contact form", sample: "Hello, I would like to know more about this product." },
  course: { label: "Course", hint: "The name of the course", sample: "Introduction to the product" },
  country: { label: "Country", hint: "The country of the person who registered", sample: "Portugal" },
  status: { label: "Status", hint: "The new status of the account", sample: "Active" },
  code: { label: "Code", hint: "The code to recover the password", sample: "123456" },
};

// Quem recebe o e-mail: "user" (a pessoa em causa), "staff" (a equipa) ou "custom" (os modelos criados no backoffice: o público escolhe-se ao enviar)
export const AUDIENCES = {
  user: { label: "User", hint: "Sent to the person the e-mail is about", color: "cyan" },
  staff: { label: "Team", hint: "Sent to the team (administrators), not to the user", color: "orange" },
  custom: { label: "Not sent automatically", hint: "This template is not linked to an action of the platform", color: "default" },
};

// "register_3" → "register"; os personalizados (criados no backoffice) não têm tipo do sistema
export function templateType(nameKey = "") {
  const type = Object.keys(SYSTEM_TYPES).find((key) => new RegExp(`^${key}_\\d+$`).test(nameKey));
  return type ? { type, system: true, ...SYSTEM_TYPES[type] } : { type: "custom", system: false, audience: "custom", label: "Custom", description: "Created in the dashboard, not sent automatically", variables: ["name"] };
}
