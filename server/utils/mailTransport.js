const nodemailer = require("nodemailer");
const addressparser = require("nodemailer/lib/addressparser");
const https = require("https");
const http = require("http");

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

// "Nome <a@b.com>", "a@b.com", ou uma lista deles → [{ email, name? }]
function toBrevoAddresses(value) {
  const list = Array.isArray(value) ? value : [value];
  return list
    .flatMap((item) => (typeof item === "string" ? addressparser(item) : item ? [{ name: item.name, address: item.address }] : []))
    .filter((a) => a.address)
    .map((a) => (a.name ? { email: a.address, name: a.name } : { email: a.address }));
}

// Transporte do nodemailer que envia pela API da Brevo (HTTPS, chave `api-key`) em vez de SMTP. Como é um transporte normal, o registo de
// e-mails, as comunicações e os testes usam-no exatamente como usam o SMTP. `endpoint` só muda nos testes.
function brevoTransport({ apiKey, endpoint = BREVO_ENDPOINT, timeoutMs = 20000 }) {
  return {
    name: "brevo-api",
    version: "1",
    send(mail, callback) {
      const data = mail.data || {};
      const sender = toBrevoAddresses(data.from)[0];
      const to = toBrevoAddresses(data.to);
      if (!sender) return callback(Object.assign(new Error("The sender e-mail is not configured"), { code: "EENVELOPE" }));
      if (to.length === 0) return callback(Object.assign(new Error("The e-mail has no recipient"), { code: "EENVELOPE" }));

      const payload = { sender, to, subject: data.subject || "" };
      if (data.html) payload.htmlContent = String(data.html);
      if (data.text) payload.textContent = String(data.text);
      if (!payload.htmlContent && !payload.textContent) payload.textContent = " ";
      const body = JSON.stringify(payload);

      const url = new URL(endpoint);
      const req = (url.protocol === "http:" ? http : https).request(
        url,
        { method: "POST", headers: { "api-key": apiKey, accept: "application/json", "content-type": "application/json", "content-length": Buffer.byteLength(body) }, timeout: timeoutMs },
        (res) => {
          let raw = "";
          res.on("data", (chunk) => (raw += chunk));
          res.on("end", () => {
            let json = {};
            try {
              json = raw ? JSON.parse(raw) : {};
            } catch {
              // resposta sem JSON: fica o código HTTP
            }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              return callback(null, { messageId: json.messageId, response: `${res.statusCode} Brevo API`, accepted: to.map((a) => a.email), rejected: [] });
            }
            const reason = json.message || `Brevo API answered ${res.statusCode}`;
            callback(Object.assign(new Error(reason), { code: `BREVO_${json.code || res.statusCode}`, responseCode: res.statusCode, response: `${res.statusCode} ${reason}` }));
          });
        },
      );
      req.on("timeout", () => req.destroy(Object.assign(new Error("The Brevo API did not answer in time"), { code: "ETIMEDOUT" })));
      req.on("error", (err) => callback(err));
      req.end(body);
    },
  };
}

const isBrevo = (settings) => settings?.provider === "brevo";

// Cria o transporte das definições guardadas: SMTP (por omissão, como sempre foi) ou Brevo API. `options` acrescenta opções do nodemailer (tempos limite).
function createTransport(settings, options = {}) {
  if (isBrevo(settings)) return nodemailer.createTransport(brevoTransport({ apiKey: settings.brevo_api_key, timeoutMs: options.socketTimeout }));
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    // As definições SMTP guardam o campo como is_secure
    secure: settings.secure ?? settings.is_secure,
    auth: { user: settings.email, pass: settings.password },
    ...options,
  });
}

module.exports = { createTransport, brevoTransport, isBrevo, toBrevoAddresses };
