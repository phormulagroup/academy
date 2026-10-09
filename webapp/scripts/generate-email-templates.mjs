// Gera os templates automáticos da plataforma (registo recebido, conta aprovada, acesso à conta...) em 4 línguas, em MJML com as cores
// e fontes da marca. Escreve dois ficheiros:
//  - server/utils/defaultEmailTemplates.json: o que o servidor usa quando a BD ainda não tem o template (e-mails nunca deixam de sair)
//  - server/database/migrations/2026-10-07-email-templates.sql: cria estes templates na BD (só os que faltam), para se editarem no backoffice
// Uso (na pasta webapp): node scripts/generate-email-templates.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// O mjml-browser foi feito para o browser e espera um `window`
globalThis.window = globalThis;
const { default: mjml2html } = await import("mjml-browser");

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");

// Idiomas da BD (language.id → código)
const LANGS = { 3: "pt", 4: "es", 5: "en", 6: "fr" };

const BRAND = "#163986";
const ACCENT = "#00B9D6";
const BODY_FONT = "Poppins, Arial, Helvetica, sans-serif";
const HEADING_FONT = "Ryker, Poppins, Arial, Helvetica, sans-serif";

// ---- Textos ---------------------------------------------------------------------------------------------------------------------
// Por tipo e língua: name (nome no backoffice), subject, title, paragraphs[], box (caixa em destaque), button (texto) e link
const T = {
  registration_received: {
    vars: ["name"],
    pt: { name: "Registo recebido", subject: "Recebemos o seu registo na Bial Regional Academy", title: "Olá {{name}},", paragraphs: ["Obrigado por se registar na Bial Regional Academy.", "A sua conta está a aguardar aprovação. Assim que for aprovada enviaremos um novo e-mail e poderá aceder à plataforma."] },
    es: { name: "Registro recibido", subject: "Hemos recibido su registro en Bial Regional Academy", title: "Hola {{name}},", paragraphs: ["Gracias por registrarse en Bial Regional Academy.", "Su cuenta está pendiente de aprobación. En cuanto se apruebe le enviaremos un nuevo correo y podrá acceder a la plataforma."] },
    en: { name: "Registration received", subject: "We received your registration at Bial Regional Academy", title: "Hello {{name}},", paragraphs: ["Thank you for registering at Bial Regional Academy.", "Your account is waiting for approval. As soon as it is approved we will send you a new e-mail and you will be able to access the platform."] },
    fr: { name: "Inscription reçue", subject: "Nous avons bien reçu votre inscription à la Bial Regional Academy", title: "Bonjour {{name}},", paragraphs: ["Merci de vous être inscrit à la Bial Regional Academy.", "Votre compte est en attente d’approbation. Dès qu’il sera approuvé, nous vous enverrons un nouvel e-mail et vous pourrez accéder à la plateforme."] },
  },
  account_approved: {
    vars: ["name", "url"],
    link: "login",
    pt: { name: "Conta aprovada", subject: "A sua conta foi aprovada", title: "Boas notícias, {{name}}!", paragraphs: ["A sua conta na Bial Regional Academy foi aprovada. Já pode iniciar sessão e aceder aos cursos."], button: "Iniciar sessão" },
    es: { name: "Cuenta aprobada", subject: "Su cuenta ha sido aprobada", title: "¡Buenas noticias, {{name}}!", paragraphs: ["Su cuenta en Bial Regional Academy ha sido aprobada. Ya puede iniciar sesión y acceder a los cursos."], button: "Iniciar sesión" },
    en: { name: "Account approved", subject: "Your account has been approved", title: "Good news, {{name}}!", paragraphs: ["Your Bial Regional Academy account has been approved. You can now log in and access the courses."], button: "Log in" },
    fr: { name: "Compte approuvé", subject: "Votre compte a été approuvé", title: "Bonne nouvelle, {{name}} !", paragraphs: ["Votre compte Bial Regional Academy a été approuvé. Vous pouvez maintenant vous connecter et accéder aux cours."], button: "Se connecter" },
  },
  account_rejected: {
    vars: ["name"],
    pt: { name: "Conta não aprovada", subject: "Atualização sobre a sua conta", title: "Olá {{name}},", paragraphs: ["Lamentamos informar que não foi possível aprovar a sua conta na Bial Regional Academy.", "Se acha que se trata de um engano, contacte o seu representante Bial para mais informações."] },
    es: { name: "Cuenta no aprobada", subject: "Actualización sobre su cuenta", title: "Hola {{name}},", paragraphs: ["Lamentamos informarle de que no ha sido posible aprobar su cuenta en Bial Regional Academy.", "Si cree que se trata de un error, póngase en contacto con su representante de Bial para más información."] },
    en: { name: "Account not approved", subject: "An update about your account", title: "Hello {{name}},", paragraphs: ["We are sorry to let you know that it was not possible to approve your Bial Regional Academy account.", "If you think this is a mistake, please contact your Bial representative for more information."] },
    fr: { name: "Compte non approuvé", subject: "Mise à jour concernant votre compte", title: "Bonjour {{name}},", paragraphs: ["Nous sommes désolés de vous informer qu’il n’a pas été possible d’approuver votre compte Bial Regional Academy.", "Si vous pensez qu’il s’agit d’une erreur, contactez votre représentant Bial pour plus d’informations."] },
  },
  account_access: {
    vars: ["name", "email", "code", "url"],
    link: "recover",
    pt: { name: "Acesso à conta", subject: "A sua conta na Bial Regional Academy está pronta", title: "Olá {{name}},", paragraphs: ["Foi criada uma conta para si na Bial Regional Academy. Para definir a sua password:", "1. Abra a página de recuperação de password.<br/>2. Introduza o seu e-mail ({{email}}) e o código abaixo.<br/>3. Escolha a sua nova password."], box: "{{code}}", button: "Definir a minha password" },
    es: { name: "Acceso a la cuenta", subject: "Su cuenta en Bial Regional Academy está lista", title: "Hola {{name}},", paragraphs: ["Se ha creado una cuenta para usted en Bial Regional Academy. Para definir su contraseña:", "1. Abra la página de recuperación de contraseña.<br/>2. Introduzca su correo ({{email}}) y el código de abajo.<br/>3. Elija su nueva contraseña."], box: "{{code}}", button: "Definir mi contraseña" },
    en: { name: "Account access", subject: "Your Bial Regional Academy account is ready", title: "Hello {{name}},", paragraphs: ["An account has been created for you at Bial Regional Academy. To set your password:", "1. Open the password recovery page.<br/>2. Enter your e-mail ({{email}}) and the code below.<br/>3. Choose your new password."], box: "{{code}}", button: "Set my password" },
    fr: { name: "Accès au compte", subject: "Votre compte Bial Regional Academy est prêt", title: "Bonjour {{name}},", paragraphs: ["Un compte a été créé pour vous sur la Bial Regional Academy. Pour définir votre mot de passe :", "1. Ouvrez la page de récupération du mot de passe.<br/>2. Saisissez votre e-mail ({{email}}) et le code ci-dessous.<br/>3. Choisissez votre nouveau mot de passe."], box: "{{code}}", button: "Définir mon mot de passe" },
  },
  password_changed: {
    vars: ["name", "url"],
    link: "recover",
    pt: { name: "Password alterada", subject: "A sua password foi alterada", title: "Olá {{name}},", paragraphs: ["A password da sua conta na Bial Regional Academy foi alterada.", "Se foi você, não precisa de fazer nada. Se não reconhece esta alteração, recupere o acesso à sua conta de imediato e contacte-nos."], button: "Recuperar a minha conta" },
    es: { name: "Contraseña cambiada", subject: "Su contraseña ha sido cambiada", title: "Hola {{name}},", paragraphs: ["La contraseña de su cuenta en Bial Regional Academy ha sido cambiada.", "Si fue usted, no tiene que hacer nada. Si no reconoce este cambio, recupere el acceso a su cuenta de inmediato y póngase en contacto con nosotros."], button: "Recuperar mi cuenta" },
    en: { name: "Password changed", subject: "Your password has been changed", title: "Hello {{name}},", paragraphs: ["The password of your Bial Regional Academy account has been changed.", "If it was you, there is nothing else to do. If you do not recognise this change, recover access to your account immediately and contact us."], button: "Recover my account" },
    fr: { name: "Mot de passe modifié", subject: "Votre mot de passe a été modifié", title: "Bonjour {{name}},", paragraphs: ["Le mot de passe de votre compte Bial Regional Academy a été modifié.", "Si c’était vous, vous n’avez rien à faire. Si vous ne reconnaissez pas cette modification, récupérez immédiatement l’accès à votre compte et contactez-nous."], button: "Récupérer mon compte" },
  },
  ticket_received: {
    vars: ["name", "subject", "url"],
    link: "tickets",
    pt: { name: "Pedido recebido", subject: "Recebemos o seu pedido: {{subject}}", title: "Olá {{name}},", paragraphs: ["Recebemos o seu pedido «{{subject}}».", "A nossa equipa vai analisá-lo e responder o mais brevemente possível. Será avisado por e-mail quando houver uma resposta."], button: "Ver o pedido" },
    es: { name: "Solicitud recibida", subject: "Hemos recibido su solicitud: {{subject}}", title: "Hola {{name}},", paragraphs: ["Hemos recibido su solicitud «{{subject}}».", "Nuestro equipo la analizará y responderá lo antes posible. Le avisaremos por correo cuando haya una respuesta."], button: "Ver la solicitud" },
    en: { name: "Request received", subject: "We received your request: {{subject}}", title: "Hello {{name}},", paragraphs: ["We received your request “{{subject}}”.", "Our team will look into it and reply as soon as possible. You will be notified by e-mail when there is an answer."], button: "View the request" },
    fr: { name: "Demande reçue", subject: "Nous avons reçu votre demande : {{subject}}", title: "Bonjour {{name}},", paragraphs: ["Nous avons reçu votre demande « {{subject}} ».", "Notre équipe va l’étudier et répondre dès que possible. Vous serez prévenu par e-mail dès qu’il y aura une réponse."], button: "Voir la demande" },
  },
  ticket_reply: {
    vars: ["name", "subject", "message", "url"],
    link: "tickets",
    pt: { name: "Resposta ao pedido", subject: "Nova resposta ao seu pedido: {{subject}}", title: "Olá {{name}},", paragraphs: ["A nossa equipa respondeu ao seu pedido «{{subject}}»:"], box: "{{message}}", button: "Ver a conversa" },
    es: { name: "Respuesta a la solicitud", subject: "Nueva respuesta a su solicitud: {{subject}}", title: "Hola {{name}},", paragraphs: ["Nuestro equipo ha respondido a su solicitud «{{subject}}»:"], box: "{{message}}", button: "Ver la conversación" },
    en: { name: "Reply to the request", subject: "New reply to your request: {{subject}}", title: "Hello {{name}},", paragraphs: ["Our team has replied to your request “{{subject}}”:"], box: "{{message}}", button: "View the conversation" },
    fr: { name: "Réponse à la demande", subject: "Nouvelle réponse à votre demande : {{subject}}", title: "Bonjour {{name}},", paragraphs: ["Notre équipe a répondu à votre demande « {{subject}} » :"], box: "{{message}}", button: "Voir la conversation" },
  },
  contact_received: {
    vars: ["name", "subject"],
    pt: { name: "Mensagem de contacto recebida", subject: "Recebemos a sua mensagem", title: "Olá {{name}},", paragraphs: ["Obrigado por nos contactar. Recebemos a sua mensagem sobre «{{subject}}» e responderemos assim que possível."] },
    es: { name: "Mensaje de contacto recibido", subject: "Hemos recibido su mensaje", title: "Hola {{name}},", paragraphs: ["Gracias por contactarnos. Hemos recibido su mensaje sobre «{{subject}}» y le responderemos lo antes posible."] },
    en: { name: "Contact message received", subject: "We received your message", title: "Hello {{name}},", paragraphs: ["Thank you for contacting us. We received your message about “{{subject}}” and we will reply as soon as possible."] },
    fr: { name: "Message de contact reçu", subject: "Nous avons reçu votre message", title: "Bonjour {{name}},", paragraphs: ["Merci de nous avoir contactés. Nous avons reçu votre message concernant « {{subject}} » et nous vous répondrons dès que possible."] },
  },
  contact_new: {
    vars: ["name", "email", "subject", "message", "url"],
    link: "submission",
    pt: { name: "Nova mensagem de contacto", subject: "Nova mensagem de contacto: {{subject}}", title: "Nova mensagem de contacto", paragraphs: ["{{name}} ({{email}}) enviou uma mensagem pelo formulário de contacto, com o assunto «{{subject}}»:"], box: "{{message}}", button: "Ver a submissão" },
    es: { name: "Nuevo mensaje de contacto", subject: "Nuevo mensaje de contacto: {{subject}}", title: "Nuevo mensaje de contacto", paragraphs: ["{{name}} ({{email}}) ha enviado un mensaje por el formulario de contacto, con el asunto «{{subject}}»:"], box: "{{message}}", button: "Ver el envío" },
    en: { name: "New contact message", subject: "New contact message: {{subject}}", title: "New contact message", paragraphs: ["{{name}} ({{email}}) sent a message through the contact form, with the subject “{{subject}}”:"], box: "{{message}}", button: "View the submission" },
    fr: { name: "Nouveau message de contact", subject: "Nouveau message de contact : {{subject}}", title: "Nouveau message de contact", paragraphs: ["{{name}} ({{email}}) a envoyé un message via le formulaire de contact, avec pour objet « {{subject}} » :"], box: "{{message}}", button: "Voir la soumission" },
  },
  // A resposta da equipa a uma mensagem do formulário de contacto: {{{reply}}} e {{{original}}} chegam já escapados e com quebras de linha (<br>)
  contact_reply: {
    vars: ["name", "subject", "reply", "original"],
    pt: { name: "Resposta ao formulário de contacto", subject: "{{subject}}", title: "Olá {{name}},", paragraphs: ["{{{reply}}}", "Com os melhores cumprimentos,<br/>Equipa Bial Regional Academy"], boxTitle: "A sua mensagem", box: "{{{original}}}" },
    es: { name: "Respuesta al formulario de contacto", subject: "{{subject}}", title: "Hola {{name}},", paragraphs: ["{{{reply}}}", "Atentamente,<br/>Equipo Bial Regional Academy"], boxTitle: "Su mensaje", box: "{{{original}}}" },
    en: { name: "Reply to the contact form", subject: "{{subject}}", title: "Hello {{name}},", paragraphs: ["{{{reply}}}", "Best regards,<br/>Bial Regional Academy team"], boxTitle: "Your message", box: "{{{original}}}" },
    fr: { name: "Réponse au formulaire de contact", subject: "{{subject}}", title: "Bonjour {{name}},", paragraphs: ["{{{reply}}}", "Cordialement,<br/>L’équipe Bial Regional Academy"], boxTitle: "Votre message", box: "{{{original}}}" },
  },
  course_completed: {
    vars: ["name", "course", "url"],
    link: "results",
    pt: { name: "Curso concluído", subject: "Parabéns, concluiu o curso {{course}}", title: "Parabéns, {{name}}!", paragraphs: ["Concluiu o curso «{{course}}» na Bial Regional Academy. Obrigado pela sua dedicação.", "Pode consultar os seus resultados e, se o curso tiver certificado, descarregá-lo na página de resultados."], button: "Ver os meus resultados" },
    es: { name: "Curso completado", subject: "Enhorabuena, ha completado el curso {{course}}", title: "¡Enhorabuena, {{name}}!", paragraphs: ["Ha completado el curso «{{course}}» en Bial Regional Academy. Gracias por su dedicación.", "Puede consultar sus resultados y, si el curso tiene certificado, descargarlo en la página de resultados."], button: "Ver mis resultados" },
    en: { name: "Course completed", subject: "Congratulations, you completed the course {{course}}", title: "Congratulations, {{name}}!", paragraphs: ["You completed the course “{{course}}” at Bial Regional Academy. Thank you for your dedication.", "You can see your results and, if the course has a certificate, download it on the results page."], button: "See my results" },
    fr: { name: "Cours terminé", subject: "Félicitations, vous avez terminé le cours {{course}}", title: "Félicitations, {{name}} !", paragraphs: ["Vous avez terminé le cours « {{course}} » à la Bial Regional Academy. Merci pour votre engagement.", "Vous pouvez consulter vos résultats et, si le cours comporte un certificat, le télécharger sur la page des résultats."], button: "Voir mes résultats" },
  },
  // ---- Acrescentados em 2026-10-12 (migração 2026-10-12-team-email-templates.sql) ----
  // Recuperação de password: substitui o template antigo (editor Unlayer, com texto de outro projeto) pelo do editor novo
  recover: {
    since: "2026-10-12",
    vars: ["name", "code", "minutes", "url"],
    link: "recover",
    pt: { name: "Recuperar password", subject: "Recupere a sua password", title: "Olá {{name}},", paragraphs: ["Recebemos um pedido para recuperar a password da sua conta na Bial Regional Academy.", "Introduza este código na página de recuperação para escolher uma nova password:"], box: "{{code}}", after: ["O código é válido durante {{minutes}} minutos.", "Se não foi você a pedir a recuperação, ignore este e-mail: a sua password não é alterada."], button: "Recuperar a minha password" },
    es: { name: "Recuperar contraseña", subject: "Recupere su contraseña", title: "Hola {{name}},", paragraphs: ["Hemos recibido una solicitud para recuperar la contraseña de su cuenta en Bial Regional Academy.", "Introduzca este código en la página de recuperación para elegir una nueva contraseña:"], box: "{{code}}", after: ["El código es válido durante {{minutes}} minutos.", "Si no ha solicitado la recuperación, ignore este correo: su contraseña no se modificará."], button: "Recuperar mi contraseña" },
    en: { name: "Recover password", subject: "Recover your password", title: "Hello {{name}},", paragraphs: ["We received a request to recover the password of your Bial Regional Academy account.", "Enter this code on the recovery page to choose a new password:"], box: "{{code}}", after: ["The code is valid for {{minutes}} minutes.", "If you did not ask to recover your password, ignore this e-mail: your password will not change."], button: "Recover my password" },
    fr: { name: "Récupérer le mot de passe", subject: "Récupérez votre mot de passe", title: "Bonjour {{name}},", paragraphs: ["Nous avons reçu une demande de récupération du mot de passe de votre compte Bial Regional Academy.", "Saisissez ce code sur la page de récupération pour choisir un nouveau mot de passe :"], box: "{{code}}", after: ["Le code est valable pendant {{minutes}} minutes.", "Si vous n’avez pas demandé la récupération, ignorez cet e-mail : votre mot de passe ne sera pas modifié."], button: "Récupérer mon mot de passe" },
  },
  // Verificação em dois passos (2FA): código enviado depois da password certa no login
  login_code: {
    vars: ["name", "login_code", "minutes"],
    pt: { name: "Código de verificação", subject: "Código de verificação para iniciar sessão", title: "Olá {{name}},", paragraphs: ["Para concluir o início de sessão na Bial Regional Academy, introduza este código de verificação:"], box: "{{login_code}}", after: ["O código é válido durante {{minutes}} minutos.", "Se não foi você a iniciar sessão, altere a sua password e contacte-nos."] },
    es: { name: "Código de verificación", subject: "Código de verificación para iniciar sesión", title: "Hola {{name}},", paragraphs: ["Para completar el inicio de sesión en Bial Regional Academy, introduzca este código de verificación:"], box: "{{login_code}}", after: ["El código es válido durante {{minutes}} minutos.", "Si no ha sido usted quien ha iniciado sesión, cambie su contraseña y póngase en contacto con nosotros."] },
    en: { name: "Verification code", subject: "Verification code to log in", title: "Hello {{name}},", paragraphs: ["To finish logging in to Bial Regional Academy, enter this verification code:"], box: "{{login_code}}", after: ["The code is valid for {{minutes}} minutes.", "If you did not try to log in, change your password and contact us."] },
    fr: { name: "Code de vérification", subject: "Code de vérification pour vous connecter", title: "Bonjour {{name}},", paragraphs: ["Pour terminer votre connexion à la Bial Regional Academy, saisissez ce code de vérification :"], box: "{{login_code}}", after: ["Le code est valable pendant {{minutes}} minutes.", "Si vous n’êtes pas à l’origine de cette connexion, changez votre mot de passe et contactez-nous."] },
  },
  // Para a equipa: novo registo à espera de aprovação
  registration_new: {
    since: "2026-10-12",
    vars: ["name", "email", "country", "url"],
    link: "user",
    pt: { name: "Novo registo", subject: "Novo registo para aprovar: {{name}}", title: "Novo registo", paragraphs: ["{{name}} ({{email}}), de {{country}}, registou-se na plataforma e aguarda aprovação."], button: "Ver o utilizador" },
    es: { name: "Nuevo registro", subject: "Nuevo registro por aprobar: {{name}}", title: "Nuevo registro", paragraphs: ["{{name}} ({{email}}), de {{country}}, se ha registrado en la plataforma y espera aprobación."], button: "Ver el usuario" },
    en: { name: "New registration", subject: "New registration to approve: {{name}}", title: "New registration", paragraphs: ["{{name}} ({{email}}), from {{country}}, registered on the platform and is waiting for approval."], button: "View the user" },
    fr: { name: "Nouvelle inscription", subject: "Nouvelle inscription à approuver : {{name}}", title: "Nouvelle inscription", paragraphs: ["{{name}} ({{email}}), de {{country}}, s’est inscrit sur la plateforme et attend l’approbation."], button: "Voir l’utilisateur" },
  },
  // Para a equipa: novo pedido (ticket)
  ticket_new: {
    since: "2026-10-12",
    vars: ["name", "email", "subject", "message", "url"],
    link: "ticket_admin",
    pt: { name: "Novo pedido", subject: "Novo pedido: {{subject}}", title: "Novo pedido", paragraphs: ["{{name}} ({{email}}) abriu um pedido com o assunto «{{subject}}»:"], box: "{{message}}", button: "Ver o pedido" },
    es: { name: "Nueva solicitud", subject: "Nueva solicitud: {{subject}}", title: "Nueva solicitud", paragraphs: ["{{name}} ({{email}}) ha abierto una solicitud con el asunto «{{subject}}»:"], box: "{{message}}", button: "Ver la solicitud" },
    en: { name: "New request", subject: "New request: {{subject}}", title: "New request", paragraphs: ["{{name}} ({{email}}) opened a request with the subject “{{subject}}”:"], box: "{{message}}", button: "View the request" },
    fr: { name: "Nouvelle demande", subject: "Nouvelle demande : {{subject}}", title: "Nouvelle demande", paragraphs: ["{{name}} ({{email}}) a ouvert une demande avec pour objet « {{subject}} » :"], box: "{{message}}", button: "Voir la demande" },
  },
  // Para a equipa: a pessoa respondeu a um pedido
  ticket_user_reply: {
    since: "2026-10-12",
    vars: ["name", "email", "subject", "message", "url"],
    link: "ticket_admin",
    pt: { name: "Resposta a um pedido", subject: "Nova resposta ao pedido: {{subject}}", title: "Nova resposta a um pedido", paragraphs: ["{{name}} ({{email}}) respondeu ao pedido «{{subject}}»:"], box: "{{message}}", button: "Ver o pedido" },
    es: { name: "Respuesta a una solicitud", subject: "Nueva respuesta a la solicitud: {{subject}}", title: "Nueva respuesta a una solicitud", paragraphs: ["{{name}} ({{email}}) ha respondido a la solicitud «{{subject}}»:"], box: "{{message}}", button: "Ver la solicitud" },
    en: { name: "Reply to a request", subject: "New reply to the request: {{subject}}", title: "New reply to a request", paragraphs: ["{{name}} ({{email}}) replied to the request “{{subject}}”:"], box: "{{message}}", button: "View the request" },
    fr: { name: "Réponse à une demande", subject: "Nouvelle réponse à la demande : {{subject}}", title: "Nouvelle réponse à une demande", paragraphs: ["{{name}} ({{email}}) a répondu à la demande « {{subject}} » :"], box: "{{message}}", button: "Voir la demande" },
  },
};

const FOOTER = {
  pt: "Este e-mail foi enviado automaticamente, por favor não responda.",
  es: "Este correo se envió automáticamente, por favor no responda.",
  en: "This e-mail was sent automatically, please do not reply.",
  fr: "Cet e-mail a été envoyé automatiquement, merci de ne pas répondre.",
};

// ---- MJML -------------------------------------------------------------------------------------------------------------------
function buildMjml(tpl, lang) {
  const x = tpl[lang];
  const paragraphs = x.paragraphs.map((p) => `<mj-text>${p}</mj-text>`).join("\n        ");
  // Caixa com um código (recuperação ou verificação do login): centrado, grande e espaçado
  const isCodeBox = x.box === "{{code}}" || x.box === "{{login_code}}";
  const boxTitle = x.boxTitle ? `<mj-text font-size="12px" color="#8A8D98" padding-bottom="0">${x.boxTitle}</mj-text>` : "";
  const box = x.box
    ? `<mj-section background-color="#ffffff" padding="0 24px 12px"><mj-column background-color="#F6F7FB" border-radius="10px" padding="14px 18px">${boxTitle}<mj-text align="${isCodeBox ? "center" : "left"}" ${isCodeBox ? `font-size="30px" font-weight="700" letter-spacing="4px" color="${BRAND}"` : `font-size="14px" font-style="italic" color="#3b4258"`}>${x.box}</mj-text></mj-column></mj-section>`
    : "";
  // Texto opcional depois da caixa (ex.: validade do código de verificação); os templates sem `after` ficam iguais
  const after = x.after
    ? `<mj-section background-color="#ffffff" padding="0 24px 8px"><mj-column>${x.after.map((p) => `<mj-text font-size="13px" color="#5b6275">${p}</mj-text>`).join("")}</mj-column></mj-section>`
    : "";
  const button = x.button ? `<mj-section background-color="#ffffff" padding="0 24px 28px"><mj-column><mj-button background-color="${BRAND}" color="#ffffff" border-radius="6px" font-weight="600" href="{{url}}">${x.button}</mj-button></mj-column></mj-section>` : `<mj-section background-color="#ffffff" padding="0 24px 12px"><mj-column><mj-spacer height="8px"></mj-spacer></mj-column></mj-section>`;
  return `<mjml>
  <mj-head>
    <mj-font name="Poppins" href="https://fonts.googleapis.com/css?family=Poppins:300,400,500,600,700"></mj-font>
    <mj-attributes>
      <mj-all font-family="${BODY_FONT}"></mj-all>
      <mj-text font-size="15px" color="#333333" line-height="1.6"></mj-text>
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#F4F5F7" width="600px">
    <mj-section background-color="${BRAND}" padding="20px 24px"><mj-column><mj-text font-family="${HEADING_FONT}" font-size="20px" font-weight="700" color="#ffffff" padding="0">Bial Regional Academy</mj-text></mj-column></mj-section>
    <mj-section background-color="#ffffff" padding="28px 24px 8px"><mj-column>
        <mj-text font-family="${HEADING_FONT}" font-size="22px" font-weight="700" color="${BRAND}">${x.title}</mj-text>
        ${paragraphs}
    </mj-column></mj-section>
    ${box}${after}
    ${button}
    <mj-section background-color="#F4F5F7" padding="20px 24px"><mj-column><mj-text align="center" font-size="12px" color="#8A8D98" line-height="1.6">Bial Regional Academy<br/>${FOOTER[lang]}</mj-text></mj-column></mj-section>
  </mj-body>
</mjml>`;
}

// ---- Geração ------------------------------------------------------------------------------------------------------------------
const defaults = {};
const rows = [];
for (const [type, tpl] of Object.entries(T)) {
  for (const [idLang, lang] of Object.entries(LANGS)) {
    const x = tpl[lang];
    const mjml = buildMjml(tpl, lang);
    const { html } = mjml2html(mjml, { validationLevel: "skip", minify: false });
    const key = `${type}_${idLang}`;
    // Só o que o servidor precisa para enviar (o MJML fica no design que vai para a BD)
    defaults[key] = { name: x.name, subject: x.subject, html, id_lang: Number(idLang) };
    rows.push({ key, type, since: tpl.since || null, name: x.name, subject: x.subject, design: JSON.stringify({ editor: "grapes", mjml }), html: JSON.stringify(html), idLang });
  }
}

fs.writeFileSync(path.join(root, "server", "utils", "defaultEmailTemplates.json"), JSON.stringify(defaults));

// Escape de strings SQL (MySQL/MariaDB): barras, aspas e caracteres de controlo
const sql = (value) =>
  `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\0/g, "\\0")}'`;

const lines = [
  "-- Templates automáticos da plataforma (registo recebido, conta aprovada/não aprovada, acesso à conta, password alterada, pedido recebido,",
  "-- resposta ao pedido, mensagem de contacto recebida/nova curso concluído e resposta ao formulário de contacto), em pt, es, en e fr. Gerado por webapp/scripts/generate-email-templates.mjs.",
  "-- Aditivo: só acrescenta o que falta (não altera templates existentes) e pode repetir-se sem estragar nada. Depois editam-se em E-mail > Templates.",
  "",
];
for (const r of rows.filter((row) => !row.since)) {
  lines.push(
    `INSERT INTO \`email_template\` (\`name\`, \`name_key\`, \`subject\`, \`design\`, \`html\`, \`id_lang\`, \`is_active\`, \`can_delete\`) SELECT ${sql(r.name)}, ${sql(r.key)}, ${sql(r.subject)}, ${sql(r.design)}, ${sql(r.html)}, ${r.idLang}, 1, 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM \`email_template\` WHERE \`name_key\` = ${sql(r.key)});`,
  );
}
fs.writeFileSync(path.join(root, "server", "database", "migrations", "2026-10-07-email-templates.sql"), lines.join("\n") + "\n");

// Acrescentados depois: um migração própria (a anterior já foi aplicada). INSERT só do que falta; e o "recover", que já existia no editor antigo
// (Unlayer), passa para o editor novo (só os que ainda estão no editor antigo, por isso repetir não estraga o que se editou depois).
const later = [
  "-- E-mails da equipa (novo registo, novo pedido, resposta a um pedido) e recuperação de password no editor novo, em pt, es, en e fr.",
  "-- Gerado por webapp/scripts/generate-email-templates.mjs. Os que faltam são criados; os templates de recuperação que ainda estão no editor antigo",
  "-- (Unlayer, com texto de outro projeto) passam para o novo. Os que já estão no editor novo não são alterados. Pode repetir-se.",
  "",
];
for (const r of rows.filter((row) => row.since)) {
  later.push(
    `INSERT INTO \`email_template\` (\`name\`, \`name_key\`, \`subject\`, \`design\`, \`html\`, \`id_lang\`, \`is_active\`, \`can_delete\`) SELECT ${sql(r.name)}, ${sql(r.key)}, ${sql(r.subject)}, ${sql(r.design)}, ${sql(r.html)}, ${r.idLang}, 1, 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM \`email_template\` WHERE \`name_key\` = ${sql(r.key)});`,
  );
  if (r.type === "recover") {
    later.push(
      `UPDATE \`email_template\` SET \`name\` = ${sql(r.name)}, \`subject\` = ${sql(r.subject)}, \`design\` = ${sql(r.design)}, \`html\` = ${sql(r.html)} WHERE \`name_key\` = ${sql(r.key)} AND (\`design\` IS NULL OR \`design\` NOT LIKE '%"editor":"grapes"%');`,
    );
  }
}
fs.writeFileSync(path.join(root, "server", "database", "migrations", "2026-10-12-team-email-templates.sql"), later.join("\n") + "\n");

// As variáveis de cada tipo e o endereço que o botão usa (o servidor e o backoffice usam esta lista)
fs.writeFileSync(path.join(root, "server", "utils", "emailTypes.json"), JSON.stringify(Object.fromEntries(Object.entries(T).map(([type, tpl]) => [type, { vars: tpl.vars, link: tpl.link || null }])), null, 2) + "\n");
console.log(`Gerados ${rows.length} templates (${Object.keys(T).length} tipos x ${Object.keys(LANGS).length} línguas)`);
