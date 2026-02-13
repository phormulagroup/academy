// src/components/TiptapFormField.jsx
import React, { useEffect } from "react";

import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MenuBar } from "./menuBar";
import "./styles.css";

export default function TiptapFormField({ value = "", onChange, onBlur, placeholder = "Escreva aqui...", editable = true, className }) {
  const editor = useEditor({
    editable,
    extensions: [TextStyleKit, StarterKit],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) onChange(html);
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  });

  // Sincroniza mudanças externas (initialValues/resetFields) com o editor
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== undefined && value !== current) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(value, false); // false = não criar histórico
      editor.commands.setTextSelection({ from, to });
    }
  }, [value, editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
