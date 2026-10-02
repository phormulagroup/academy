import i18n from "./i18n";

// Toasts da aplicação: um só componente (toastApi, no contexto) que mostra cartões de notificação do antd, com barra de
// progresso. Aceita .success/.error/.warning/.info(texto) ou .open({ type, content, key, duration }), por isso quem o chama
// só tem de passar uma frase (já traduzida): daqui sai um título curto e uma descrição.

function isDialogOpen() {
  if (document.querySelector(".ant-drawer-open")) return true;
  return [...document.querySelectorAll(".ant-modal-wrap")].some((el) => getComputedStyle(el).display !== "none");
}

// Com uma gaveta ou janela aberta o toast vai para o canto, para não tapar o formulário
const resolvePlacement = (explicit) => explicit ?? (isDialogOpen() ? "topLeft" : "top");

const TYPE_COLOR = { success: "#1fb26a", error: "#ff4d4f" };

const GENERIC_TITLE = {
  success: "Done",
  error: "Could not complete",
  warning: "Attention",
  info: "Information",
};

// Título curto + detalhe na mesma frase ("Título. Detalhe." ou "Título: detalhe"): a 1.ª parte é o título e o resto a descrição
const SPLIT_PATTERN = /^(.{8,120}?)(?:[.!?:]\s+|\s+[—–]\s+)(\S[\s\S]*)$/;
const withPeriod = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function describeToast(type, content) {
  if (typeof content !== "string") return { title: content };
  const text = content.trim();
  if (!text) return { title: content };

  const parts = text.match(SPLIT_PATTERN);
  if (parts) return { title: parts[1], description: withPeriod(capitalize(parts[2])) };

  // Frase única: título genérico do tipo e a própria frase como descrição (nunca se inventam factos)
  return { title: i18n.t(GENERIC_TITLE[type] || GENERIC_TITLE.info), description: text };
}

export function createToastApi(notificationApi) {
  function show(type, content, options = {}) {
    const opts = typeof options === "string" ? { description: options } : options;
    const derived = opts.description !== undefined ? { title: content } : describeToast(type, content);
    notificationApi[type]({
      title: derived.title,
      description: derived.description,
      showProgress: true,
      pauseOnHover: true,
      styles: TYPE_COLOR[type] ? { icon: { color: TYPE_COLOR[type] } } : undefined,
      ...opts,
      placement: resolvePlacement(opts.placement),
    });
  }

  return {
    success: (content, options) => show("success", content, options),
    error: (content, options) => show("error", content, options),
    warning: (content, options) => show("warning", content, options),
    info: (content, options) => show("info", content, options),
    open: ({ type = "info", content, ...rest }) => show(type, content, rest),
  };
}

// Referência para código fora de componentes (ex.: utils/certificate.jsx), preenchida pelo contexto
export const toastRef = { current: null };
