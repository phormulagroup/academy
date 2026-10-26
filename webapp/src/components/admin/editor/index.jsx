import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "antd";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

import { config } from "./config";
import initialData from "./initialData";
import { fieldTypes } from "./components/fieldOverrides";
import { VIEWPORTS } from "./core/fields";
import { EditorErrorBoundary } from "./components/errorBoundary";
import { ROOT_ZONE } from "./core/clipboard";
import { installTranslator } from "./core/translate";
import EditorShell, { ActionBarOverride, ComponentOverlayOverride } from "./layout/shell";
import { FieldsOverride } from "./layout/sidebar";
import CanvasFrame from "./layout/canvasFrame";

import "./style.css";
import Loading from "../../../layout/loading";

export { config };

const BRAND_VARS = ["--brand-primary", "--brand-primary-dark", "--brand-primary-lighter", "--brand-on-primary", "--brand-secondary", "--brand-success", "--brand-error"];

// --------------------------------------------------------------------------
// As cores da marca são variáveis CSS postas em <html> da app (ver
// utils/branding.js) — o canvas do editor é um iframe com o seu próprio
// <html>, onde não existiam (cores "da marca" apareciam transparentes).
// --------------------------------------------------------------------------

function IframeOverride({ children, document: frameDoc }) {
  useEffect(() => {
    if (!frameDoc) return;
    // O canvas é um iframe com o seu próprio <html>: copia para lá as cores da marca (--brand-*) definidas no :root da app
    const computed = getComputedStyle(window.document.documentElement);
    const dest = frameDoc.documentElement.style;
    for (const prop of BRAND_VARS) dest.setProperty(prop, computed.getPropertyValue(prop));
    // Ctrl/Cmd+S também com o foco dentro do canvas (o iframe tem o seu próprio
    // document, os atalhos da janela não chegam lá).
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        window.dispatchEvent(new Event("ed-save"));
      }
    };
    frameDoc.addEventListener("keydown", onKey);
    const stopTranslator = installTranslator(frameDoc);
    return () => {
      frameDoc.removeEventListener("keydown", onKey);
      stopTranslator();
    };
  }, [frameDoc]);
  return <CanvasFrame>{children}</CanvasFrame>;
}

// --------------------------------------------------------------------------
// Editor
// --------------------------------------------------------------------------

/**
 * submit(data) tem de devolver uma Promise (resolvida quando gravou) — só
 * assim o "Guardar" volta a ficar desativado depois de gravar.
 */
export function Editor({ data, submit, onExit, previewUrl, title, statusLabel, statusTone }) {
    const [content, setContent] = useState(null);
  const latestDataRef = useRef(null);
  // O conteúdo em si fica só na ref (evita re-renderizar a árvore toda do
  // Puck a cada tecla) — mas o botão "Guardar" (dentro de headerActions)
  // precisa de um estado à parte para se repintar.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const unsavedRef = useRef(false);
  unsavedRef.current = hasUnsavedChanges;

  useEffect(() => {
    let parsed = initialData;
    if (data?.content) {
      try {
        parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
      } catch {
        parsed = initialData;
      }
    }
    setContent(parsed);
    latestDataRef.current = null;
    setHasUnsavedChanges(false);
  }, [data]);

  const save = useCallback(async () => {
    if (!latestDataRef.current || isSaving) return;
    setIsSaving(true);
    try {
      await submit(latestDataRef.current);
      setHasUnsavedChanges(false);
    } catch {
      // o erro já é mostrado por submit()
    } finally {
      setIsSaving(false);
    }
  }, [submit, isSaving]);

  // Ctrl/Cmd+S grava (em vez de abrir o "guardar página" do browser).
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    const onSaveEvent = () => saveRef.current();
    window.addEventListener("keydown", onKey);
    window.addEventListener("ed-save", onSaveEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ed-save", onSaveEvent);
    };
  }, []);

  // Fechar o separador / recarregar com alterações por guardar.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!unsavedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const exit = useCallback(() => {
    if (!unsavedRef.current) return onExit?.();
    Modal.confirm({
      title: "Sair sem guardar?",
      content: "Tem alterações por guardar neste tópico. Se sair agora, perdem-se.",
      okText: "Sair sem guardar",
      cancelText: "Continuar a editar",
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => onExit?.(),
    });
  }, [onExit]);

  // Textos do Puck (barra de texto rico, itens de lista...) no painel.
  useEffect(() => installTranslator(document), []);

  const overrides = useMemo(
    () => ({
      actionBar: ActionBarOverride,
      componentOverlay: ComponentOverlayOverride,
      fields: FieldsOverride,
      iframe: IframeOverride,
      fieldTypes,
    }),
    [],
  );

  if (!content) return <Loading />;

  return (
    <EditorErrorBoundary>
      <Puck
        key={JSON.stringify(content)}
        config={config}
        data={content}
        viewports={VIEWPORTS}
        ui={{ viewports: { current: { width: "100%", height: "auto" }, controlsVisible: true, options: [] } }}
        onPublish={() => saveRef.current()}
        onChange={(newData) => {
          latestDataRef.current = newData;
          if (!unsavedRef.current) setHasUnsavedChanges(true);
        }}
        overrides={overrides}
        height="100vh"
      >
        <EditorShell
          title={title}
          statusLabel={statusLabel}
          statusTone={statusTone}
          onExit={exit}
          onPreview={previewUrl ? () => window.open(previewUrl, "_blank") : undefined}
          onSave={() => saveRef.current()}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </Puck>
    </EditorErrorBoundary>
  );
}

export { ROOT_ZONE };
