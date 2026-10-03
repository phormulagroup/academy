import { HEADING_FONT } from "../../../utils/emailFonts";
import { ACCENT, BRAND, HERO_BG, PLACEHOLDER, footerSection, headerSection, wrapMjml } from "./grapesBlocks";

// Modelos prontos da galeria (e-mails completos em MJML, com as cores e fontes da marca). Começa-se por um e depois edita-se tudo.
// `t`: tradução; os textos levam as variáveis {{name}} e {{email}}, preenchidas com os dados de cada destinatário ao enviar.
const title = (text, size = 26, color = BRAND) => `<mj-text font-family="${HEADING_FONT}" font-size="${size}px" font-weight="700" color="${color}" line-height="1.3">${text}</mj-text>`;
const button = (label, bg = BRAND) => `<mj-button background-color="${bg}" color="#ffffff" border-radius="6px" font-weight="600" href="https://">${label}</mj-button>`;
const white = (inner, padding = "28px 24px") => `<mj-section background-color="#ffffff" padding="${padding}"><mj-column>${inner}</mj-column></mj-section>`;
const row = (label, value) => `<tr><td style="padding:10px 0;color:#8A8D98;width:38%;border-bottom:1px solid #E5E7EB;">${label}</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #E5E7EB;">${value}</td></tr>`;

export const builtInTemplates = (t) => [
  {
    id: "welcome",
    name: t("Welcome"),
    description: t("Welcomes a person to the Academy with a button to access it"),
    mjml: wrapMjml(`${headerSection()}
    <mj-section background-color="${BRAND}" padding="10px 24px 40px"><mj-column>${title(t("Welcome to the Academy"), 30, "#ffffff")}<mj-text align="left" color="#E6EBF7">${t("Training made for you, wherever you are")}</mj-text></mj-column></mj-section>
    ${white(`<mj-text font-size="18px" font-weight="600" color="${BRAND}">${t("Hello")} {{name}},</mj-text><mj-text>${t("Your account is ready. Access the platform to see the courses available for you.")}</mj-text>${button(t("Access the platform"))}`)}
    ${footerSection(t)}`),
  },
  {
    id: "newsletter",
    name: t("Newsletter"),
    description: t("A banner, two articles with image and a footer with social links"),
    mjml: wrapMjml(`${headerSection()}
    <mj-section background-color="${BRAND}" background-url="${HERO_BG}" background-size="cover" background-repeat="no-repeat" padding="60px 24px"><mj-column>${title(t("Newsletter title"), 30, "#ffffff")}<mj-text align="left" color="#E6EBF7">{{name}}, ${t("here is what is new this month")}</mj-text></mj-column></mj-section>
    <mj-section background-color="#ffffff" padding="24px 24px 8px"><mj-column width="40%"><mj-image src="${PLACEHOLDER}" alt="" padding="0"></mj-image></mj-column><mj-column width="60%" vertical-align="middle">${title(t("First article"), 18)}<mj-text>${t("Write a short summary of the article here.")}</mj-text></mj-column></mj-section>
    <mj-section background-color="#ffffff" padding="8px 24px 24px"><mj-column width="40%"><mj-image src="${PLACEHOLDER}" alt="" padding="0"></mj-image></mj-column><mj-column width="60%" vertical-align="middle">${title(t("Second article"), 18)}<mj-text>${t("Write a short summary of the article here.")}</mj-text></mj-column></mj-section>
    ${white(`<mj-divider border-width="1px" border-color="#E5E7EB"></mj-divider><mj-social font-size="12px" icon-size="28px" mode="horizontal"><mj-social-element name="facebook" href="https://facebook.com"></mj-social-element><mj-social-element name="linkedin" href="https://linkedin.com"></mj-social-element><mj-social-element name="instagram" href="https://instagram.com"></mj-social-element></mj-social>`, "8px 24px 24px")}
    ${footerSection(t)}`),
  },
  {
    id: "new-course",
    name: t("New course"),
    description: t("Announces a course with its main details and a button to enrol"),
    mjml: wrapMjml(`${headerSection()}
    <mj-section background-color="${BRAND}" background-url="${HERO_BG}" background-size="cover" background-repeat="no-repeat" padding="70px 24px"><mj-column>${title(t("New course available"), 30, "#ffffff")}</mj-column></mj-section>
    ${white(`<mj-text font-size="18px" font-weight="600" color="${BRAND}">${t("Hello")} {{name}},</mj-text><mj-text>${t("A new course is now available on the Academy.")}</mj-text><mj-table>${row(t("Course"), t("Course name"))}${row(t("Duration"), "2h")}${row(t("Available from"), "01/01/2027")}</mj-table>${button(t("See the course"), ACCENT)}`)}
    ${footerSection(t)}`),
  },
  {
    id: "reminder",
    name: t("Reminder"),
    description: t("A short reminder with a highlighted box and a button"),
    mjml: wrapMjml(`${headerSection()}
    ${white(`<mj-text font-size="18px" font-weight="600" color="${BRAND}">${t("Hello")} {{name}},</mj-text><mj-text>${t("We would like to remind you of something important.")}</mj-text>`, "28px 24px 12px")}
    <mj-section background-color="#ffffff" padding="0 24px 24px"><mj-column background-color="#F6F7FB" border-radius="10px" padding="12px 16px"><mj-text align="center" font-size="16px" font-weight="600" color="${BRAND}">${t("Write the reminder here")}</mj-text>${button(t("Click here"))}</mj-column></mj-section>
    ${white(`<mj-text>${t("Best regards")},<br/><b>${t("The Bial Regional Academy team")}</b></mj-text>`, "0 24px 28px")}
    ${footerSection(t)}`),
  },
  {
    id: "announcement",
    name: t("Announcement"),
    description: t("A big title, an image, a text and a button"),
    mjml: wrapMjml(`${headerSection()}
    ${white(`${title(t("Your announcement"), 28)}<mj-image src="${PLACEHOLDER}" alt="" padding="12px 0"></mj-image><mj-text>${t("Write your text here")}</mj-text>${button(t("Read more"))}`, "32px 24px")}
    ${footerSection(t)}`),
  },
  {
    id: "event",
    name: t("Event invitation"),
    description: t("Invites to an event with date, time and place"),
    mjml: wrapMjml(`${headerSection()}
    <mj-section background-color="${BRAND}" background-url="${HERO_BG}" background-size="cover" background-repeat="no-repeat" padding="60px 24px"><mj-column>${title(t("You are invited"), 30, "#ffffff")}<mj-text color="#E6EBF7">${t("Event name")}</mj-text></mj-column></mj-section>
    ${white(`<mj-text>${t("Hello")} {{name}}, ${t("we would like to have you with us.")}</mj-text><mj-table>${row(t("Date"), "01/01/2027")}${row(t("Time"), "10:00")}${row(t("Place"), t("Place name"))}</mj-table>${button(t("Confirm attendance"), ACCENT)}`)}
    ${footerSection(t)}`),
  },
  {
    id: "congratulations",
    name: t("Congratulations"),
    description: t("Celebrates a person's achievement, such as finishing a course"),
    mjml: wrapMjml(`${headerSection()}
    <mj-section background-color="${ACCENT}" padding="40px 24px"><mj-column>${title(`${t("Congratulations")} {{name}}!`, 30, "#ffffff")}<mj-text align="center" color="#ffffff" font-size="16px">${t("You have completed the course.")}</mj-text></mj-column></mj-section>
    ${white(`<mj-text>${t("Thank you for your dedication. Your certificate is available on the platform.")}</mj-text>${button(t("See my certificate"))}`)}
    ${footerSection(t)}`),
  },
  {
    id: "plain",
    name: t("Simple message"),
    description: t("Just a greeting, your text and a signature"),
    mjml: wrapMjml(`${white(`<mj-text font-size="16px">${t("Hello")} {{name}},</mj-text><mj-text>${t("Write your text here")}</mj-text><mj-text>${t("Best regards")},<br/><b>${t("The Bial Regional Academy team")}</b></mj-text>`, "32px 24px")}
    ${footerSection(t)}`),
  },
];
