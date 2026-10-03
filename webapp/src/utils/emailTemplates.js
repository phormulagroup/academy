// Templates de e-mail que a plataforma envia sozinha (utils/email.js no servidor procura-os pela chave `<tipo>_<id do idioma>`).
// Apagá-los faria falhar o envio, por isso só se editam. Cada tipo tem as variáveis que o servidor preenche ao enviar.
const SYSTEM_TYPES = {
  registration_received: { label: "Registration received", description: "Sent when a person registers, while the account waits for approval", variables: ["name"] },
  account_approved: { label: "Account approved", description: "Sent when an administrator approves an account", variables: ["name", "url"] },
  account_rejected: { label: "Account not approved", description: "Sent when an account is marked as not approved", variables: ["name"] },
  account_access: { label: "Account access", description: "Sent to people whose account was created or imported by an administrator, with the code to set their password", variables: ["name", "email", "code", "url"] },
  recover: { label: "Password recovery", description: "Sent with the code to recover a password", variables: ["name", "code"] },
  password_changed: { label: "Password changed", description: "Sent to confirm that the password of an account was changed", variables: ["name", "url"] },
  ticket_received: { label: "Request received", description: "Sent to a person when they open a ticket", variables: ["name", "subject", "url"] },
  ticket_reply: { label: "Reply to the request", description: "Sent to a person when the team replies to their ticket", variables: ["name", "subject", "message", "url"] },
  contact_received: { label: "Contact message received", description: "Sent to the person who writes in the contact form", variables: ["name", "subject"] },
  contact_new: { label: "New contact message (team)", description: "Sent to the team when someone writes in the contact form", variables: ["name", "email", "subject", "message", "url"] },
  contact_reply: { label: "Reply to the contact form", description: "Sent to the person when the team replies to their message from the Submissions page", variables: ["name", "subject", "reply", "original"] },
  course_completed: { label: "Course completed", description: "Sent to a person when they complete a course", variables: ["name", "course", "url"] },
};

export const VARIABLES = {
  name: { label: "Name", hint: "The name of the person receiving the e-mail", sample: "Maria Silva" },
  email: { label: "E-mail", hint: "The e-mail address of the person receiving the e-mail", sample: "maria@example.com" },
  url: { label: "Button link", hint: "The address the button of the e-mail opens", sample: "https://academy.example.com" },
  subject: { label: "Subject", hint: "The subject of the ticket or of the contact message", sample: "Medical and scientific information" },
  message: { label: "Message", hint: "The text of the message", sample: "Hello, I would like to know more about this product." },
  reply: { label: "Reply", hint: "The reply written by the team", sample: "Thank you for your message. Here is the information you asked for." },
  original: { label: "Original message", hint: "The message the person sent in the contact form", sample: "Hello, I would like to know more about this product." },
  course: { label: "Course", hint: "The name of the course", sample: "Introduction to the product" },
  status: { label: "Status", hint: "The new status of the account", sample: "Active" },
  code: { label: "Code", hint: "The code to recover the password", sample: "123456" },
};

// "register_3" → "register"; os personalizados (criados no backoffice) não têm tipo do sistema
export function templateType(nameKey = "") {
  const type = Object.keys(SYSTEM_TYPES).find((key) => new RegExp(`^${key}_\\d+$`).test(nameKey));
  return type ? { type, system: true, ...SYSTEM_TYPES[type] } : { type: "custom", system: false, label: "Custom", description: "Created in the dashboard, not sent automatically", variables: ["name"] };
}
