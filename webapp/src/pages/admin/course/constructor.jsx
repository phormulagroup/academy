import React, { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, DragOverlay, useSensor, useSensors, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ANTD */
import { Card, Button, Input, Space, Typography, Popconfirm, message, Tag } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { AiOutlineClose, AiOutlineDelete, AiOutlineEdit, AiOutlineSave } from "react-icons/ai";
import { LuLetterText } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import endpoints from "../../../utils/endpoints";

const { Text } = Typography;

/* -------------------- Utils -------------------- */
const makeId = (p = "") => p + Math.random().toString(36).slice(2, 8);
const isModuleId = (id) => typeof id === "string" && id.startsWith("mod-");
const isTopicId = (id) => typeof id === "string" && id.startsWith("it-");

/* -------------------- Grip (drag handle) -------------------- */
function Grip({ attributes, listeners, title }) {
  return (
    <div {...attributes} {...listeners} title={title} className="cursor-grab px-1 select-none text-gray-500">
      ⋮⋮
    </div>
  );
}

/* -------------------- Wrapper de animação de remoção -------------------- */
function RemoveAnim({ isRemoving, duration = 200, children }) {
  return (
    <div
      className="grid transition-all"
      style={{
        gridTemplateRows: isRemoving ? "0fr" : "1fr",
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? "scale(0.95)" : "scale(1)",
        transition: `grid-template-rows ${duration}ms, opacity ${duration}ms, transform ${duration}ms`,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/* -------------------- Zona droppable do MÓDULO (aceita drop em área vazia) -------------------- */
function ModuleDropArea({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? "bg-blue-50/40 rounded" : ""}>
      {children}
    </div>
  );
}

/* -------------------- Tópico/Teste ordenável (com botão Editar + setas ↑↓) -------------------- */
function SortableTopic({ item, onDelete, onCommitLabel, isDeleting, canMoveUp, canMoveDown, onMoveUp, onMoveDown, navigate, course }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id });

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.label);

  useEffect(() => {
    setValue(item.label);
  }, [item.label]);

  const commit = () => {
    if (value !== item.label) onCommitLabel(item.moduleId, item.id, value);
    setEditing(false);
  };
  const cancel = () => {
    setValue(item.label);
    setEditing(false);
  };

  return (
    <RemoveAnim isRemoving={isDeleting}>
      <Card
        ref={setNodeRef}
        className="border mb-2 mb-2!"
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
        }}
        bodyStyle={{ padding: 8 }}
      >
        <div className="flex items-center gap-2">
          <Grip attributes={editing ? {} : attributes} listeners={editing ? {} : listeners} title="Arrastar tópico/teste" />

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
              <Tag color={item.type === "teste" ? "geekblue" : "green"}>{item.type}</Tag>
              <Text className="flex-1">{item.label}</Text>

              {/* Setas ↑ ↓ para mover uma posição */}
              <Space size={4}>
                <Button icon={<ArrowUpOutlined />} onClick={() => onMoveUp(item.moduleId, item.id)} disabled={!canMoveUp} />
                <Button icon={<ArrowDownOutlined />} onClick={() => onMoveDown(item.moduleId, item.id)} disabled={!canMoveDown} />
              </Space>

              <Space>
                <Button onClick={() => navigate(`/admin/course/${course.id}/topic/${item.id}`)} icon={<AiOutlineEdit />} />
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
    <Card size="small" className="shadow-xl border" bodyStyle={{ padding: 8 }}>
      <div className="flex items-center gap-2 opacity-80">
        <span>⋮⋮</span>
        <Tag color={item.type === "teste" ? "geekblue" : "green"}>{item.type}</Tag>
        <Text>{item.label}</Text>
      </div>
    </Card>
  );
}

function ModuleOverlay({ module }) {
  if (!module) return null;
  return (
    <Card className="shadow-2xl border opacity-80">
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
}) {
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: module.id });

  const [editing, setEditing] = useState(false);

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
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isActive ? 0 : 1, // mantém o espaço do módulo “ativo”
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
  const [isUnsaved, setIsUnsaved] = useState(true);
  const [original, setOriginal] = useState([]);
  const [modules, setModules] = useState([]);

  /* ---------- Undo/Redo ---------- */
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  /* ---------- Eliminar com animação ---------- */
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [deletingModules, setDeletingModules] = useState(new Set());
  const timersRef = useRef({ items: new Map(), mods: new Map() });
  const ANIM_MS = 200;

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
        const modulesData = res.data.modules.map((mod) => ({
          id: `mod-${mod.id}`,
          title: mod.title,
          items: mod.items
            ? mod.items
                .filter((t) => t.module_id === mod.id)
                .map((top) => ({
                  id: `it-${top.id}`,
                  title: top.title,
                  type: top.type,
                }))
            : [],
        }));

        console.log(modulesData);
        setModules(modulesData);
        setOriginal(Object.assign([], modulesData));
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
    try {
      console.log(modules);
      const insert = await axios.post(endpoints.course.module, {
        data: modules.map((m) => ({
          ...m,
          id_course: course.id,
          items: m.items.map((i) => ({ ...i, module_id: m.id })),
        })),
      });
      console.log(insert);
      setOriginal(Object.assign([], modules));
      message.success("Estado guardado!");
    } catch (err) {
      message.error("Falha ao guardar.");
    }
  }

  function cancelPendingDeletes() {
    timersRef.current.items.forEach((t) => clearTimeout(t));
    timersRef.current.mods.forEach((t) => clearTimeout(t));
    timersRef.current.items.clear();
    timersRef.current.mods.clear();
    setDeletingItems(new Set());
    setDeletingModules(new Set());
  }

  function deleteTopic(moduleId, itemId) {
    pushHistory(modules);
    setDeletingItems((s) => new Set(s).add(itemId));
    const t = setTimeout(() => {
      setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m)));
      setDeletingItems((s) => {
        const n = new Set(s);
        n.delete(itemId);
        return n;
      });
      timersRef.current.items.delete(itemId);
    }, ANIM_MS);
    timersRef.current.items.set(itemId, t);
  }

  function deleteModule(moduleId) {
    pushHistory(modules);
    setDeletingModules((s) => new Set(s).add(moduleId));
    const t = setTimeout(() => {
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      setDeletingModules((s) => {
        const n = new Set(s);
        n.delete(moduleId);
        return n;
      });
      timersRef.current.mods.delete(moduleId);
    }, ANIM_MS);
    timersRef.current.mods.set(moduleId, t);
  }

  /* ---------- Adicionar / Editar ---------- */
  function addTopic(moduleId) {
    pushHistory(modules);
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              items: [...m.items, { id: makeId("it-"), label: "Novo tópico", type: "tópico" }],
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
              items: [...m.items, { id: makeId("it-"), label: "Novo teste", type: "teste" }],
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
              items: m.items.map((i) => (i.id === itemId ? { ...i, label: value } : i)),
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
    if (!mod) return;
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  const findModuleByTopic = (id) => modules.find((m) => m.items.some((i) => i.id === id));

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
    setOverId(over);

    // Indicador de inserção (barra horizontal) para MÓDULOS (vertical)
    if (isModuleId(e.active.id)) {
      const targetModId = moduleIdForOver(over);
      if (!targetModId) {
        setModDropIndicator(null);
        return;
      }

      const overRect = e.over?.rect;
      const activeRect = e.active.rect.current.translated ?? e.active.rect.current.initial;
      if (overRect && activeRect) {
        const activeCenterY = activeRect.top + activeRect.height / 2;
        const overCenterY = overRect.top + overRect.height / 2;
        setModDropIndicator({
          modId: targetModId,
          side: activeCenterY < overCenterY ? "top" : "bottom",
        });
      }
    } else {
      setModDropIndicator(null);
    }
  }

  function onDragCancel() {
    setActiveId(null);
    setOverId(null);
    setModDropIndicator(null);
  }

  function onDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    setOverId(null);
    const currentIndicator = modDropIndicator;
    setModDropIndicator(null);
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

      if (currentIndicator && currentIndicator.modId === targetModId) {
        toIndex = toIndex + (currentIndicator.side === "bottom" ? 1 : 0);
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

    // Mover/Reordenar TÓPICOS/TESTES via drag
    if (isTopicId(a)) {
      const fromModId = moduleIdForOver(a) ?? findModuleByTopic(a)?.id;
      const toModId = (isTopicId(o) && moduleIdForOver(o)) || (isModuleId(o) && o);

      if (!fromModId || !toModId) return;

      const fromMod = modules.find((m) => m.id === fromModId);
      const toMod = modules.find((m) => m.id === toModId);
      if (!fromMod || !toMod) return;

      const fromIndex = fromMod.items.findIndex((i) => i.id === a);
      let toIndex = isTopicId(o) ? toMod.items.findIndex((i) => i.id === o) : toMod.items.length;

      if (fromMod.id === toMod.id) {
        if (fromIndex === toIndex) return;
        pushHistory(modules);
        setModules((prev) => prev.map((m) => (m.id === fromMod.id ? { ...m, items: arrayMove(m.items, fromIndex, toIndex) } : m)));
        return;
      }

      if (toIndex < 0) toIndex = toMod.items.length;
      pushHistory(modules);
      const moving = fromMod.items[fromIndex];

      setModules((prev) =>
        prev.map((m) => {
          if (m.id === fromMod.id) {
            const arr = [...m.items];
            arr.splice(fromIndex, 1);
            return { ...m, items: arr };
          }
          if (m.id === toMod.id) {
            const arr = [...m.items];
            arr.splice(toIndex, 0, moving);
            return { ...m, items: arr };
          }
          return m;
        }),
      );
    }
  }

  /* Overlay data */
  const activeTopic = isTopicId(activeId) && findModuleByTopic(activeId)?.items.find((i) => i.id === activeId);
  const activeModule = isModuleId(activeId) && modules.find((m) => m.id === activeId);

  return (
    <div>
      <Space wrap>
        <Button onClick={() => setModules((p) => [...p, { id: makeId("newmod-"), title: "Novo módulo", items: [] }])}>+ Novo módulo</Button>
        <Button onClick={undo} disabled={!history.length}>
          Undo
        </Button>
        <Button onClick={redo} disabled={!future.length}>
          Redo
        </Button>
        <Button type="primary" onClick={save} disabled={!isUnsaved}>
          Guardar
        </Button>
      </Space>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
        {/* MÓDULOS: lista VERTICAL */}
        <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
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
                  >
                    {/* ZONA DROPPABLE DO MÓDULO (aceita drop em área vazia) */}
                    <ModuleDropArea id={mod.id}>
                      {/* TÓPICOS/TESTES: lista VERTICAL */}
                      <SortableContext items={mod.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                        {mod.items.length === 0 ? (
                          <div className="text-gray-400 text-sm p-3 border border-dashed rounded bg-gray-50">Solta tópicos/testes aqui</div>
                        ) : (
                          mod.items.map((item, itemIndex) => (
                            <SortableTopic
                              key={item.id}
                              item={{ ...item, moduleId: mod.id }}
                              isDeleting={deletingItems.has(item.id)}
                              onDelete={deleteTopic}
                              onCommitLabel={commitTopicLabel}
                              canMoveUp={itemIndex > 0}
                              canMoveDown={itemIndex < mod.items.length - 1}
                              onMoveUp={(mId, itId) => moveTopic(mId, itId, "up")}
                              onMoveDown={(mId, itId) => moveTopic(mId, itId, "down")}
                              navigate={navigate}
                              course={course}
                            />
                          ))
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
