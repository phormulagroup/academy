import { defineConfig } from "vitest/config";

// Testes das regras puras da webapp (estado dos cursos e testes, sessão). Sem DOM: os que precisam do localStorage usam um substituto.
export default defineConfig({
  // Os componentes usam JSX sem importar o React
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
