// Regra das palavras-passe novas (registo, recuperação, mudança na conta, primeira palavra-passe): pelo menos 8 caracteres, com um número e um
// caráter especial (símbolo ou pontuação; letras de qualquer idioma e espaços não contam). A webapp aplica a mesma regra
// (webapp/src/utils/formFieldError.js). As palavras-passe que já existem não são afetadas: só a regra de quando se escolhe uma nova.
const MIN_PASSWORD = 8;
const PASSWORD_MESSAGE = "The password must have at least 8 characters, a number and a special character";

function isStrongPassword(password) {
  return typeof password === "string" && password.length >= MIN_PASSWORD && /\p{N}/u.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
}

module.exports = { MIN_PASSWORD, PASSWORD_MESSAGE, isStrongPassword };
