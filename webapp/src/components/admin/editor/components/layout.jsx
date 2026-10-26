/**
 * Os campos de posição dentro de uma Grid/Flex pai (colunas ocupadas,
 * crescer, ordem, alinhamento próprio) passaram a ser acrescentados por
 * withStyle a todos os blocos, consoante o pai (ver buildAdvancedFields em
 * style.jsx) — e o CSS respetivo passou a funcionar também na página
 * publicada (antes só existia no editor, porque dependia do invólucro
 * `data-puck-component` que só o editor cria). Isto só mantém os valores
 * por omissão de cada bloco.
 */
export function withLayout(componentConfig) {
  return {
    ...componentConfig,
    defaultProps: {
      ...componentConfig.defaultProps,
      layout: {
        ...componentConfig.defaultProps?.layout,
      },
    },
  };
}
