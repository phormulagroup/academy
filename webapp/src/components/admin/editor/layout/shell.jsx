import { Fragment, useEffect, useState } from "react";
import { ActionBar, Puck, createUsePuck, useGetPuck, usePuck } from "@puckeditor/core";
import { Button as AntButton, Tooltip } from "antd";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Eye,
  ExternalLink,
  Monitor,
  Redo2,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";

import { config } from "../config";
import ElementIcon from "../core/icon";
import { VIEWPORTS, widthToDevice } from "../core/fields";
import { readClipboard, writeClipboard, insertItems } from "../core/clipboard";
import Sidebar from "./sidebar";
import { ROOT_ZONE, blockIcon, blockLabel } from "./blocks";

import "./shell.css";

const usePuckSel = createUsePuck();

const DEVICES = [
  { key: "desktop", label: "Computador", Icon: Monitor, viewport: VIEWPORTS[0] },
  { key: "tablet", label: "Tablet", Icon: Tablet, viewport: VIEWPORTS[1] },
  { key: "mobile", label: "Telemóvel", Icon: Smartphone, viewport: VIEWPORTS[2] },
];

// --------------------------------------------------------------------------
// Barra do bloco selecionado no canvas (nome + mover, duplicar, copiar, eliminar)
// --------------------------------------------------------------------------

export function ActionBarOverride({ label, children, parentAction }) {
  const selectedItem = usePuckSel((s) => s.selectedItem);
  const getPuck = useGetPuck();

  // O primeiro filho do Puck é o menu do texto rico (quando se edita texto no
  // canvas) — mantém-se; "Duplicar"/"Eliminar" do Puck vêm em inglês e
  // substituem-se pelos nossos.
  const richMenu = Array.isArray(children) && children[0] && children[0].type === Fragment ? children[0] : null;

  const sel = () => {
    const { appState } = getPuck();
    const s = appState.ui.itemSelector;
    return s ? { index: s.index, zone: s.zone || ROOT_ZONE } : null;
  };
  const move = (delta) => {
    const s = sel();
    if (!s) return;
    const { appState } = getPuck();
    const { dispatch, getItemById } = getPuck();
    const parent = s.zone === ROOT_ZONE ? null : getItemById(s.zone.split(":")[0]);
    const slotPath = s.zone.slice(s.zone.indexOf(":") + 1);
    const list = s.zone === ROOT_ZONE ? appState.data.content : slotPath.split(/[.[\]]+/).filter(Boolean).reduce((v, k) => v?.[k], parent?.props);
    const count = Array.isArray(list) ? list.length : 0;
    const to = s.index + delta;
    if (to < 0 || to >= count) return;
    dispatch({ type: "move", sourceIndex: s.index, sourceZone: s.zone, destinationIndex: to, destinationZone: s.zone });
    dispatch({ type: "setUi", ui: { itemSelector: { index: to, zone: s.zone } } });
  };

  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {label && (
          <div className="ed-bar-label">
            {selectedItem && <ElementIcon name={blockIcon(selectedItem.type)} size={14} />}
            {label}
          </div>
        )}
      </ActionBar.Group>
      <ActionBar.Group>
        {richMenu}
        <ActionBar.Action label="Mover para cima" onClick={() => move(-1)}>
          <ArrowUp size={15} />
        </ActionBar.Action>
        <ActionBar.Action label="Mover para baixo" onClick={() => move(1)}>
          <ArrowDown size={15} />
        </ActionBar.Action>
        <ActionBar.Action
          label="Duplicar"
          onClick={() => {
            const s = sel();
            if (s) getPuck().dispatch({ type: "duplicate", sourceIndex: s.index, sourceZone: s.zone });
          }}
        >
          <CopyPlus size={15} />
        </ActionBar.Action>
        <ActionBar.Action
          label="Copiar (pode colar noutra página)"
          onClick={() => {
            if (selectedItem) writeClipboard([selectedItem]);
          }}
        >
          <Copy size={15} />
        </ActionBar.Action>
        <ActionBar.Action
          label="Eliminar"
          onClick={() => {
            const s = sel();
            if (s) getPuck().dispatch({ type: "remove", index: s.index, zone: s.zone });
          }}
        >
          <Trash2 size={15} />
        </ActionBar.Action>
      </ActionBar.Group>
    </ActionBar>
  );
}

// Etiqueta com o nome do bloco ao passar o rato (o selecionado já tem a barra).
export function ComponentOverlayOverride({ children, hover, isSelected, componentType }) {
  return (
    <>
      {children}
      {hover && !isSelected && (
        <div className="ed-hover-chip">
          <ElementIcon name={blockIcon(componentType)} size={12} />
          {blockLabel(componentType)}
        </div>
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Barra de topo
// --------------------------------------------------------------------------

function TopBar({ title, statusLabel, statusTone, onExit, onPreview, onSave, isSaving, hasUnsavedChanges }) {
  const { appState, dispatch, history } = usePuck();
  const getPuck = useGetPuck();
  const device = widthToDevice(appState.ui.viewports?.current?.width);
  const previewing = appState.ui.previewMode === "interactive";
  const [clipboardCount, setClipboardCount] = useState(() => readClipboard()?.length || 0);

  // O clipboard vive no localStorage — pode ter sido preenchido noutro separador.
  useEffect(() => {
    const refresh = () => setClipboardCount(readClipboard()?.length || 0);
    window.addEventListener("storage", refresh);
    window.addEventListener("el-clipboard", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("el-clipboard", refresh);
    };
  }, []);

  const setDevice = (viewport) =>
    dispatch({ type: "setUi", ui: (prev) => ({ ...prev, viewports: { ...prev.viewports, current: { width: viewport.width, height: viewport.height } } }) });

  return (
    <header className="ed-topbar">
      <div className="ed-topbar__left">
        <Tooltip title="Sair do editor">
          <button type="button" className="ed-iconbtn ed-iconbtn--lg" aria-label="Sair do editor" onClick={onExit}>
            <ArrowLeft size={18} />
          </button>
        </Tooltip>
        <div className="ed-title">
          <strong title={title}>{title}</strong>
          {statusLabel && <span className={`ed-status ed-status--${statusTone || "muted"}`}>{statusLabel}</span>}
          {hasUnsavedChanges && <span className="ed-unsaved">Alterações por guardar</span>}
        </div>
      </div>

      <div className="ed-devices" role="group" aria-label="Largura do ecrã">
        {DEVICES.map(({ key, label, Icon, viewport }) => (
          <Tooltip key={key} title={label}>
            <button type="button" aria-label={label} aria-pressed={device === key} className={device === key ? "is-active" : ""} onClick={() => setDevice(viewport)}>
              <Icon size={16} />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="ed-topbar__right">
        <Tooltip title="Anular (Ctrl+Z)">
          <button type="button" className="ed-iconbtn ed-iconbtn--lg" aria-label="Anular" disabled={!history.hasPast} onClick={() => history.back()}>
            <Undo2 size={17} />
          </button>
        </Tooltip>
        <Tooltip title="Refazer (Ctrl+Shift+Z)">
          <button type="button" className="ed-iconbtn ed-iconbtn--lg" aria-label="Refazer" disabled={!history.hasFuture} onClick={() => history.forward()}>
            <Redo2 size={17} />
          </button>
        </Tooltip>
        <span className="ed-sep" />
        <Tooltip title={clipboardCount ? "Colar o bloco copiado a seguir ao bloco selecionado (ou no fim da página)" : "Copie primeiro um bloco (botão de copiar na barra do bloco)"}>
          <span>
            <AntButton aria-label="Colar" icon={<ClipboardPaste size={15} />} disabled={!clipboardCount} onClick={() => insertItems(getPuck(), readClipboard() || [])} />
          </span>
        </Tooltip>
        <Tooltip title="Ver a página sem as ferramentas de edição">
          <AntButton type={previewing ? "primary" : "default"} ghost={previewing} icon={<Eye size={15} />} onClick={() => dispatch({ type: "setUi", ui: { previewMode: previewing ? "edit" : "interactive" } })}>
            Pré-visualizar
          </AntButton>
        </Tooltip>
        {onPreview && (
          <Tooltip title="Abrir o tópico como o aluno o vê (versão guardada)">
            <AntButton icon={<ExternalLink size={15} />} onClick={onPreview}>
              Ver como aluno
            </AntButton>
          </Tooltip>
        )}
        <Tooltip title="Ctrl+S">
          <AntButton icon={<Save size={15} />} onClick={onSave} type="primary" disabled={!hasUnsavedChanges} loading={isSaving}>
            Guardar
          </AntButton>
        </Tooltip>
      </div>

    </header>
  );
}

// --------------------------------------------------------------------------
// Estado vazio: página sem blocos
// --------------------------------------------------------------------------

const QUICK_ADD = ["Heading", "Text", "Image", "Columns", "Button"];

function EmptyState() {
  const getPuck = useGetPuck();
  const add = (type) => {
    const { dispatch } = getPuck();
    dispatch({ type: "insert", componentType: type, destinationIndex: 0, destinationZone: ROOT_ZONE, id: `${type}-${crypto.randomUUID()}` });
    dispatch({ type: "setUi", ui: { itemSelector: { index: 0, zone: ROOT_ZONE } } });
  };
  return (
    <div className="ed-empty">
      <div className="ed-empty__card">
        <strong>Arraste um bloco para aqui</strong>
        <p>Escolha um bloco na barra da esquerda e largue-o na página, ou comece por um destes.</p>
        <div className="ed-empty__quick">
          {QUICK_ADD.filter((t) => config.components[t]).map((t) => (
            <button key={t} type="button" onClick={() => add(t)}>
              <ElementIcon name={blockIcon(t)} size={16} />
              {blockLabel(t)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Estrutura geral
// --------------------------------------------------------------------------

export default function EditorShell(props) {
  const { appState } = usePuck();
  const width = appState.ui.viewports?.current?.width ?? "100%";
  const device = widthToDevice(width);
  const isEmpty = !appState.data.content?.length;
  const previewing = appState.ui.previewMode === "interactive";

  return (
    <div className="ed-shell">
      <TopBar {...props} />
      <div className="ed-main">
        <aside className="ed-sidebar" aria-label="Painel do editor">
          <Sidebar />
        </aside>
        <main className="ed-canvas" data-device={device}>
          <div className="ed-stage" style={{ width: width === "100%" ? "100%" : width }}>
            <Puck.Preview />
            {isEmpty && !previewing && <EmptyState />}
          </div>
        </main>
      </div>
    </div>
  );
}
