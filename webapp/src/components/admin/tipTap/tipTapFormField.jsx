import "./styles.css";

import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useEffect, useMemo } from "react";

import config from "../../../utils/config";
import { MenuBar } from "./MenuBar.jsx";

// Imagens são guardadas no HTML como src="/media/<ficheiro>" (independente do servidor).
const resolveMediaSrc = (src) =>
  src && src.startsWith("/media/") ? `${config.server_ip}${src}` : src;

// Usa o node view redimensionável do Tiptap (pegas nos cantos); o tamanho fica guardado em width/height
const MediaImage = Image.extend({
  addNodeView() {
    const resizable = this.parent?.();
    if (!resizable) return null;
    return (props) =>
      resizable({
        ...props,
        HTMLAttributes: {
          ...props.HTMLAttributes,
          src: resolveMediaSrc(props.HTMLAttributes.src),
        },
      });
  },
}).configure({
  resize: {
    enabled: true,
    directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
    minWidth: 80,
    minHeight: 40,
    alwaysPreserveAspectRatio: true,
  },
});

const baseExtensions = [TextStyleKit, StarterKit];
// Extensões extra (imagens, tabelas, índice e expoente) só onde o HTML é mostrado com suporte a /media (ex.: Livro de Objecções)
const richMediaExtensions = [
  ...baseExtensions,
  MediaImage,
  TableKit.configure({ table: { resizable: false } }),
  Subscript,
  Superscript,
];

export default function TiptapFormField({
  value,
  onChange,
  richMedia = false,
}) {
  const extensions = useMemo(
    () => (richMedia ? richMediaExtensions : baseExtensions),
    [richMedia],
  );

  const editor = useEditor({
    extensions,
    content: `${value || ""}`,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Atualiza o conteúdo quando o value vem do Form
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="bg-white p-6 tiptap-editor">
      <MenuBar editor={editor} richMedia={richMedia} />
      <EditorContent editor={editor} />
    </div>
  );
}
