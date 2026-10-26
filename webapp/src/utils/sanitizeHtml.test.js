// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitizeHtml";

describe("sanitizeHtml", () => {
  it("remove scripts, eventos e javascript: mas mantém o formato do editor", () => {
    const out = sanitizeHtml('<p><strong>Olá</strong> <em>mundo</em></p><script>alert(1)</script><img src="x.png" onerror="alert(2)"><a href="javascript:alert(3)">link</a>');
    expect(out).toContain("<strong>Olá</strong>");
    expect(out).toContain("<em>mundo</em>");
    expect(out).toContain('<img src="x.png">');
    expect(out).not.toMatch(/script|onerror|javascript:/i);
  });

  it("mantém listas, tabelas e imagens", () => {
    const html = "<ul><li>um</li></ul><table><tbody><tr><td>célula</td></tr></tbody></table><img src='/api/media/a.png' alt='a'>";
    const out = sanitizeHtml(html);
    expect(out).toContain("<li>um</li>");
    expect(out).toContain("<td>célula</td>");
    expect(out).toContain('src="/api/media/a.png"');
  });

  it("links com target ficam com rel noopener (sem acesso à página de origem)", () => {
    const out = sanitizeHtml('<a href="https://exemplo.pt" target="_blank">ir</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("remove iframes, formulários e estilos injetados", () => {
    const out = sanitizeHtml('<iframe src="https://mau.pt"></iframe><form action="https://mau.pt"><input name="x"></form><style>body{display:none}</style><p>ok</p>');
    expect(out).not.toMatch(/iframe|<form|<style/i);
    expect(out).toContain("<p>ok</p>");
  });

  it("valores vazios não rebentam", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null)).toBeNull();
    expect(sanitizeHtml(undefined)).toBeUndefined();
  });
});
