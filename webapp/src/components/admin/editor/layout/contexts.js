import { createContext } from "react";

// Separador ativo do painel de propriedades (lido pelo wrapper dos campos).
export const TabContext = createContext("content");

// Quando o painel lateral já tem os separadores Conteúdo / Estilo / Avançado,
// diz ao campo `__design` (ver withTabs) que parte desenhar ("container" =
// disposição, "style", "layout" = avançado) em vez da sua própria navegação.
// Sem importar o config (tabsField é importado pelos blocos).
export const DesignPartContext = createContext(null);

// O que o canvas precisa de saber sobre o que se está a editar (kind =
// pages|news|templates, row = a linha) e o interruptor "Mostrar cabeçalho e
// rodapé" da barra de topo. Só o Editor os fornece; sem fornecedor o canvas
// não leva invólucro (o site público nunca passa por aqui).
export const CanvasContext = createContext(null);
export const CanvasChromeContext = createContext({ show: true, setShow: () => {} });
