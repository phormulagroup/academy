const fetch = require("node-fetch").default;

module.exports = {
  login: function (data) {
    return new Promise(async (resolve, reject) => {
      const url = "https://api.brevo.com/v3/smtp/email";
      const options = {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },

        body: JSON.stringify({
          subject: "Phormula Share | Código para efetuar o seu login",
          sender: { name: "Phormula Group", email: "secretariado@phormulagroup.com" },
          to: [{ email: data.email, name: data.name }],
          templateId: 2175,
          params: {
            name: data.name,
            email: data.email,
            code: data.code,
          },
        }),
      };

      fetch(url, options)
        .then((res) => res.json())
        .then((json) => resolve(json))
        .catch((err) => reject({ error: err }));
    });
  },

  generatePassword: function (data) {
    return new Promise(async (resolve, reject) => {
      const url = "https://api.brevo.com/v3/smtp/email";
      const options = {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },

        body: JSON.stringify({
          subject: "Phormula Share | Bem-vindo!",
          sender: { name: "Phormula Group", email: "secretariado@phormulagroup.com" },
          to: [{ email: data.email, name: data.name }],
          templateId: 2174,
          params: {
            name: data.name,
            email: data.email,
            generatePasswordUrl: `https://share.phormuladev.com/gerar-password?t=${data.token}`,
          },
        }),
      };

      fetch(url, options)
        .then((res) => res.json())
        .then((json) => resolve(json))
        .catch((err) => reject({ error: err }));
    });
  },
};
