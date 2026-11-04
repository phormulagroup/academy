// Honeypot: o formulário tem um campo escondido que uma pessoa nunca preenche e um robô que preenche tudo preenche. Se vier preenchido, o pedido
// é ignorado mas a resposta parece um sucesso (o robô não aprende que foi apanhado) e nada é gravado nem enviado.
const FIELD = "hp_company";

// fakeResponse: o que o formulário espera numa resposta de sucesso (para o robô não ver diferença)
const honeypot = (fakeResponse) => (req, res, next) => {
  const data = req.body?.data;
  if (data && typeof data === "object" && !Array.isArray(data) && FIELD in data) {
    const filled = String(data[FIELD] ?? "").trim() !== "";
    delete data[FIELD];
    if (filled) {
      console.warn(`[honeypot] ${req.method} ${req.originalUrl} ignorado (campo escondido preenchido)`);
      return res.send(fakeResponse);
    }
  }
  next();
};

module.exports = { honeypot, FIELD };
