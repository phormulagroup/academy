import "grapesjs/dist/css/grapes.min.css";
import "./grapesEditor.css";
import grapesjs from "grapesjs";
import grapesjsMjml from "grapesjs-mjml";
import { Input, Modal } from "antd";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Media from "../media/media";
import { toastRef } from "../../../utils/notify";
import config from "../../../utils/config";
import { VARIABLES } from "../../../utils/emailTemplates";
import { FONT_CHOICES } from "../../../utils/emailFonts";
import { starterMjml, emailBlocks, ensureBrandFonts } from "./grapesBlocks";

const IMAGE_TYPES = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const MEDIA_KEY = "emailImage";

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

const GrapesEditor = forwardRef(function GrapesEditor({ design, variables = [], height = "max(700px, calc(100vh - 180px))", onReady, onChange }, ref) {
  const { t } = useTranslation();
  const container = useRef(null);
  const editorRef = useRef(null);
  const pickerRef = useRef(null);
  // Bloco de HTML: o componente que se está a editar e o código
  const [htmlEdit, setHtmlEdit] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);
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
      pluginsOpts: { [grapesjsMjml]: { resetBlocks: true, columnsPadding: "0", imagePlaceholderSrc: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23E9EDF5'/%3E%3C/svg%3E" } },
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
      i18n: { locale: "en" },
    });
    editorRef.current = editor;
    if (import.meta.env.DEV) window.__gjs = editor; // só em desenvolvimento: facilita testar o editor

    emailBlocks(editor, t);

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
    else editor.setComponents(starterMjml(t));

    // Só alterações feitas pelo utilizador contam: o contador volta a zero depois de carregar
    editor.on("load", () => {
      ensureBrandFonts(editor);
      setFontChoices(editor);
      // Sem as linhas tracejadas em todos os componentes: só se destaca o que está sob o rato (o botão do quadrado volta a mostrá-las)
      editor.Panels.getButton("options", "sw-visibility")?.set("active", false);
      editor.Commands.get("sw-visibility")?.stop(editor);
      editor.Commands.stop("open-sm");
      editor.runCommand("open-blocks");
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
      <Media mediaKey={MEDIA_KEY} fileType="image" open={isOpenMedia} close={closeMedia} />
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
