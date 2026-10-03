// Templates de e-mail que a plataforma envia sozinha (utils/email.js no servidor procura-os pela chave `<tipo>_<id do idioma>`).
// Apagá-los faria falhar o envio, por isso só se editam. Cada tipo tem as variáveis que o servidor preenche ao enviar.
const SYSTEM_TYPES = {
  register: { label: "New registration", description: "Sent to a person when they create an account", variables: ["name"] },
  change_status: { label: "Account status change", description: "Sent to a person when an administrator changes the status of their account", variables: ["name", "status"] },
  recover: { label: "Password recovery", description: "Sent with the code to recover a password", variables: ["name", "code"] },
  create_user: { label: "User created", description: "Sent when an administrator creates an account for someone", variables: ["name"] },
};

export const VARIABLES = {
  name: { label: "Name", hint: "The name of the person receiving the e-mail", sample: "Maria Silva" },
  status: { label: "Status", hint: "The new status of the account", sample: "Active" },
  code: { label: "Code", hint: "The code to recover the password", sample: "123456" },
};

// "register_3" → "register"; os personalizados (criados no backoffice) não têm tipo do sistema
export function templateType(nameKey = "") {
  const type = Object.keys(SYSTEM_TYPES).find((key) => new RegExp(`^${key}_\\d+$`).test(nameKey));
  return type ? { type, system: true, ...SYSTEM_TYPES[type] } : { type: "custom", system: false, label: "Custom", description: "Created in the dashboard, not sent automatically", variables: ["name"] };
}
