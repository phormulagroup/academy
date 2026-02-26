import jsPDF from "jspdf";

const certificate = {
  generate: async (data, certificateData) => {
    function renderVariables(template, data) {
      return template.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
        return data[key] ?? "";
      });
    }

    const pdf = new jsPDF("landscape", "pt", "a4"); // A4 landscape

    const width = 842;
    const height = 595;

    pdf.addImage(data.background, "PNG", 0, 0, width, height);
    const textoFinal = renderVariables(data.text, certificateData);
    pdf.html(`<div style="width: 1400px; font-size: 24px; font-family: Arial, sans-serif; line-height: 1.35; letter-spacing: 0;color: #000;">${textoFinal}</div>`, {
      callback: function (doc) {
        doc.save(data.fileName);
      },
      x: 60,
      y: 140,
      autoPaging: "text",
    });
  },
};

export default certificate;
