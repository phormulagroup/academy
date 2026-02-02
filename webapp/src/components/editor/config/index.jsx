import "@puckeditor/core/puck.css";

import Grid from "./components/grid";

const config = {
  categories: {
    layout: { label: "Layout" },
    content: { label: "Conteúdo" },
    media: { label: "Media" },
    advanced: { label: "Avançado" },
  },
  components: {
    Grid,
  },
};

export default config;
