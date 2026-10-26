import { colorField, mediaField, sliderField, switchField } from "./core/fields";

// SEO do site: no painel "Página" mostram-se as colunas seo_* da página ou
// notícia (o siteEditor injeta os valores ao abrir e, ao guardar, envia-os
// para a BD e tira-os do JSON). `seoEnabled` (também só injetado) liga estes
// campos — nos modelos de cabeçalho/rodapé não fazem sentido e escondem-se.
const SEO_FIELDS = {
  seo_title: { type: "text", label: "Título SEO (vazio = título da página)" },
  seo_description: { type: "textarea", label: "Descrição SEO (ideal até 160 caracteres)" },
  seo_image: mediaField("Imagem de partilha (vazio = logótipo)"),
  seo_noindex: switchField("Não indexar nos motores de pesquisa"),
};

export const Root = {
  fields: {
    ...SEO_FIELDS,
    blockGap: sliderField("Espaço entre blocos", { min: 0, max: 96, suffix: "px" }),
    pageBackground: colorField("Cor de fundo da página"),
  },
  defaultProps: {
    blockGap: 24,
  },
  resolveFields: (data, { fields }) => {
    if (data?.props?.seoEnabled) return fields;
    const rest = { ...fields };
    for (const key of Object.keys(SEO_FIELDS)) delete rest[key];
    return rest;
  },
  // Espaço entre os blocos de topo (como o espaçamento por omissão entre
  // widgets do Elementor) — sem isto, ficavam colados uns aos outros.
  render: ({ blockGap, pageBackground, puck: { renderDropZone: DropZone } }) => {
    // Sem minHeight: 100vh de propósito — isto nunca é uma página standalone
    // nesta app, é sempre conteúdo de um tópico, desenhado dentro de um
    // painel de altura limitada e com scroll próprio (editor do admin,
    // pré-visualização, e a tab "Curso" no /learning do aluno). Com
    // minHeight: 100vh, um tópico com pouco conteúdo ficava sempre a ocupar
    // o ecrã inteiro, com espaço vazio a mais no fundo.
    return (
      // .el-root-content: âmbito usado pelo bloco "Índice" para procurar os
      // títulos da lição (só dentro do conteúdo, nunca no resto da app).
      <div className="el-root-content" style={{ display: "flex", flexDirection: "column", background: pageBackground || undefined }}>
        <DropZone zone="default-zone" style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: `${blockGap ?? 24}px` }} />
      </div>
    );
  },
};

export default Root;
