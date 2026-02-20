import "./styles.css";

import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useEffect } from "react";

import { MenuBar } from "./MenuBar.jsx";

const extensions = [TextStyleKit, StarterKit];

export default ({ value, onChange }) => {
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
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
