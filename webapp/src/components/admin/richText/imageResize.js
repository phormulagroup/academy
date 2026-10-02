import { Quill } from "react-quill-new";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_WIDTH = 24;

/**
 * Redimensionar imagens no editor Quill: clicar numa imagem mostra uma moldura com pegas (cantos e lados);
 * arrastar mantém a proporção. No fim aplica os atributos width/height através do Quill
 * (formatos nativos do blot "image"), por isso ficam no HTML gravado e no histórico (Desfazer/Refazer).
 * A moldura fica fora do .ql-editor (o Quill não a vê nem a grava).
 * Devolve uma função para remover os eventos/elementos.
 */
export function attachImageResize(quill, { title = "" } = {}) {
  const container = quill.container;
  const root = quill.root;

  // Área com o mesmo tamanho do .ql-editor (corta a moldura quando a imagem sai da parte visível)
  const clip = document.createElement("div");
  clip.className = "ql-image-resize-clip";
  const frame = document.createElement("div");
  frame.className = "ql-image-resize";
  const label = document.createElement("div");
  label.className = "ql-image-resize-size";
  frame.appendChild(label);
  HANDLES.forEach((dir) => {
    const handle = document.createElement("div");
    handle.className = `ql-image-resize-handle ql-image-resize-${dir}`;
    handle.dataset.dir = dir;
    if (title) handle.title = title;
    frame.appendChild(handle);
  });
  clip.appendChild(frame);
  clip.style.display = "none";
  container.appendChild(clip);

  let img = null;
  let drag = null;

  function hide() {
    img = null;
    drag = null;
    clip.style.display = "none";
  }

  function setFrame(left, top, width, height) {
    frame.style.left = `${left}px`;
    frame.style.top = `${top}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    label.textContent = `${Math.round(width)} × ${Math.round(height)}`;
  }

  function position() {
    if (!img) return;
    if (!img.isConnected || !root.contains(img) || !quill.isEnabled()) {
      hide();
      return;
    }
    const c = container.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const i = img.getBoundingClientRect();
    clip.style.display = "";
    clip.style.left = `${r.left - c.left}px`;
    clip.style.top = `${r.top - c.top}px`;
    clip.style.width = `${root.clientWidth}px`;
    clip.style.height = `${root.clientHeight}px`;
    setFrame(i.left - r.left, i.top - r.top, i.width, i.height);
  }

  function show(target) {
    img = target;
    // Mostra a imagem inteira (com as pegas) quando cabe na parte visível do editor
    const r = root.getBoundingClientRect();
    const i = target.getBoundingClientRect();
    if (i.height + 16 <= root.clientHeight) {
      if (i.bottom + 8 > r.top + root.clientHeight) root.scrollTop += i.bottom + 8 - (r.top + root.clientHeight);
      else if (i.top - 8 < r.top) root.scrollTop -= r.top - (i.top - 8);
    }
    position();
  }

  // Largura máxima = largura útil do editor (sem padding)
  function maxWidth() {
    const style = window.getComputedStyle(root);
    return root.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0);
  }

  function onRootClick(event) {
    if (event.target instanceof HTMLImageElement && quill.isEnabled()) show(event.target);
    else hide();
  }

  function onPointerDown(event) {
    const dir = event.target.dataset?.dir;
    if (!dir || !img) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = img.getBoundingClientRect();
    const attrW = parseFloat(img.getAttribute("width"));
    const attrH = parseFloat(img.getAttribute("height"));
    const ratio = attrW > 0 && attrH > 0 ? attrH / attrW : rect.height / rect.width || 1;
    const r = root.getBoundingClientRect();
    drag = {
      dir,
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      left: rect.left - r.left,
      top: rect.top - r.top,
      ratio,
      max: Math.max(MIN_WIDTH, maxWidth()),
      size: null,
    };
    event.target.setPointerCapture?.(event.pointerId);
    frame.classList.add("ql-image-resize-active");
  }

  function onPointerMove(event) {
    if (!drag) return;
    const { dir, ratio } = drag;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    let width;
    if (dir === "n" || dir === "s") {
      const height = drag.width * ratio + (dir === "s" ? dy : -dy);
      width = height / ratio;
    } else {
      width = drag.width + (dir.includes("e") ? dx : -dx);
    }
    width = Math.round(Math.min(drag.max, Math.max(MIN_WIDTH, width)));
    const height = Math.round(width * ratio);
    drag.size = { width, height };
    // A pega oposta fica fixa enquanto se arrasta
    const left = dir.includes("w") ? drag.left + drag.width - width : drag.left;
    const top = dir.includes("n") ? drag.top + drag.width * ratio - height : drag.top;
    setFrame(left, top, width, height);
  }

  function onPointerUp() {
    if (!drag) return;
    const { size } = drag;
    drag = null;
    frame.classList.remove("ql-image-resize-active");
    const blot = img && Quill.find(img);
    if (size && blot && blot.statics?.blotName === "image") {
      quill.formatText(quill.getIndex(blot), 1, { width: String(size.width), height: String(size.height) }, "user");
    }
    requestAnimationFrame(position);
  }

  function onDocumentPointerDown(event) {
    if (img && !container.contains(event.target)) hide();
  }

  function onTextChange() {
    if (img && !drag) requestAnimationFrame(position);
  }

  root.addEventListener("click", onRootClick);
  root.addEventListener("scroll", position);
  root.addEventListener("keydown", hide);
  frame.addEventListener("pointerdown", onPointerDown);
  frame.addEventListener("pointermove", onPointerMove);
  frame.addEventListener("pointerup", onPointerUp);
  frame.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  window.addEventListener("resize", position);
  quill.on("text-change", onTextChange);

  return () => {
    root.removeEventListener("click", onRootClick);
    root.removeEventListener("scroll", position);
    root.removeEventListener("keydown", hide);
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    window.removeEventListener("resize", position);
    quill.off("text-change", onTextChange);
    clip.remove();
  };
}
