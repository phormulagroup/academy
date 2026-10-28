const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { createTransport, toBrevoAddresses } = require("../utils/mailTransport");

// Servidor falso da API da Brevo: guarda o último pedido e responde com o que o teste pedir
function fakeBrevo(respond) {
  const seen = {};
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen.headers = req.headers;
      seen.body = JSON.parse(raw);
      const { status, json } = respond(seen);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(json));
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, seen, url: `http://127.0.0.1:${server.address().port}/v3/smtp/email` })));
}

// O endpoint só se altera nos testes, por isso usa-se o transporte diretamente
const { brevoTransport } = require("../utils/mailTransport");
const nodemailer = require("nodemailer");

test("toBrevoAddresses lê 'Nome <email>', e-mails simples e listas", () => {
  assert.deepStrictEqual(toBrevoAddresses("Bial Academy <academy@bial.com>"), [{ email: "academy@bial.com", name: "Bial Academy" }]);
  assert.deepStrictEqual(toBrevoAddresses(["a@b.com", "c@d.com"]), [{ email: "a@b.com" }, { email: "c@d.com" }]);
  assert.deepStrictEqual(toBrevoAddresses(undefined), []);
});

test("envia pela API da Brevo com a chave e o conteúdo certos", async () => {
  const { server, seen, url } = await fakeBrevo(() => ({ status: 201, json: { messageId: "<abc@smtp-relay.mailin.fr>" } }));
  try {
    const transporter = nodemailer.createTransport(brevoTransport({ apiKey: "KEY123", endpoint: url }));
    const info = await transporter.sendMail({ from: "Bial Academy <academy@bial.com>", to: "maria@example.com", subject: "Olá", html: "<p>Oi</p>" });
    assert.strictEqual(info.messageId, "<abc@smtp-relay.mailin.fr>");
    assert.strictEqual(seen.headers["api-key"], "KEY123");
    assert.deepStrictEqual(seen.body.sender, { email: "academy@bial.com", name: "Bial Academy" });
    assert.deepStrictEqual(seen.body.to, [{ email: "maria@example.com" }]);
    assert.strictEqual(seen.body.subject, "Olá");
    assert.strictEqual(seen.body.htmlContent, "<p>Oi</p>");
  } finally {
    server.close();
  }
});

test("devolve a razão da Brevo quando recusa o envio", async () => {
  const { server, url } = await fakeBrevo(() => ({ status: 401, json: { code: "unauthorized", message: "Key not found" } }));
  try {
    const transporter = nodemailer.createTransport(brevoTransport({ apiKey: "BAD", endpoint: url }));
    await assert.rejects(transporter.sendMail({ from: "a@b.com", to: "c@d.com", subject: "x", text: "y" }), (err) => {
      assert.strictEqual(err.message, "Key not found");
      assert.strictEqual(err.code, "BREVO_unauthorized");
      assert.strictEqual(err.responseCode, 401);
      return true;
    });
  } finally {
    server.close();
  }
});

test("sem destinatário nem remetente não chama a API", async () => {
  const transporter = nodemailer.createTransport(brevoTransport({ apiKey: "K", endpoint: "http://127.0.0.1:1/x" }));
  await assert.rejects(transporter.sendMail({ from: "a@b.com", to: "", subject: "x", text: "y" }), /no recipient/);
});

test("createTransport escolhe o fornecedor pelas definições", () => {
  assert.strictEqual(createTransport({ provider: "brevo", brevo_api_key: "k", email: "a@b.com" }).transporter.name, "brevo-api");
  assert.strictEqual(createTransport({ host: "mail.x.com", port: "465", is_secure: true, email: "a@b.com", password: "p" }).transporter.name, "SMTP");
});
