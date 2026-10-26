import { defineConfig } from "vitest/config";

// Testes das regras puras da webapp (estado dos cursos e testes, sessão). Sem DOM: os que precisam do localStorage usam um substituto.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
