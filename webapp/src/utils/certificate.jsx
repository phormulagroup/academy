import React, { useRef } from "react";
import html2pdf from "html2pdf.js";

const certificate = {
  generate: async (data) => {
    // Criar um container invisível para renderizar o HTML

    const waitForImages = (root) => {
      const imgs = Array.from(root.querySelectorAll("img"));
      const promises = imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res, rej) => {
          img.addEventListener("load", res, { once: true });
          img.addEventListener("error", () => res(), { once: true }); // não bloquear
        });
      });
      return Promise.all(promises);
    };

    // 1) Criar wrapper fora da tela, mas renderizável
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.zIndex = "-1";
    // Dimensão base A4 @ ~96dpi (largura 794px) para melhor rasterização
    wrapper.style.width = "794px";
    wrapper.style.background = "white";
    wrapper.setAttribute("id", "pdf-wrapper");

    // 2) Injetar estilos que ajudam o html2canvas
    const style = document.createElement("style");
    style.innerHTML = `
      #pdf-wrapper, #pdf-wrapper * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      /* Evitar quebras estranhas dentro de blocos */
      .avoid-break { break-inside: avoid; page-break-inside: avoid; }
      .page-break { break-before: page; page-break-before: always; }
      /* Garantir que o wrapper tenha altura do conteúdo */
      #pdf-wrapper { position: fixed; }
    `;
    wrapper.appendChild(style);

    // 3) Fundo com <img> absoluto (mais fiável que CSS background)
    if (data.background) {
      const bg = document.createElement("img");
      bg.src = data.background;
      bg.alt = "";
      bg.style.position = "absolute";
      bg.style.left = "0";
      bg.style.top = "0";
      bg.style.width = "100%";
      bg.style.height = "100%";
      bg.style.objectFit = "cover";
      bg.style.zIndex = "0";
      bg.setAttribute("crossorigin", "anonymous");
      wrapper.appendChild(bg);
    }

    // 4) Conteúdo
    const content = document.createElement("div");
    content.innerHTML = data.text;
    content.style.position = "relative";
    content.style.zIndex = "1";
    content.style.padding = "24px"; // margens internas
    wrapper.appendChild(content);

    document.body.appendChild(wrapper);

    try {
      // 5) Esperar fonts + imagens
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch (_) {}
      }
      await waitForImages(wrapper);

      // 6) Opções html2pdf
      const opt = {
        margin: [10, 10, 10, 10], // mm
        filename: data.fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: Math.max(2, window.devicePixelRatio || 2),
          useCORS: true,
          backgroundColor: null,
          logging: true, // ver consola para erros
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().from(wrapper).set(opt).save();
    } finally {
      document.body.removeChild(wrapper);
    }
  },
};

export default certificate;
