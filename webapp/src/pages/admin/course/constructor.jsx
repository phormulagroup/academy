import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, DragOverlay, useSensor, useSensors, pointerWithin, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
// import { CSS } from "@dnd-kit/utilities";

/* ANTD */
import { Card, Button, Input, Space, Typography, Popconfirm, message, Tag } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { AiOutlineClose, AiOutlineDelete, AiOutlineEdit, AiOutlineSave } from "react-icons/ai";
import { LuLetterText } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import endpoints from "../../../utils/endpoints";
import { Context } from "../../../utils/context";

const { Text } = Typography;

/* -------------------- Utils -------------------- */
const makeId = (p = "") => p + Math.random().toString(36).slice(2, 8);
const isModuleId = (id) => typeof id === "string" && id.startsWith("mod-");
const isTopicId = (id) => typeof id === "string" && id.startsWith("topic-");
const isTestId = (id) => typeof id === "string" && id.startsWith("test-");

/* -------------------- Grip (drag handle) -------------------- */
function Grip({ attributes, listeners, title, style }) {
  return (
    <div {...attributes} {...listeners} title={title} style={style} className="cursor-grab px-1 select-none text-gray-500">
      ⋮⋮
    </div>
  );
}

/* -------------------- Wrapper de animação de remoção -------------------- */
function RemoveAnim({ isRemoving, duration = 400, children }) {
  return (
    <div
      className="grid transition-all"
      style={{
        gridTemplateRows: isRemoving ? "0fr" : "1fr",
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? "scale(0.95)" : "scale(1)",
        transition: `grid-template-rows ${duration}ms ease-out, opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/* -------------------- Zona droppable do MÓDULO (aceita drop em área vazia) -------------------- */
function ModuleDropArea({ id, children, style }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={style} className={isOver ? "bg-blue-50/40 rounded" : ""}>
      {children}
    </div>
  );
}

/* -------------------- Tópico/Teste ordenável (com botão Editar + setas ↑↓) -------------------- */
function SortableTopic({ item, onDelete, onCommitLabel, isDeleting, canMoveUp, canMoveDown, onMoveUp, onMoveDown, navigate, course, activeId, overId }) {
  const { setNodeRef, attributes, listeners } = useSortable({ id: item.id });

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.title);

  useEffect(() => {
    setValue(item.title);
  }, [item.title]);

  const commit = () => {
    if (value !== item.title) onCommitLabel(item.moduleId, item.id, value);
    setEditing(false);
  };
  const cancel = () => {
    setValue(item.title);
    setEditing(false);
  };

  const isBeingDragged = activeId === item.id;
  const isDropTarget = overId === item.id;

  return (
    <RemoveAnim isRemoving={isDeleting}>
      <Card
        ref={setNodeRef}
        className="mb-2!"
        style={{
          transform: "none",
          transition: "background-color 150ms ease, border-color 150ms ease",
          opacity: 1,
          backgroundColor: activeId && isDropTarget ? "rgba(13, 110, 253, 0.15)" : "transparent",
          cursor: "default",
        }}
        bodyStyle={{ padding: 8 }}
      >
        <div className="flex items-center gap-2">
          <Grip 
            attributes={editing ? {} : attributes} 
            listeners={editing ? {} : listeners} 
            title="Arrastar topic/test"
            style={{
              cursor: isBeingDragged ? "grabbing" : "grab",
            }}
          />

          {editing ? (
            <div className="flex items-center gap-2 w-full">
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onPressEnter={commit}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    cancel();
                  }
                }}
              />
              <Button type="primary" onClick={commit} icon={<AiOutlineSave />} />
              <Button onClick={cancel} icon={<AiOutlineClose />} />
            </div>
          ) : (
            <>
              <Tag color={item.type === "test" ? "geekblue" : "green"}>{item.type}</Tag>
              <Text className="flex-1">{item.title}</Text>

              {/* Setas ↑ ↓ para mover uma posição */}
              <Space size={4}>
                <Button icon={<ArrowUpOutlined />} onClick={() => onMoveUp(item.moduleId, item.id)} disabled={!canMoveUp} />
                <Button icon={<ArrowDownOutlined />} onClick={() => onMoveDown(item.moduleId, item.id)} disabled={!canMoveDown} />
              </Space>

              <Space>
              {/* BOTÃO EDITAR - disabled para items não salvos na BD */}
                <Button
                  disabled={!item.id || item.id.split("-")[0].startsWith("new")}
                  title={!item.id ? "Item inválido" : item.id.split("-")[0].startsWith("new") ? `Salve o ${item.type === "test" ? "teste" : "tópico"} primeiro para editar este item` : "Editar item"}
                  onClick={() => navigate(`/admin/courses/${course.id}/${item.type === "topic" ? "topic" : "test"}/${parseInt(item.id.split("-")[1])}`)}
                  icon={<AiOutlineEdit />}
                />
                <Button onClick={() => setEditing(true)} icon={<LuLetterText />} />
                <Button danger onClick={() => onDelete(item.moduleId, item.id)} icon={<AiOutlineDelete />} />
              </Space>
            </>
          )}
        </div>
      </Card>
    </RemoveAnim>
  );
}

/* -------------------- Overlays (preview durante drag) -------------------- */
function TopicOverlay({ item }) {
  if (!item) return null;
  return (
    <Card size="small" className="shadow-xl border" bodyStyle={{ padding: 8 }} style={{ opacity: 0.4 }}>
      <div className="flex items-center gap-2">
        <span>⋮⋮</span>
        <Tag color={item.type === "test" ? "geekblue" : "green"}>{item.type}</Tag>
        <Text>{item.title}</Text>
      </div>
    </Card>
  );
}

function ModuleOverlay({ module }) {
  if (!module) return null;
  return (
    <Card className="shadow-2xl border" style={{ opacity: 0.65 }}>
      <Text className="font-medium">⋮⋮ {module.title}</Text>
    </Card>
  );
}

/* -------------------- Módulo ordenável (com setas ↑↓) -------------------- */
function SortableModule({
  module,
  children,
  onTitleChange,
  onAddTopic,
  onAddTest,
  onDeleteModule,
  isDeleting,
  isActive, // mantém espaço ao arrastar
  dropRing, // highlight quando o cursor está por cima do módulo
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  activeId,
  overId,
}) {
  const { setNodeRef, attributes, listeners } = useSortable({ id: module.id });

  const [editing, setEditing] = useState(false);
  const isDropTarget = overId === module.id;

  return (
    <RemoveAnim isRemoving={isDeleting}>
      <Card
        ref={setNodeRef}
        title={
          <div className="flex items-center gap-2">
            <Grip attributes={attributes} listeners={listeners} title="Arrastar módulo" />

            {editing ? (
              <Input
                autoFocus
                defaultValue={module.title}
                onBlur={(e) => {
                  onTitleChange(module.id, e.target.value);
                  setEditing(false);
                }}
                onPressEnter={(e) => {
                  onTitleChange(module.id, e.currentTarget.value);
                  setEditing(false);
                }}
                className="max-w-[70%]"
              />
            ) : (
              <span className="cursor-text font-medium" onClick={() => setEditing(true)} title="Editar título do módulo">
                {module.title}
              </span>
            )}

            {/* Setas ↑ ↓ para mover módulo uma posição */}
            <Space size={4} className="ml-auto">
              <Button icon={<ArrowUpOutlined />} onClick={() => onMoveUp(module.id)} disabled={!canMoveUp} />
              <Button icon={<ArrowDownOutlined />} onClick={() => onMoveDown(module.id)} disabled={!canMoveDown} />
            </Space>

            <Popconfirm title="Apagar módulo?" okText="Sim" cancelText="Não" onConfirm={() => onDeleteModule(module.id)}>
              <Button danger icon={<AiOutlineDelete />} />
            </Popconfirm>
          </div>
        }
        style={{
          transform: "none",
          transition: "background-color 150ms ease",
          opacity: 1,
          backgroundColor: activeId && isDropTarget ? "rgba(13, 110, 253, 0.15)" : "",
          pointerEvents: isActive ? "none" : "auto",
        }}
        className={`shadow-md ${dropRing ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
        bodyStyle={{ paddingTop: 12 }}
      >
        <Space>
          <Button type="primary" onClick={() => onAddTopic(module.id)}>
            + Tópico
          </Button>
          <Button onClick={() => onAddTest(module.id)}>+ Teste</Button>
        </Space>

        <div className="mt-3">{children}</div>
      </Card>
    </RemoveAnim>
  );
}

export default function Constructor({ course }) {
  const { createLog, user, selectedLanguage, t } = useContext(Context);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [original, setOriginal] = useState([]);
  const [modules, setModules] = useState([]);

  /* ---------- Undo/Redo ---------- */
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  /* ---------- Eliminar com animação ---------- */
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [deletingModules, setDeletingModules] = useState(new Set());
  const timersRef = useRef(new Map()); // Map para armazenar timers de remoção de items/módulos
  const pendingDeletionsRef = useRef({ items: new Set(), modules: new Set() }); // Track de items/módulos pendentes de remoção
  const confirmedDeletionsRef = useRef({ items: new Set(), modules: new Set() }); // Track de items/módulos confirmados para remoção (após flush)
  const flushTimerRef = useRef(null);
  const historyPushedRef = useRef(false); // Track se o histórico foi adicionado neste lote de deleção
  const ANIM_MS = 400;

  const navigate = useNavigate();

  /* ---------- Load do localStorage no arranque ---------- */
  useEffect(() => {
    if (course) getData();
  }, [course]);

  useEffect(() => {
    const current = JSON.stringify(modules);
    const saved = JSON.stringify(original);
    setIsUnsaved(current !== saved);
  }, [modules]);

  async function getData() {
    try {
      const res = await axios.get(endpoints.course.readById, { params: { id: course.id } });
      console.log(res);
      if (res.data.course.length > 0) {
        console.log(res.data.modules);
        // Ordenar os módulos e items por posição (position) antes de definir o estado
        const sortedModules = res.data.modules.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const modulesData = sortedModules.map((mod) => ({
          id: `mod-${mod.id}`,
          title: mod.title,
          items: mod.items
            ? JSON.parse(mod.items)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((i) => {
                  if (i.type === "test") {
                    if (res.data.tests.filter((t) => i.id === t.id).length > 0)
                      return {
                        id: `test-${res.data.tests.filter((t) => i.id === t.id)[0].id}`,
                        title: res.data.tests.filter((t) => i.id === t.id)[0].title,
                        type: i.type,
                      };
                  }
                  if (i.type === "topic") {
                    if (res.data.topics.filter((t) => i.id === t.id).length > 0)
                      return {
                        id: `topic-${res.data.topics.filter((t) => i.id === t.id)[0].id}`,
                        title: res.data.topics.filter((t) => i.id === t.id)[0].title,
                        type: i.type,
                      };
                  }
                  return null; // Devolve null se o item não for encontrado
                })
                .filter((item) => item !== null) // Remove items nulos (não encontrados)
            : [],
        }));

        console.log(modulesData);
        setModules(modulesData);
        setOriginal(Object.assign([], modulesData));
        
        // Resetar os estados de deleção e histórico 
        historyPushedRef.current = false;
        pendingDeletionsRef.current.items.clear();
        pendingDeletionsRef.current.modules.clear();
        confirmedDeletionsRef.current.items.clear();
        confirmedDeletionsRef.current.modules.clear();
      }
    } catch (err) {
      console.log(err);
    }
  }

  const pushHistory = (state) => {
    setHistory((h) => [...h, state]);
    setFuture([]);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    cancelPendingDeletes();
    setFuture((f) => [modules, ...f]);
    setHistory((h) => h.slice(0, -1));
    setModules(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    cancelPendingDeletes();
    setHistory((h) => [...h, modules]);
    setFuture((f) => f.slice(1));
    setModules(next);
  };

  /* ---------- Guardar (persistir) ---------- */
  async function save() {
    setIsSaving(true);
    
   // Se houver um flush pendente, cancela o timer e aplica as deleções imediatamente
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
      
      // Aplica as deleções pendentes imediatamente
      const itemsToDelete = new Set(pendingDeletionsRef.current.items);
      const modulesToDelete = new Set(pendingDeletionsRef.current.modules);
      
      if (itemsToDelete.size > 0 || modulesToDelete.size > 0) {

        // Marca os items/módulos como confirmados para deleção
        itemsToDelete.forEach(id => confirmedDeletionsRef.current.items.add(id));
        modulesToDelete.forEach(id => confirmedDeletionsRef.current.modules.add(id));
        

        setModules((prev) =>
          prev
            .filter((m) => !modulesToDelete.has(m.id))
            .map((m) => ({
              ...m,
              items: m.items && Array.isArray(m.items) ? m.items.filter((i) => !itemsToDelete.has(i.id)) : [],
            }))
        );
        
        // Limpa os conjuntos de deleção pendentes após aplicar
        pendingDeletionsRef.current.items.clear();
        pendingDeletionsRef.current.modules.clear();
      }
    }
    
    // Aguardar um ciclo de event loop para garantir que o estado foi atualizado antes de prosseguir
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      // Detectar items deletados comparando com o estado original
      const actualDeletedItems = new Set();
      const actualDeletedModules = new Set();

      // Extrair IDs dos items e módulos do estado original (última vez que foi salvo)
      const originalItemIds = new Set();
      const originalModuleIds = new Set();
      
      original.forEach((mod) => {
        originalModuleIds.add(mod.id);
        if (mod.items && Array.isArray(mod.items)) {
          mod.items.forEach((i) => originalItemIds.add(i.id));
        }
      });

      // Extrair IDs do estado atual (UI)
      const currentItemIds = new Set();
      const currentModuleIds = new Set();
      
      modules.forEach((mod) => {
        currentModuleIds.add(mod.id);
        if (mod.items && Array.isArray(mod.items)) {
          mod.items.forEach((i) => currentItemIds.add(i.id));
        }
      });

      // Detectar items que estavam no original mas não estão agora = foram deletados
      originalItemIds.forEach((id) => {
        if (!currentItemIds.has(id) && !id.split("-")[0].startsWith("new")) {
          actualDeletedItems.add(id);
        }
      });

      // Detectar módulos que estavam no original mas não estão agora = foram deletados
      originalModuleIds.forEach((id) => {
        if (!currentModuleIds.has(id) && !id.split("-")[0].startsWith("new")) {
          actualDeletedModules.add(id);
        }
      });

      // Adiciona os items/módulos confirmados para deleção (após flush) aos conjuntos de deleção final
      confirmedDeletionsRef.current.items.forEach(id => actualDeletedItems.add(id));
      confirmedDeletionsRef.current.modules.forEach(id => actualDeletedModules.add(id));

      console.log("Confirmed deletion fallback items:", Array.from(confirmedDeletionsRef.current.items));
      console.log("Confirmed deletion fallback modules:", Array.from(confirmedDeletionsRef.current.modules));
      console.log("Final delete items:", Array.from(actualDeletedItems));
      console.log("Final delete modules:", Array.from(actualDeletedModules));

      const insert = await axios.post(endpoints.course.module, {
        data: modules.map((m, index) => ({
          ...m,
          id_course: course.id,
          position: index,
          items: m.items && Array.isArray(m.items) ? m.items.map((i, itemIndex) => ({ ...i, id_course_module: m.id, position: itemIndex })) : [],
        })),
        deleted: { items: Array.from(actualDeletedItems), modules: Array.from(actualDeletedModules) },
      });

      await createLog({
        id_user: user.id,
        action: "update",
        table_name: "course",
        meta_data: JSON.stringify({
          items: modules.map((m, index) => ({
            ...m,
            id_course: course.id,
            position: index,
            items: m.items && Array.isArray(m.items) ? m.items.map((i, itemIndex) => ({ ...i, id_course_module: m.id, position: itemIndex })) : [],
          })),
          name: course.name,
          deleted: { items: Array.from(actualDeletedItems), modules: Array.from(actualDeletedModules) },
        }),
        id_lang: selectedLanguage.id,
      });
      console.log(insert);
      
      // Recarrega os dados do curso após salvar para garantir que o estado local está sincronizado com a BD
      await getData();
      
      // Limpa os estados de exclusão pendentes após salvar
      setDeletingItems(new Set());
      setDeletingModules(new Set());
      historyPushedRef.current = false;
      pendingDeletionsRef.current.items.clear();
      pendingDeletionsRef.current.modules.clear();
      confirmedDeletionsRef.current.items.clear();
      confirmedDeletionsRef.current.modules.clear();
      
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      
      // Após salvar, começamos uma nova sessão sem histórico prévio
      setHistory([]);
      setFuture([]);
      
      message.success("Estado guardado!");
    } catch (err) {
      console.log(err);
      message.error("Falha ao guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelPendingDeletes() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    
    pendingDeletionsRef.current.items.clear();
    pendingDeletionsRef.current.modules.clear();
    confirmedDeletionsRef.current.items.clear();
    confirmedDeletionsRef.current.modules.clear();
    
    // Resetar o flag de histórico para permitir novas deleções
    historyPushedRef.current = false;
    
    setDeletingItems(new Set());
    setDeletingModules(new Set());
  }

  function flushPendingDeletions() {
    const itemsToDelete = new Set(pendingDeletionsRef.current.items);
    const modulesToDelete = new Set(pendingDeletionsRef.current.modules);
    
    if (itemsToDelete.size === 0 && modulesToDelete.size === 0) {
      return;
    }
        
    // Marca os items/módulos como confirmados para deleção
    itemsToDelete.forEach(id => confirmedDeletionsRef.current.items.add(id));
    modulesToDelete.forEach(id => confirmedDeletionsRef.current.modules.add(id));
        
    // Reinicia os conjuntos de deleção pendentes após agendar limpeza
    pendingDeletionsRef.current.items.clear();
    pendingDeletionsRef.current.modules.clear();
    flushTimerRef.current = null;
    
    // Agendar a limpeza do estado após a animação de remoção
    const cleanupTimer = setTimeout(() => {
      
      // Remover os items/módulos confirmados do estado
      setDeletingItems((s) => {
        const newSet = new Set(s);
        itemsToDelete.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      setDeletingModules((s) => {
        const newSet = new Set(s);
        modulesToDelete.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      setModules((prev) => {
        const result = prev
          .filter((m) => !modulesToDelete.has(m.id))
          .map((m) => ({
            ...m,
            items: m.items && Array.isArray(m.items) ? m.items.filter((i) => !itemsToDelete.has(i.id)) : [],
          }));
        
        console.log("State updated - modules count:", result.length);
        result.forEach(m => {
          const itemCount = m.items && Array.isArray(m.items) ? m.items.length : 0;
          console.log(`  Module ${m.id}: ${itemCount} items`);
        });
        
        return result;
      });
      
      timersRef.current.delete('batch-cleanup');
    }, ANIM_MS);
    
    timersRef.current.set('batch-cleanup', cleanupTimer);
  }

  function deleteTopic(moduleId, itemId) {
    console.log("Delete item:", itemId, "from module:", moduleId);
    
    if (!historyPushedRef.current) {
      pushHistory(modules);
      historyPushedRef.current = true;
    }
    
    pendingDeletionsRef.current.items.add(itemId);
    console.log("Pending items for deletion:", Array.from(pendingDeletionsRef.current.items));
    
    // Exibir animação visualmente
    setDeletingItems((s) => new Set(s).add(itemId));
    
    // Agendar flush usando microtask para agrupar todas as deleções neste loop de eventos
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    
    flushTimerRef.current = setTimeout(() => {
      flushPendingDeletions();
      // Resetar o flag de histórico após o flush
      historyPushedRef.current = false;
    }, 0);
  }

  function deleteModule(moduleId) {
    console.log("Delete module:", moduleId);
    
    if (!historyPushedRef.current) {
      pushHistory(modules);
      historyPushedRef.current = true;
    }
    
    pendingDeletionsRef.current.modules.add(moduleId);
    console.log("Pending modules for deletion:", Array.from(pendingDeletionsRef.current.modules));
    
    setDeletingModules((s) => new Set(s).add(moduleId));
    
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    
    flushTimerRef.current = setTimeout(() => {
      flushPendingDeletions();
      historyPushedRef.current = false;
    }, 0);
  }

  /* ---------- Adicionar / Editar ---------- */
  function addModule() {
    pushHistory(modules);
    setModules((p) => [...p, { id: makeId("newmod-"), title: "Novo módulo", items: [] }]);
  }

  function addTopic(moduleId) {
    pushHistory(modules);
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              items: [...m.items, { id: makeId("newtopic-"), title: "Novo topic", type: "topic" }],
            }
          : m,
      ),
    );
  }

  function addTest(moduleId) {
    pushHistory(modules);
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              items: [...m.items, { id: makeId("newtest-"), title: "Novo test", type: "test" }],
            }
          : m,
      ),
    );
  }
  function updateModuleTitle(moduleId, title) {
    pushHistory(modules);
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
  }

  function commitTopicLabel(moduleId, itemId, value) {
    pushHistory(modules);
    setModules((prev) =>
      prev.map((m) =>
        m.id !== moduleId
          ? m
          : {
              ...m,
              items: m.items.map((i) => (i.id === itemId ? { ...i, title: value } : i)),
            },
      ),
    );
  }

  /* ---------- Mover UMA posição (setas ↑↓) ---------- */
  function moveModule(modId, direction) {
    const idx = modules.findIndex((m) => m.id === modId);
    if (idx < 0) return;
    const delta = direction === "up" ? -1 : 1;
    const next = idx + delta;
    if (next < 0 || next >= modules.length) return;

    pushHistory(modules);
    setModules((prev) => arrayMove(prev, idx, next));
  }

  function moveTopic(modId, itemId, direction) {
    const mod = modules.find((m) => m.id === modId);
    if (!mod || !mod.items || !Array.isArray(mod.items)) return;
    const idx = mod.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const delta = direction === "up" ? -1 : 1;
    const next = idx + delta;
    if (next < 0 || next >= mod.items.length) return;

    pushHistory(modules);
    setModules((prev) => prev.map((m) => (m.id === modId ? { ...m, items: arrayMove(m.items, idx, next) } : m)));
  }

  /* ---------- Drag & Drop (VERTICAL) ---------- */
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null); // highlight do módulo alvo
  const [modDropIndicator, setModDropIndicator] = useState(null); // { modId, side: 'top'|'bottom' }
  const [itemDropIndicator, setItemDropIndicator] = useState(null); // { modId, itemId, side: 'top'|'bottom' }
  const [forbiddenDropId, setForbiddenDropId] = useState(null); // Visual feedback when trying to drag outside module

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  const findModuleByTopic = (id) => modules.find((m) => m.items && Array.isArray(m.items) && m.items.some((i) => i.id === id));

  function moduleIdForOver(overId) {
    if (!overId) return null;
    if (isModuleId(overId)) return overId;
    if (isTopicId(overId)) return findModuleByTopic(overId)?.id ?? null;
    return null;
  }

  function onDragStart(e) {
    setActiveId(e.active.id);
  }

  function onDragOver(e) {
    const over = e.over?.id ?? null;
    
    // Atualiza o estado do módulo alvo (overId) apenas se for um módulo ou um item dentro de um módulo
    if (isModuleId(e.active.id) && isModuleId(over)) {
      setOverId(over);
    } else if ((isTopicId(e.active.id) || isTestId(e.active.id)) && (isTopicId(over) || isTestId(over) || isModuleId(over))) {
      setOverId(over);
    } else {
      setOverId(null);
    }

    // Indicador de inserção (barra horizontal) para MÓDULOS (vertical)
    if (isModuleId(e.active.id)) {
      // Apenas permitir colisão com outros módulos
      if (!isModuleId(over)) {
        setModDropIndicator(null);
        setItemDropIndicator(null);
        return;
      }

      const overRect = e.over?.rect;
      const activeRect = e.active.rect.current.translated ?? e.active.rect.current.initial;
      if (overRect && activeRect) {
        const activeCenterY = activeRect.top + activeRect.height / 2;
        const overCenterY = overRect.top + overRect.height / 2;
        setModDropIndicator({
          modId: over,
          side: activeCenterY < overCenterY ? "top" : "bottom",
        });
        setItemDropIndicator(null);
      }
    }
    // Indicador de inserção (barra horizontal) para TÓPICOS/TESTES (itens dentro de módulos)
    else if (isTopicId(e.active.id) || isTestId(e.active.id)) {
      setModDropIndicator(null);
      
      // Permitir colisão com tópicos/testes ou com o próprio módulo para drop em área vazia
      if (!isTopicId(over) && !isTestId(over) && !isModuleId(over)) {
        setItemDropIndicator(null);
        setForbiddenDropId(null);
        return;
      }
      
      const fromModId = findModuleByTopic(e.active.id)?.id;
      let toModId = null;
      
      if (isTopicId(over) || isTestId(over)) {
        toModId = findModuleByTopic(over)?.id;
      } else if (isModuleId(over)) {
        toModId = over; // Drop na área vazia do módulo
      }
      
      if (!fromModId || !toModId) {
        setItemDropIndicator(null);
        setForbiddenDropId(null);
        return;
      }
      
      setForbiddenDropId(null); // Sem proibição de drop entre módulos
      
      const toMod = modules.find((m) => m.id === toModId);
      if (!toMod || !toMod.items || !Array.isArray(toMod.items)) {
        setItemDropIndicator(null);
        return;
      }
      
      const overRect = e.over?.rect;
      const activeRect = e.active.rect.current.translated ?? e.active.rect.current.initial;
      if (overRect && activeRect) {
        const activeCenterY = activeRect.top + activeRect.height / 2;
        const overCenterY = overRect.top + overRect.height / 2;
        
        let targetItemId = null;
        if (isTopicId(over) || isTestId(over)) {
          targetItemId = over;
        }
        
        setItemDropIndicator({
          modId: toModId,
          itemId: targetItemId,
          side: activeCenterY < overCenterY ? "top" : "bottom",
        });
      }
    } else {
      setModDropIndicator(null);
      setItemDropIndicator(null);
    }
  }

  function onDragCancel() {
    setActiveId(null);
    setOverId(null);
    setModDropIndicator(null);
    setItemDropIndicator(null);
    setForbiddenDropId(null);
  }

  function onDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    setOverId(null);
    const currentModIndicator = modDropIndicator;
    setModDropIndicator(null);
    setItemDropIndicator(null);
    setForbiddenDropId(null);
    if (!over) return;

    const a = active.id;
    const o = over.id;

    // Reordenar MÓDULOS (vertical) via drag
    if (isModuleId(a)) {
      const fromIndex = moduleIds.indexOf(a);
      const targetModId = moduleIdForOver(o);
      if (fromIndex === -1 || !targetModId) return;

      let toIndex = moduleIds.indexOf(targetModId);
      if (toIndex === -1) return;

      if (currentModIndicator && currentModIndicator.modId === targetModId) {
        toIndex = toIndex + (currentModIndicator.side === "bottom" ? 1 : 0);
        if (fromIndex < toIndex) toIndex -= 1;
      }

      if (fromIndex === toIndex) return;

      pushHistory(modules);
      setModules((prev) => {
        const list = [...prev];
        const [moving] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moving);
        return list;
      });
      return;
    }

    // Mover/Reordenar TÓPICOS/TESTES via drag (agora com suporte a cross-module drag)
    if (isTopicId(a) || isTestId(a)) {
      const fromModId = findModuleByTopic(a)?.id;
      let toModId = null;
      
      // Determinar o módulo de destino
      if (isTopicId(o) || isTestId(o)) {
        toModId = findModuleByTopic(o)?.id;
      } else if (isModuleId(o)) {
        toModId = o; // Drop na área vazia do módulo
      }

      if (!fromModId || !toModId) return;

      const fromMod = modules.find((m) => m.id === fromModId);
      const toMod = modules.find((m) => m.id === toModId);
      if (!fromMod || !toMod || !fromMod.items || !Array.isArray(fromMod.items) || !toMod.items || !Array.isArray(toMod.items)) return;

      const fromIndex = fromMod.items.findIndex((i) => i.id === a);
      if (fromIndex === -1) return;
      
      const movingItem = fromMod.items[fromIndex];
      
      // Se é o mesmo módulo, apenas reordenar
      if (fromModId === toModId) {
        let toIndex = (isTopicId(o) || isTestId(o)) ? toMod.items.findIndex((i) => i.id === o) : toMod.items.length;
        if (fromIndex === toIndex) return;
        
        pushHistory(modules);
        setModules((prev) => prev.map((m) => (m.id === fromMod.id ? { ...m, items: arrayMove(m.items, fromIndex, toIndex) } : m)));
        return;
      }
      
      // Se é um módulo diferente, mover o item
      pushHistory(modules);
      setModules((prev) =>
        prev.map((m) => {
          if (m.id === fromModId) {
            // Remove o item do módulo de origem
            return { ...m, items: m.items.filter((i) => i.id !== a) };
          }
          if (m.id === toModId) {
            // Adiciona o item no módulo de destino
            let toIndex = toMod.items.length;
            if (isTopicId(o) || isTestId(o)) {
              toIndex = m.items.findIndex((i) => i.id === o);
              // Se o item de destino está acima, insere acima; caso contrário, abaixo
              if (itemDropIndicator && itemDropIndicator.side === "bottom") {
                toIndex += 1;
              }
            }
            const newItems = [...m.items];
            newItems.splice(toIndex, 0, movingItem);
            return { ...m, items: newItems };
          }
          return m;
        }),
      );
      return;
    }
  }

  /* Overlay data */
  const activeTopic = (() => {
    if (!(isTopicId(activeId) || isTestId(activeId))) return null;
    const mod = findModuleByTopic(activeId);
    if (!mod || !mod.items || !Array.isArray(mod.items)) return null;
    return mod.items.find((i) => i.id === activeId);
  })();
  const activeModule = isModuleId(activeId) && modules.find((m) => m.id === activeId);

  return (
    <div>
      <Space wrap>
        <Button onClick={addModule}>+ {t("New module")}</Button>
        <Button onClick={undo} disabled={!history.length || isSaving}>
          Undo
        </Button>
        <Button onClick={redo} disabled={!future.length || isSaving}>
          Redo
        </Button>
        <Button type="primary" onClick={save} disabled={!isUnsaved || isSaving} loading={isSaving}>
          Guardar
        </Button>
      </Space>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
        {/* MÓDULOS: lista VERTICAL */}
        <SortableContext items={moduleIds}>
          <div className="flex flex-col gap-3 mt-6">
            {modules.map((mod, modIndex) => {
              const isActiveMod = isModuleId(activeId) && activeId === mod.id;
              const showTopBar = modDropIndicator && modDropIndicator.modId === mod.id && modDropIndicator.side === "top" && activeId !== mod.id;
              const showBottomBar = modDropIndicator && modDropIndicator.modId === mod.id && modDropIndicator.side === "bottom" && activeId !== mod.id;

              const canModUp = modIndex > 0;
              const canModDown = modIndex < modules.length - 1;

              return (
                <React.Fragment key={mod.id}>
                  {/* Indicador de inserção ACIMA */}
                  {showTopBar && <div className="h-1 bg-blue-500 rounded-full my-1" />}

                  <SortableModule
                    module={mod}
                    onTitleChange={updateModuleTitle}
                    onAddTopic={addTopic}
                    onAddTest={addTest}
                    onDeleteModule={deleteModule}
                    isDeleting={deletingModules.has(mod.id)}
                    isActive={isActiveMod}
                    dropRing={moduleIdForOver(overId) === mod.id}
                    canMoveUp={canModUp}
                    canMoveDown={canModDown}
                    onMoveUp={(id) => moveModule(id, "up")}
                    onMoveDown={(id) => moveModule(id, "down")}
                    activeId={activeId}
                    overId={overId}
                  >
                    {/* ZONA DROPPABLE DO MÓDULO (aceita drop em área vazia) */}
                    <ModuleDropArea id={mod.id}>
                      {/* TÓPICOS/TESTES: lista VERTICAL */}
                      <SortableContext items={(mod.items && Array.isArray(mod.items)) ? mod.items.map((i) => i?.id) : []}>
                        {!mod.items || mod.items.length === 0 ? (
                          <div className="text-gray-400 text-sm p-3 border border-dashed rounded bg-gray-50">Solta tópicos/testes aqui</div>
                        ) : (
                          mod.items.map((item, itemIndex) => {
                            const showItemTopBar = itemDropIndicator && itemDropIndicator.modId === mod.id && itemDropIndicator.itemId === item?.id && itemDropIndicator.side === "top" && activeId !== item?.id;
                            const showItemBottomBar = itemDropIndicator && itemDropIndicator.modId === mod.id && (itemDropIndicator.itemId === item?.id && itemDropIndicator.side === "bottom" || (itemDropIndicator.itemId === null && itemIndex === mod.items.length - 1)) && activeId !== item?.id;
                            
                            return (
                              <React.Fragment key={item?.id}>
                                {/* Indicador de inserção ACIMA do item */}
                                {showItemTopBar && <div className="h-1 bg-blue-500 rounded-full my-1" style={{ backgroundColor: "rgb(13, 110, 253)" }} />}
                                
                                <SortableTopic
                                  item={{ ...item, moduleId: mod?.id }}
                                  isDeleting={deletingItems.has(item?.id)}
                                  onDelete={deleteTopic}
                                  onCommitLabel={commitTopicLabel}
                                  canMoveUp={itemIndex > 0}
                                  canMoveDown={itemIndex < mod.items.length - 1}
                                  onMoveUp={(mId, itId) => moveTopic(mId, itId, "up")}
                                  onMoveDown={(mId, itId) => moveTopic(mId, itId, "down")}
                                  navigate={navigate}
                                  course={course}
                                  activeId={activeId}
                                  overId={overId}
                                />
                                
                                {/* Indicador de inserção ABAIXO do item */}
                                {showItemBottomBar && <div className="h-1 bg-blue-500 rounded-full my-1" style={{ backgroundColor: "rgb(13, 110, 253)" }} />}
                              </React.Fragment>
                            );
                          })
                        )}
                      </SortableContext>
                    </ModuleDropArea>
                  </SortableModule>

                  {/* Indicador de inserção ABAIXO */}
                  {showBottomBar && <div className="h-1 bg-blue-500 rounded-full my-1" />}
                </React.Fragment>
              );
            })}
          </div>
        </SortableContext>

        {/* DragOverlay sem dropAnimation para evitar flicker */}
        <DragOverlay dropAnimation={null}>{activeTopic ? <TopicOverlay item={activeTopic} /> : activeModule ? <ModuleOverlay module={activeModule} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
