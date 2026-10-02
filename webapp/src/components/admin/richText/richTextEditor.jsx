import "react-quill-new/dist/quill.snow.css";

import { Button, Input, Modal, message } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuRedo2, LuUndo2 } from "react-icons/lu";
import ReactQuill, { Quill } from "react-quill-new";

import config from "../../../utils/config";
import Media from "../media/media";
import {
  BASIC_FORMATS,
  RAW_HTML_CLASS,
  defaultTableHtml,
  fromEditorHtml,
  toEditorHtml,
} from "./quillSetup";

const Delta = Quill.import("delta");

// Largura máxima inicial das imagens inseridas (mantém a proporção)
const DEFAULT_IMAGE_WIDTH = 600;
const MEDIA_KEY = "editorImage";
const IMAGE_REGEX = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const HEADER_LEVELS = [1, 2, 3, 4, 5, 6];

function defaultImageSize(url) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const width = Math.min(img.naturalWidth, DEFAULT_IMAGE_WIDTH);
      resolve({ width: String(width), height: String(Math.round((img.naturalHeight * width) / img.naturalWidth)) });
    };
    img.onerror = () => resolve({});
    img.src = url;
  });
}

/**
 * Editor de texto rico (Quill). O valor é uma string HTML (vazio = "").
 * - richMedia: imagens da biblioteca de Multimédia (guardadas como src="/media/<ficheiro>"), tabelas,
 *   índice e expoente (ex.: Livro de Objecções).
 * - Compatível com Form.Item do antd (value/onChange).
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  richMedia = false,
  readOnly = false,
  status,
  className = "",
}) {
  const { t } = useTranslation();
  const quillRef = useRef(null);
  // A toolbar é passada como elemento (num Drawer/Modal o portal ainda não está no documento ao montar)
  const [toolbarEl, setToolbarEl] = useState(null);
  // Último valor enviado ao Form e o HTML do editor que lhe corresponde (evita repor o conteúdo a cada tecla)
  const lastRef = useRef({ out: undefined, raw: undefined });
  const valueRef = useRef(value);
  const rangeRef = useRef(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);
  const [tableEdit, setTableEdit] = useState(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const getQuill = () => quillRef.current?.getEditor();

  const editorValue =
    lastRef.current.raw !== undefined && value === lastRef.current.out
      ? lastRef.current.raw
      : toEditorHtml(value, richMedia);

  function handleChange(raw, _delta, source, editor) {
    const out = editor.getLength() <= 1 ? "" : fromEditorHtml(raw, richMedia);
    // Alterações feitas pelo próprio componente (carregar/repor o valor) não alteram o Form
    if (source !== "user") {
      lastRef.current = { out: valueRef.current, raw };
      return;
    }
    lastRef.current = { out, raw };
    onChange?.(out);
  }

  // Os handlers da toolbar são criados uma vez (modules estável); chamam sempre a versão atual
  const handlersRef = useRef({});
  handlersRef.current = {
    image() {
      rangeRef.current = getQuill()?.getSelection(true) ?? null;
      setIsOpenMedia(true);
    },
    table() {
      const quill = getQuill();
      if (!quill) return;
      const index = quill.getSelection(true)?.index ?? quill.getLength() - 1;
      const html = defaultTableHtml(t("Title"), t("Text"));
      quill.insertEmbed(index, "rawHtml", html, "user");
      // O bloco pode ficar depois do índice (quando parte uma linha): usa o bloco de tabela mais próximo
      const blot = quill.scroll
        .descendants((b) => b.statics?.blotName === "rawHtml")
        .sort((a, b) => Math.abs(quill.getIndex(a) - index) - Math.abs(quill.getIndex(b) - index))[0];
      if (!blot) return;
      quill.setSelection(quill.getIndex(blot) + 1, 0, "silent");
      setTableEdit({ blot, html: blot.domNode.innerHTML });
    },
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: toolbarEl,
        handlers: {
          undo() {
            this.quill.history.undo();
          },
          redo() {
            this.quill.history.redo();
          },
          image: () => handlersRef.current.image(),
          table: () => handlersRef.current.table(),
        },
      },
      history: { delay: 800, maxStack: 100, userOnly: true },
      // Sem imagens em base64 (arrastar/colar ficheiros): as imagens vêm da biblioteca de Multimédia
      uploader: { handler: () => {} },
    }),
    [toolbarEl],
  );

  // Traduções do tooltip de links do tema "snow" (o texto vem de atributos lidos no CSS)
  useEffect(() => {
    const tooltip = quillRef.current?.getEditor()?.theme?.tooltip?.root;
    if (!tooltip) return;
    tooltip.setAttribute("data-visit", t("Visit URL:"));
    tooltip.setAttribute("data-enter", t("Enter link:"));
    const action = tooltip.querySelector("a.ql-action");
    action?.setAttribute("data-edit", t("Edit"));
    action?.setAttribute("data-save", t("Save"));
    tooltip.querySelector("a.ql-remove")?.setAttribute("data-remove", t("Remove"));
    tooltip.querySelector("input[type=text]")?.setAttribute("data-link", "https://");
  }, [t, toolbarEl]);

  // Duplo clique numa tabela: editar o HTML
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill || !richMedia) return;
    const onDblClick = (event) => {
      const node = event.target.closest?.(`.${RAW_HTML_CLASS}`);
      if (!node || !quill.isEnabled()) return;
      const blot = Quill.find(node);
      if (!blot) return;
      setTableEdit({ blot, html: node.innerHTML });
    };
    quill.root.addEventListener("dblclick", onDblClick);
    return () => quill.root.removeEventListener("dblclick", onDblClick);
  }, [richMedia, toolbarEl]);

  async function closeMedia(res) {
    setIsOpenMedia(false);
    const file = res?.[MEDIA_KEY];
    const quill = getQuill();
    if (!file || !quill) return;
    if (!IMAGE_REGEX.test(file)) {
      message.error(t("The selected file is not an image."));
      return;
    }
    const url = `${config.server_ip}/media/${file}`;
    const size = await defaultImageSize(url);
    const index = rangeRef.current?.index ?? quill.getLength() - 1;
    quill.updateContents(
      new Delta().retain(index).insert({ image: url }, { alt: file.replace(/\.[^.]+$/, ""), ...size }),
      "user",
    );
    quill.setSelection(index + 1, 0, "silent");
  }

  function saveTable(html) {
    const quill = getQuill();
    if (quill && tableEdit?.blot.domNode.isConnected) {
      const delta = new Delta().retain(quill.getIndex(tableEdit.blot)).delete(1);
      quill.updateContents(html?.trim() ? delta.insert({ rawHtml: html.trim() }) : delta, "user");
    }
    setTableEdit(null);
  }

  return (
    <div
      className={`rich-text-editor ${status === "error" ? "rich-text-editor-error" : ""} ${
        readOnly ? "rich-text-editor-readonly" : ""
      } ${className}`}>
      <div ref={setToolbarEl} className={readOnly ? "hidden!" : ""}>
        <span className="ql-formats">
          <select className="ql-header" defaultValue="" title={t("Text style")}>
            {HEADER_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`Heading ${level}`)}
              </option>
            ))}
            <option value="">{t("Normal")}</option>
          </select>
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-bold" title={t("Bold")} />
          <button type="button" className="ql-italic" title={t("Italic")} />
          <button type="button" className="ql-underline" title={t("Underline")} />
          <button type="button" className="ql-strike" title={t("Strikethrough")} />
          <button type="button" className="ql-code" title={t("Code")} />
          {richMedia && (
            <>
              <button type="button" className="ql-script" value="sub" title={t("Subscript")} />
              <button type="button" className="ql-script" value="super" title={t("Superscript")} />
            </>
          )}
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-list" value="bullet" title={t("Bullet list")} />
          <button type="button" className="ql-list" value="ordered" title={t("Numbered list")} />
          <button type="button" className="ql-blockquote" title={t("Blockquote")} />
          <button type="button" className="ql-code-block" title={t("Code block")} />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-link" title={t("Link")} />
          {richMedia && (
            <>
              <button type="button" className="ql-image" title={t("Image")} />
              <button type="button" className="ql-table" title={t("Table")} />
            </>
          )}
          <button type="button" className="ql-clean" title={t("Clear formatting")} />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-undo" title={t("Undo")}>
            <LuUndo2 />
          </button>
          <button type="button" className="ql-redo" title={t("Redo")}>
            <LuRedo2 />
          </button>
        </span>
      </div>
      {toolbarEl && (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorValue}
          onChange={handleChange}
          modules={modules}
          formats={richMedia ? null : BASIC_FORMATS}
          bounds={toolbarEl.parentElement}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      )}
      {richMedia && (
        <>
          <Media mediaKey={MEDIA_KEY} open={isOpenMedia} close={closeMedia} />
          {tableEdit && (
            <TableHtmlModal initialHtml={tableEdit.html} onSave={saveTable} onCancel={() => setTableEdit(null)} />
          )}
        </>
      )}
    </div>
  );
}

// Edição do HTML de uma tabela, com pré-visualização (montado só enquanto está aberto)
function TableHtmlModal({ initialHtml, onSave, onCancel }) {
  const { t } = useTranslation();
  const [html, setHtml] = useState(initialHtml || "");

  return (
    <Modal
      open
      title={t("Edit table")}
      width={900}
      onCancel={onCancel}
      maskClosable={false}
      footer={[
        <Button key="delete" danger onClick={() => onSave("")}>
          {t("Delete")}
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          {t("Cancel")}
        </Button>,
        <Button key="save" type="primary" onClick={() => onSave(html)}>
          {t("Save")}
        </Button>,
      ]}>
      <p className="text-[12px] italic mb-2 text-[#666]">{t("Edit the table HTML. Changes are shown in the preview.")}</p>
      <Input.TextArea
        value={html}
        onChange={(event) => setHtml(event.target.value)}
        autoSize={{ minRows: 8, maxRows: 16 }}
        className="font-mono! text-[12px]!"
      />
      <p className="font-bold mt-4 mb-2">{t("Preview")}</p>
      <div className="rich-text-table-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}
