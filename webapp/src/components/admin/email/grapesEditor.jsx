import "grapesjs/dist/css/grapes.min.css";
import "./grapesEditor.css";
import grapesjs from "grapesjs";
import grapesjsMjml from "grapesjs-mjml";
import ptMessages from "grapesjs/locale/pt";
import esMessages from "grapesjs/locale/es";
import frMessages from "grapesjs/locale/fr";
import mjmlPt from "grapesjs-mjml/locale/pt";
import mjmlEs from "grapesjs-mjml/locale/es";
import mjmlFr from "grapesjs-mjml/locale/fr";
import axios from "axios";
import { Input, Modal } from "antd";
import { useConfirm } from "../confirmModal";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Media from "../media/media";
import TemplateLibrary from "./templateLibrary";
import endpoints from "../../../utils/endpoints";
import { toastRef } from "../../../utils/notify";
import config from "../../../utils/config";
import { VARIABLES } from "../../../utils/emailTemplates";
import { FONT_CHOICES } from "../../../utils/emailFonts";
import { starterMjml, emailBlocks, ensureBrandFonts } from "./grapesBlocks";

const IMAGE_TYPES = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const MEDIA_KEY = "emailImage";

// Ícones SVG (traço) para os botões do editor, que não usam a fonte de ícones do GrapesJS
const svg = (path) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto">${path}</svg>`;
const ICON_TEMPLATES = svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>');
const ICON_SAVE_TEMPLATE = svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8"/>');
const ICON_BOOKMARK = svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>');
const SECTION_TYPES = ["mj-section", "mj-wrapper", "mj-hero"];

// Editor de e-mails (GrapesJS + MJML). O MJML compila para HTML compatível com Outlook, Gmail, etc. (tabelas, estilos em linha).
// O que se guarda: `design` (o projeto do GrapesJS, marcado com editor: "grapes") e `html` (o resultado compilado).
// `variables`: as variáveis do tipo de e-mail ({{name}}...), disponíveis como blocos e na barra do texto.
// `onChange`: chamado quando o utilizador altera o desenho (nunca ao carregar).
// A lista de tipos de letra do painel de estilos: as fontes da marca primeiro e depois as seguras para e-mail
function setFontChoices(editor) {
  const prop = editor.StyleManager.getSectors({ array: true })
    .flatMap((sector) => sector.getProperties())
    .find((p) => p.getId() === "font-family");
  if (prop) prop.set("options", FONT_CHOICES);
}

const GrapesEditor = forwardRef(function GrapesEditor({ design, variables = [], height = "max(700px, calc(100vh - 180px))", canEdit = true, offerTemplates = false, onReady, onChange }, ref) {
  const { t, i18n } = useTranslation();
  const container = useRef(null);
  const editorRef = useRef(null);
  const pickerRef = useRef(null);
  // Bloco de HTML: o componente que se está a editar e o código
  const [htmlEdit, setHtmlEdit] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);
  // Galeria e biblioteca da equipa; e o pedido de nome ao guardar um bloco ou um modelo
  const [library, setLibrary] = useState({ open: false, start: false });
  const [confirm, confirmHolder] = useConfirm();
  const [saveItem, setSaveItem] = useState(null); // { kind, component?, name }
  const [isSavingItem, setIsSavingItem] = useState(false);
  const offerTemplatesRef = useRef(offerTemplates);
  const refreshBlocksRef = useRef(() => {});
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    // { design, html, errors }: html compilado a partir do MJML atual
    getContent() {
      const editor = editorRef.current;
      if (!editor) return null;
      const { html, errors } = editor.runCommand("mjml-code-to-html") || {};
      return { design: { editor: "grapes", project: editor.getProjectData() }, html, errors: errors || [] };
    },
  }));

  useEffect(() => {
    const editor = grapesjs.init({
      container: container.current,
      height,
      width: "100%",
      fromElement: false,
      storageManager: false,
      plugins: [grapesjsMjml],
      // columnsPadding "0": com o padding por omissão (10px 0) cada coluna ocupa mais 10px por cima e por baixo do texto, e ao passar o rato
      // pelo texto o destaque mostrava a coluna ao lado/abaixo
      pluginsOpts: { [grapesjsMjml]: { resetBlocks: true, useCustomTheme: false, i18n: { pt: mjmlPt, es: mjmlEs, fr: mjmlFr }, columnsPadding: "0", imagePlaceholderSrc: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23E9EDF5'/%3E%3C/svg%3E" } },
      // As imagens escolhem-se na biblioteca de Multimédia da plataforma (que também permite carregar novas): o GrapesJS só abre o
      // nosso seletor e recebe de volta o ficheiro escolhido
      assetManager: {
        custom: {
          open: (props) => {
            pickerRef.current = props;
            setIsOpenMedia(true);
          },
          close: () => setIsOpenMedia(false),
        },
      },
      // Os painéis do editor (Dimensões, Tipografia...) seguem o idioma da plataforma
      i18n: { locale: (i18n.language || "en").slice(0, 2), localeFallback: "en", messages: { pt: ptMessages, es: esMessages, fr: frMessages } },
    });
    editorRef.current = editor;
    if (import.meta.env.DEV) window.__gjs = editor; // só em desenvolvimento: facilita testar o editor

    emailBlocks(editor, t);

    // Blocos guardados pela equipa: aparecem no painel de blocos, no grupo "Blocos guardados"
    const loadSavedBlocks = () =>
      axios
        .get(endpoints.emailLibrary.read, { params: { kind: "block" } })
        .then((res) => {
          editor.Blocks.getAll().models.filter((b) => String(b.getId()).startsWith("saved-")).forEach((b) => editor.Blocks.remove(b.getId()));
          (res.data.rows || []).forEach((row) => editor.Blocks.add(`saved-${row.id}`, { label: row.name, media: ICON_BOOKMARK, category: { id: "Saved", label: t("Saved blocks"), open: true }, content: row.content, select: true }));
        })
        .catch(() => {});
    refreshBlocksRef.current = loadSavedBlocks;
    loadSavedBlocks();

    // Guardar o que está selecionado como bloco (secções) e o e-mail todo como modelo
    editor.Commands.add("save-block", { run: (ed) => setSaveItem({ kind: "block", component: ed.getSelected(), name: "" }) });
    editor.Commands.add("save-template", { run: () => setSaveItem({ kind: "template", name: "" }) });
    editor.Commands.add("open-templates", { run: () => setLibrary({ open: true, start: false }) });
    editor.on("component:selected", (component) => {
      if (!canEditRef.current || !SECTION_TYPES.includes(component?.get("type"))) return;
      const toolbar = component.get("toolbar") || [];
      if (!toolbar.some((item) => item.command === "save-block")) component.set("toolbar", [{ label: ICON_BOOKMARK, attributes: { title: t("Save as block") }, command: "save-block" }, ...toolbar]);
    });

    // Bloco de HTML: edita-se num modal de código (botão "</>" na barra do componente, ou logo que o bloco é largado)
    const isHtmlBlock = (component) => component?.get?.("type") === "mj-text" && String(component.getAttributes()["css-class"] || "").includes("html-block");
    const editHtml = (component) => component && setHtmlEdit({ component, code: component.components().map((c) => c.toHTML()).join("") });
    editor.Commands.add("edit-html", { run: (ed) => editHtml(ed.getSelected()) });
    editor.on("component:selected", (component) => {
      if (!isHtmlBlock(component)) return;
      const toolbar = component.get("toolbar") || [];
      if (!toolbar.some((item) => item.command === "edit-html")) component.set("toolbar", [{ attributes: { class: "fa fa-code", title: t("Edit HTML") }, command: "edit-html" }, ...toolbar]);
    });
    editor.on("block:drag:stop", (component, block) => {
      if (block?.getId?.() === "html") editHtml(isHtmlBlock(component) ? component : component?.findType?.("mj-text")?.find(isHtmlBlock));
    });

    // Variáveis: um seletor na barra do texto que insere {{variável}} onde está o cursor
    if (variables.length > 0) {
      const options = variables.map((key) => `<option value="{{${key}}}">${t(VARIABLES[key].label)}</option>`).join("");
      editor.RichTextEditor.add("variable", {
        icon: `<select class="gjs-variable-select" title="${t("Insert variable")}"><option value="">{ } ${t("Variable")}</option>${options}</select>`,
        event: "change",
        result: (rte, action) => {
          const select = action.btn.querySelector("select");
          if (select?.value) rte.insertHTML(select.value);
          if (select) select.value = "";
        },
        update: () => 0,
      });
    }

    const project = design?.project;
    if (project) editor.loadProjectData(project);
    // Os templates automáticos de origem trazem o MJML no design (design.mjml); os novos arrancam do modelo base
    else editor.setComponents(design?.mjml || starterMjml(t));

    // Só alterações feitas pelo utilizador contam: o contador volta a zero depois de carregar
    editor.on("load", () => {
      ensureBrandFonts(editor);
      setFontChoices(editor);
      // Sem as linhas tracejadas em todos os componentes: só se destaca o que está sob o rato (o botão do quadrado volta a mostrá-las)
      editor.Panels.getButton("options", "sw-visibility")?.set("active", false);
      editor.Commands.get("sw-visibility")?.stop(editor);
      editor.Commands.stop("open-sm");
      editor.runCommand("open-blocks");
      // Botões da barra de cima: galeria/biblioteca de modelos e guardar o e-mail como modelo
      editor.Panels.addButton("options", { id: "open-templates", label: ICON_TEMPLATES, command: "open-templates", togglable: false, attributes: { title: t("Templates and saved blocks") } });
      if (canEditRef.current) editor.Panels.addButton("options", { id: "save-template", label: ICON_SAVE_TEMPLATE, command: "save-template", togglable: false, attributes: { title: t("Save as template") } });
      // E-mail novo: escolher por onde começar
      if (offerTemplatesRef.current) setLibrary({ open: true, start: true });
      editor.UndoManager.clear();
      editor.getModel().set("changesCount", 0);
      editor.on("update", () => changeRef.current?.());
      onReady?.();
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  // Aplica um modelo da galeria (MJML) ou um guardado pela equipa (projeto). Fora do arranque pede confirmação: substitui o conteúdo.
  function applyTemplate(load) {
    const run = async () => {
      const editor = editorRef.current;
      if (!editor) return;
      try {
        await load(editor);
        ensureBrandFonts(editor);
        editor.UndoManager.clear();
        changeRef.current?.();
        setLibrary({ open: false, start: false });
      } catch (err) {
        console.error(err);
        toastRef.current?.error(err.response?.data?.message || t("Something went wrong, try again later."));
      }
    };
    if (library.start) return run();
    confirm({ title: t("Replace the current content?"), description: t("The e-mail you are editing is replaced by this template. You can undo it with Ctrl+Z"), tone: "warning", okText: t("Replace"), onOk: run });
  }
  const useBuiltIn = (mjml) => applyTemplate((editor) => editor.setComponents(mjml));
  const useSaved = (id) =>
    applyTemplate(async (editor) => {
      const res = await axios.get(endpoints.emailLibrary.readById, { params: { id } });
      editor.loadProjectData(JSON.parse(res.data.content));
    });

  async function submitSaveItem() {
    const editor = editorRef.current;
    const name = saveItem?.name?.trim();
    if (!editor || !name) return;
    setIsSavingItem(true);
    try {
      const isBlock = saveItem.kind === "block";
      const content = isBlock ? saveItem.component.toHTML() : JSON.stringify(editor.getProjectData());
      const html = isBlock ? null : editor.runCommand("mjml-code-to-html")?.html;
      await axios.post(endpoints.emailLibrary.create, { data: { kind: saveItem.kind, name, content, html } });
      toastRef.current?.success(isBlock ? t("Block saved for the team") : t("Template saved for the team"));
      if (isBlock) refreshBlocksRef.current();
      setSaveItem(null);
    } catch (err) {
      toastRef.current?.error(err.response?.data?.message || t("Something went wrong, try again later."));
    } finally {
      setIsSavingItem(false);
    }
  }

  function closeMedia(res) {
    const picker = pickerRef.current;
    setIsOpenMedia(false);
    pickerRef.current = null;
    const file = res?.[MEDIA_KEY];
    if (!picker || !file) return;
    if (!IMAGE_TYPES.test(file)) {
      toastRef.current?.error(t("The selected file is not an image."));
      return;
    }
    const src = `${config.server_ip}/media/${encodeURIComponent(file)}`;
    const editor = editorRef.current;
    const target = picker.options?.target || editor?.getSelected();
    if (target?.upValue) {
      // Propriedade de estilo (ex.: imagem de fundo de uma secção)
      target.upValue(`url(${src})`);
    } else if (["mj-image", "image"].includes(target?.get?.("type"))) {
      // Imagens do e-mail: no componente MJML o `src` (propriedade) atualiza o atributo
      target.set("src", src);
    } else {
      picker.select({ type: "image", src, name: file }, true);
    }
    editor?.AssetManager.add({ type: "image", src, name: file });
  }

  return (
    <>
      <div ref={container} />
      {confirmHolder}
      <Media mediaKey={MEDIA_KEY} fileType="image" open={isOpenMedia} close={closeMedia} />
      <TemplateLibrary open={library.open} start={library.start} canEdit={canEdit} onClose={() => setLibrary({ open: false, start: false })} onUseBuiltIn={useBuiltIn} onUseSaved={useSaved} onChanged={() => refreshBlocksRef.current()} />
      <Modal
        open={!!saveItem}
        title={saveItem?.kind === "block" ? t("Save as block") : t("Save as template")}
        okText={t("Save")}
        cancelText={t("Cancel")}
        okButtonProps={{ disabled: !saveItem?.name?.trim() }}
        confirmLoading={isSavingItem}
        onCancel={() => setSaveItem(null)}
        onOk={submitSaveItem}>
        <p className="text-[13px] text-[#8A8D98]">{saveItem?.kind === "block" ? t("The selected section becomes a block that the whole team can reuse in any e-mail") : t("The e-mail as it is now becomes a template that the whole team can start from")}</p>
        <Input autoFocus size="large" maxLength={255} placeholder={t("Name")} value={saveItem?.name} onChange={(e) => setSaveItem((prev) => ({ ...prev, name: e.target.value }))} onPressEnter={submitSaveItem} />
      </Modal>
      <Modal
        open={!!htmlEdit}
        title={t("HTML")}
        width={760}
        maskClosable={false}
        okText={t("Apply")}
        cancelText={t("Cancel")}
        onCancel={() => setHtmlEdit(null)}
        onOk={() => {
          htmlEdit.component.components(htmlEdit.code);
          editorRef.current?.select(htmlEdit.component);
          setHtmlEdit(null);
        }}>
        <p className="text-[13px] text-[#8A8D98]">{t("Write the HTML of this block. E-mail clients ignore scripts and most CSS, so use inline styles and simple tables")}</p>
        <Input.TextArea
          rows={14}
          value={htmlEdit?.code}
          onChange={(e) => setHtmlEdit((prev) => ({ ...prev, code: e.target.value }))}
          spellCheck={false}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
        />
      </Modal>
    </>
  );
});

export default GrapesEditor;
