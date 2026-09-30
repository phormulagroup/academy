import { useEditorState } from "@tiptap/react";
import { message } from "antd";
import React, { useState } from "react";

import config from "../../../utils/config";
import Media from "../media/media";
import { menuBarStateSelector } from "./menuBarState.jsx";

// Largura inicial das imagens inseridas (pode ser ajustada depois com as pegas nos cantos)
const DEFAULT_IMAGE_WIDTH = 600;
const MEDIA_KEY = "editorImage";

// Lê as dimensões reais da imagem e limita a largura a DEFAULT_IMAGE_WIDTH, mantendo a proporção
function defaultImageSize(url) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const width = Math.min(img.naturalWidth, DEFAULT_IMAGE_WIDTH);
      resolve({ width, height: Math.round((img.naturalHeight * width) / img.naturalWidth) });
    };
    img.onerror = () => resolve({});
    img.src = url;
  });
}

export const MenuBar = ({ editor, richMedia = false }) => {
  const editorState = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  if (!editor) {
    return null;
  }

  // Imagem escolhida na biblioteca de Multimédia (o upload é feito no separador "Upload" do mesmo componente)
  async function closeMedia(res) {
    setIsOpenMedia(false);
    const file = res?.[MEDIA_KEY];
    if (!file) return;
    if (!/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(file)) {
      message.error("O ficheiro selecionado não é uma imagem.");
      return;
    }
    const size = await defaultImageSize(`${config.server_ip}/media/${file}`);
    editor
      .chain()
      .focus()
      .setImage({ src: `/media/${file}`, alt: file.replace(/\.[^.]+$/, ""), ...size })
      .run();
  }

  return (
    <div className="control-group">
      {richMedia && (
        <div className="button-group">
          <Media mediaKey={MEDIA_KEY} open={isOpenMedia} close={closeMedia} />
          <button type="button" onClick={() => setIsOpenMedia(true)}>
            Image
          </button>
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            Table
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={editorState.isSubscript ? "is-active" : ""}>
            Subscript
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={editorState.isSuperscript ? "is-active" : ""}>
            Superscript
          </button>
          {editorState.isTable && (
            <>
              <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>Add row</button>
              <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</button>
              <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</button>
              <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</button>
              <button type="button" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Header row</button>
              <button type="button" onClick={() => editor.chain().focus().mergeOrSplit().run()}>Merge/split cells</button>
              <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button>
            </>
          )}
        </div>
      )}
      <div className="button-group">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editorState.canBold} className={editorState.isBold ? "is-active" : ""}>
          Bold
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editorState.canItalic} className={editorState.isItalic ? "is-active" : ""}>
          Italic
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editorState.canStrike} className={editorState.isStrike ? "is-active" : ""}>
          Strike
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editorState.canCode} className={editorState.isCode ? "is-active" : ""}>
          Code
        </button>
        <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().run()}>Clear marks</button>
        <button type="button" onClick={() => editor.chain().focus().clearNodes().run()}>Clear nodes</button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={editorState.isParagraph ? "is-active" : ""}>
          Paragraph
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editorState.isHeading1 ? "is-active" : ""}>
          H1
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editorState.isHeading2 ? "is-active" : ""}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editorState.isHeading3 ? "is-active" : ""}>
          H3
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} className={editorState.isHeading4 ? "is-active" : ""}>
          H4
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()} className={editorState.isHeading5 ? "is-active" : ""}>
          H5
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()} className={editorState.isHeading6 ? "is-active" : ""}>
          H6
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editorState.isBulletList ? "is-active" : ""}>
          Bullet list
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editorState.isOrderedList ? "is-active" : ""}>
          Ordered list
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editorState.isCodeBlock ? "is-active" : ""}>
          Code block
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editorState.isBlockquote ? "is-active" : ""}>
          Blockquote
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>Horizontal rule</button>
        <button type="button" onClick={() => editor.chain().focus().setHardBreak().run()}>Hard break</button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editorState.canUndo}>
          Undo
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editorState.canRedo}>
          Redo
        </button>
      </div>
    </div>
  );
};
