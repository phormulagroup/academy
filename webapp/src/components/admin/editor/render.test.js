// @vitest-environment jsdom
// O editor novo tem de continuar a mostrar os tópicos que já existem (carrossel de slides e vídeo Vimeo): conteúdo real de dois tópicos
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import carousel from "../../../utils/__fixtures__/topic-carousel.json";
import video from "../../../utils/__fixtures__/topic-video.json";

let Render;
let config;
beforeAll(async () => {
  // O Puck e alguns blocos usam APIs do browser que o jsdom não tem
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  ({ Render } = await import("@puckeditor/core"));
  ({ config } = await import("./config"));
});

const html = (data) => renderToString(createElement(Render, { config, data }));

describe("tópicos existentes no editor novo", () => {
  it("o carrossel de slides continua a ser mostrado, com as imagens", () => {
    const out = html(carousel);
    expect(out).toContain("swiper");
    const first = carousel.content[0].props.images[0].image.url;
    expect(out).toContain(first);
  });

  it("o vídeo continua a usar o player do Vimeo (o eLearning procura este iframe para obrigar a ver até ao fim)", () => {
    const out = html(video);
    expect(out).toMatch(/<iframe[^>]+src="https:\/\/player\.vimeo\.com\/video\/\d+/);
  });

  it("os dois blocos antigos e os novos blocos estão registados", () => {
    for (const name of ["Video", "ImageCarousel", "Text", "Heading", "Image", "Callout", "Accordion", "Tabs", "Timeline", "Table"]) {
      expect(config.components[name], name).toBeTruthy();
    }
    // blocos do CPR que não se aplicam à Academy não entram
    for (const name of ["Form", "Query", "Template", "SiteHero", "Embed"]) expect(config.components[name], name).toBeUndefined();
  });

  it("todas as categorias só apontam para blocos que existem", () => {
    for (const category of Object.values(config.categories)) {
      for (const name of category.components) expect(config.components[name], name).toBeTruthy();
    }
  });
});
