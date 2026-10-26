// Fábricas de campos do painel do editor (o "Estilo/Avançado" de cada
// bloco). Cada função devolve uma definição de campo do Puck; a
// propriedade extra `section` agrupa campos em secções recolhíveis dentro
// de cada separador (ver DesignPanel em components/tabsField.jsx).

import { useMemo, useState, lazy, Suspense } from "react";
import { FieldLabel, AutoField, usePuck } from "@puckeditor/core";
import { Button, ColorPicker, Input, InputNumber, Modal, Radio, Select, Slider, Switch, Tooltip } from "antd";
import { Link as LinkIcon, Unlink, Monitor, Tablet, Smartphone, RotateCcw, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { iconNames } from "lucide-react/dynamic";
import { BREAKPOINTS, resolveForDevice, toBucket } from "./css";
import { mediaSrc } from "./helpers";
import ElementIcon, { normalizeIconName } from "./icon";

// Biblioteca de multimédia da Academy (modal): close({ img: nome }) ao escolher; fileType "image" ou "pdf" limita a lista
const Media = lazy(() => import("../../media/media"));

const muted = { fontSize: 11, color: "var(--puck-color-grey-05)", textTransform: "uppercase" };

// --------------------------------------------------------------------------
// Responsivo
// --------------------------------------------------------------------------

export const VIEWPORTS = [
  { width: "100%", height: "auto", label: "Desktop", icon: "Monitor" },
  { width: 820, height: "auto", label: "Tablet", icon: "Tablet" },
  { width: 390, height: "auto", label: "Mobile", icon: "Smartphone" },
];

const DEVICE_ICONS = [
  { key: "desktop", Icon: Monitor, viewport: VIEWPORTS[0], label: "Desktop" },
  { key: "tablet", Icon: Tablet, viewport: VIEWPORTS[1], label: "Tablet" },
  { key: "mobile", Icon: Smartphone, viewport: VIEWPORTS[2], label: "Mobile" },
];

export function widthToDevice(width) {
  if (typeof width !== "number") return "desktop";
  if (width <= BREAKPOINTS.mobile) return "mobile";
  if (width <= BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

export function useCurrentDevice() {
  const { appState } = usePuck();
  return widthToDevice(appState?.ui?.viewports?.current?.width);
}

function DeviceSwitcher({ device }) {
  const { dispatch } = usePuck();
  const setDevice = (viewport) =>
    dispatch({
      type: "setUi",
      ui: (prev) => ({ ...prev, viewports: { ...prev.viewports, current: { width: viewport.width, height: viewport.height } } }),
    });

  return (
    <div style={{ display: "flex", gap: 2 }}>
      {DEVICE_ICONS.map(({ key, Icon, viewport, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setDevice(viewport)}
          title={label}
          className={`el-device-btn${device === key ? " el-device-btn--active" : ""}`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}

function ResponsiveFieldRender({ baseFieldDef, field, value, onChange, readOnly }) {
  const device = useCurrentDevice();
  const bucket = toBucket(value);
  const label = field.label || baseFieldDef.label;
  const hasOverride = device !== "desktop" && bucket[device] !== undefined && bucket[device] !== null && bucket[device] !== "";
  // Mostra o valor efetivo (herdado de desktop/tablet quando este
  // dispositivo não tem valor próprio) — como no Elementor.
  const effective = resolveForDevice(bucket, device);
  const update = (val) => onChange({ ...bucket, [device]: val });
  const reset = () => {
    const next = { ...bucket };
    delete next[device];
    onChange(next);
  };

  return (
    <div className="el-field">
      <div className="el-field__head">
        <span className="el-field__label">{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {hasOverride && (
            <Tooltip title="Repor (herdar do dispositivo maior)">
              <button type="button" className="el-device-btn" onClick={reset}>
                <RotateCcw size={12} />
              </button>
            </Tooltip>
          )}
          <DeviceSwitcher device={device} />
        </div>
      </div>
      <AutoField field={{ ...baseFieldDef, label: undefined, __bare: true }} value={effective} onChange={update} readOnly={readOnly} />
    </div>
  );
}

// Envolve um campo para guardar {desktop, tablet, mobile}; o dispositivo a
// editar segue o seletor de dispositivo do canvas.
export function responsive(baseFieldDef) {
  return {
    type: "custom",
    label: baseFieldDef.label,
    section: baseFieldDef.section,
    showIf: baseFieldDef.showIf,
    __responsive: true,
    render: (props) => <ResponsiveFieldRender baseFieldDef={baseFieldDef} {...props} />,
  };
}

// Os campos "nus" (dentro de um responsivo) não repetem o label.
function Labelled({ field, name, readOnly, children }) {
  if (field.__bare || field.label === undefined) return <div className="el-field">{children}</div>;
  return (
    <FieldLabel label={field.label || name} readOnly={readOnly} icon={field.labelIcon} el="div">
      {children}
    </FieldLabel>
  );
}

// --------------------------------------------------------------------------
// Cor (com cores da marca, guardadas como var(--brand-...) para que mudar a
// marca em "Personalizar" atualize todas as páginas)
// --------------------------------------------------------------------------

export const BRAND_SWATCHES = [
  { label: "Principal", value: "var(--brand-primary)" },
  { label: "Principal escura", value: "var(--brand-primary-dark)" },
  { label: "Principal clara", value: "var(--brand-primary-lighter)" },
  { label: "Secundária", value: "var(--brand-secondary)" },
  { label: "Sucesso", value: "var(--brand-success)" },
  { label: "Erro", value: "var(--brand-error)" },
  { label: "Branco", value: "#ffffff" },
  { label: "Preto", value: "#000000" },
  { label: "Cinza escuro", value: "#252525" },
  { label: "Cinza", value: "#8A8D98" },
  { label: "Cinza claro", value: "#F2F3F5" },
];

function resolveCssColor(value) {
  if (!value || typeof value !== "string" || !value.startsWith("var(")) return value;
  try {
    const name = value.slice(4, -1).trim();
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
  } catch {
    return undefined;
  }
}

function ColorInput({ field, name, value, onChange, readOnly }) {
  const isVar = typeof value === "string" && value.startsWith("var(");
  const swatch = BRAND_SWATCHES.find((s) => s.value === value);
  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <ColorPicker
          value={resolveCssColor(value) || undefined}
          onChange={(c) => onChange(c.toHexString ? (c.toRgb().a < 1 ? c.toRgbString() : c.toHexString()) : c)}
          onClear={() => onChange(undefined)}
          allowClear
          disabled={readOnly}
          presets={[{ label: "Cores da marca e base", colors: BRAND_SWATCHES.map((s) => resolveCssColor(s.value) || "#000") }]}
          showText={() => <span style={{ fontSize: 12 }}>{swatch ? swatch.label : value || "Sem cor"}</span>}
          style={{ flex: 1, justifyContent: "flex-start" }}
        />
      </div>
      <div className="el-swatches">
        {BRAND_SWATCHES.slice(0, 6).map((s) => (
          <Tooltip key={s.value} title={`${s.label} (cor da marca)`}>
            <button
              type="button"
              disabled={readOnly}
              className={`el-swatch${value === s.value ? " el-swatch--active" : ""}`}
              style={{ background: s.value }}
              onClick={() => onChange(s.value)}
            />
          </Tooltip>
        ))}
        {isVar && <span style={{ ...muted, textTransform: "none", alignSelf: "center" }}>ligada à marca</span>}
      </div>
    </Labelled>
  );
}

export const colorField = (label, extra = {}) => ({ type: "custom", label, ...extra, render: (p) => <ColorInput {...p} /> });

// --------------------------------------------------------------------------
// Números com unidade / sliders
// --------------------------------------------------------------------------

function UnitInput({ field, name, value, onChange, readOnly }) {
  const units = field.units || ["px", "%", "em", "rem", "vw", "vh"];
  const v = value && typeof value === "object" ? value : value !== undefined && value !== null && value !== "" ? { value: Number(value), unit: units[0] } : {};
  const unit = v.unit || units[0];
  const max = field.maxByUnit?.[unit] ?? field.max ?? (unit === "%" ? 100 : unit === "px" ? 1600 : 100);
  const isAuto = unit === "auto";

  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {field.slider !== false && !isAuto && (
          <Slider
            style={{ flex: 1, margin: "0 6px" }}
            min={field.min ?? 0}
            max={max}
            step={field.step ?? (unit === "em" || unit === "rem" ? 0.1 : 1)}
            value={typeof v.value === "number" ? v.value : undefined}
            onChange={(n) => onChange({ value: n, unit })}
            disabled={readOnly}
          />
        )}
        {!isAuto && (
          <InputNumber
            style={{ width: field.slider === false ? "100%" : 76 }}
            value={v.value ?? undefined}
            min={field.min ?? (field.allowNegative ? undefined : 0)}
            step={field.step ?? (unit === "em" || unit === "rem" ? 0.1 : 1)}
            placeholder={field.placeholder}
            onChange={(n) => onChange(n === null ? undefined : { value: n, unit })}
            disabled={readOnly}
          />
        )}
        {units.length > 1 && (
          <Select
            size="small"
            style={{ width: isAuto ? "100%" : 64 }}
            value={unit}
            options={units.map((u) => ({ label: u === "auto" ? "auto" : u, value: u }))}
            onChange={(u) => onChange(u === "auto" ? { unit: "auto" } : { value: v.value ?? undefined, unit: u })}
            disabled={readOnly}
          />
        )}
      </div>
    </Labelled>
  );
}

export const unitField = (label, opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <UnitInput {...p} field={{ ...opts, ...p.field }} /> });

function SliderInput({ field, name, value, onChange, readOnly }) {
  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Slider
          style={{ flex: 1, margin: "0 6px" }}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
          disabled={readOnly}
        />
        <InputNumber
          style={{ width: 76 }}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value ?? undefined}
          onChange={(n) => onChange(n === null ? undefined : n)}
          disabled={readOnly}
          suffix={field.suffix ? <span style={{ fontSize: 11, opacity: 0.6 }}>{field.suffix}</span> : undefined}
        />
      </div>
    </Labelled>
  );
}

export const sliderField = (label, opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <SliderInput {...p} field={{ ...opts, ...p.field }} /> });

// --------------------------------------------------------------------------
// Espaçamento (4 lados, ligados ou não) e raio por canto
// --------------------------------------------------------------------------

const SIDES = [
  { key: "top", label: "Topo" },
  { key: "right", label: "Dir." },
  { key: "bottom", label: "Baixo" },
  { key: "left", label: "Esq." },
];
const CORNERS = [
  { key: "topLeft", legacy: "top", label: "Sup. esq." },
  { key: "topRight", legacy: "right", label: "Sup. dir." },
  { key: "bottomRight", legacy: "bottom", label: "Inf. dir." },
  { key: "bottomLeft", legacy: "left", label: "Inf. esq." },
];

function BoxInput({ field, name, value, onChange, readOnly, keys }) {
  const v = value || {};
  const units = field.units || ["px", "%", "em", "rem"];
  const unit = v.unit || "px";
  const read = (k) => v[k.key] ?? (k.legacy ? v[k.legacy] : undefined);
  const linked = v.linked === true;
  const update = (k, n) => {
    const next = { ...v };
    if (k.legacy) delete next[k.legacy];
    if (linked) keys.forEach((kk) => (next[kk.key] = n ?? 0));
    else next[k.key] = n ?? 0;
    onChange(next);
  };

  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        {keys.map((k) => (
          <div key={k.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <InputNumber
              size="small"
              min={field.allowNegative ? undefined : 0}
              value={read(k) ?? undefined}
              placeholder="0"
              onChange={(n) => update(k, n)}
              disabled={readOnly}
              style={{ width: "100%" }}
              controls={false}
            />
            <span style={{ ...muted, fontSize: 9 }}>{k.label}</span>
          </div>
        ))}
        <Tooltip title={linked ? "Valores ligados" : "Ligar valores"}>
          <button
            type="button"
            className={`el-device-btn${linked ? " el-device-btn--active" : ""}`}
            style={{ marginTop: 2 }}
            onClick={() => onChange({ ...v, linked: !linked })}
            disabled={readOnly}
          >
            {linked ? <LinkIcon size={13} /> : <Unlink size={13} />}
          </button>
        </Tooltip>
        {units.length > 1 && (
          <Select size="small" style={{ width: 58 }} value={unit} options={units.map((u) => ({ label: u, value: u }))} onChange={(u) => onChange({ ...v, unit: u })} disabled={readOnly} />
        )}
      </div>
    </Labelled>
  );
}

export const spacingField = (label, opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <BoxInput {...p} field={{ ...opts, ...p.field }} keys={SIDES} /> });
export const cornersField = (label, opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <BoxInput {...p} field={{ units: ["px", "%"], ...opts, ...p.field }} keys={CORNERS} /> });

// --------------------------------------------------------------------------
// Básicos com o visual do resto do painel
// --------------------------------------------------------------------------

function SwitchInput({ field, name, value, onChange, readOnly }) {
  return (
    <div className="el-field el-field--inline">
      <span className="el-field__label">{field.label || name}</span>
      <Switch size="small" checked={!!value} onChange={onChange} disabled={readOnly} />
    </div>
  );
}
export const switchField = (label, opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <SwitchInput {...p} /> });

function SelectInput({ field, name, value, onChange, readOnly }) {
  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <Select
        style={{ width: "100%" }}
        // Sem valor guardado, mostra a opção "" (Herdar/Nenhuma…) quando existe.
        value={value ?? field.placeholderValue ?? (field.options?.some((o) => o.value === "") ? "" : undefined)}
        options={field.options}
        onChange={onChange}
        disabled={readOnly}
        showSearch={field.options?.length > 8}
        optionFilterProp="label"
        allowClear={field.allowClear}
      />
    </Labelled>
  );
}
export const selectField = (label, options, opts = {}) => ({ type: "custom", label, options, ...opts, render: (p) => <SelectInput {...p} field={{ options, ...opts, ...p.field }} /> });

function ButtonsInput({ field, name, value, onChange, readOnly }) {
  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <Radio.Group size="small" value={value ?? (field.options?.some((o) => o.value === "") ? "" : undefined)} onChange={(e) => onChange(e.target.value)} disabled={readOnly} optionType="button" buttonStyle="solid" className="el-radio-buttons">
        {field.options.map((o) => (
          <Tooltip key={String(o.value)} title={o.title}>
            <Radio.Button value={o.value}>{o.label}</Radio.Button>
          </Tooltip>
        ))}
      </Radio.Group>
    </Labelled>
  );
}
export const buttonsField = (label, options, opts = {}) => ({ type: "custom", label, options, ...opts, render: (p) => <ButtonsInput {...p} field={{ options, ...opts, ...p.field }} /> });

export const alignOptions = (withJustify = false) => [
  { label: <AlignLeft size={14} />, value: "left", title: "Esquerda" },
  { label: <AlignCenter size={14} />, value: "center", title: "Centro" },
  { label: <AlignRight size={14} />, value: "right", title: "Direita" },
  ...(withJustify ? [{ label: <AlignJustify size={14} />, value: "justify", title: "Justificado" }] : []),
];
export const alignField = (label = "Alinhamento", opts = {}) => buttonsField(label, alignOptions(opts.justify), opts);

function TextInput({ field, name, value, onChange, readOnly }) {
  const Comp = field.multiline ? Input.TextArea : Input;
  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <Comp
        value={value ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        {...(field.multiline ? { autoSize: { minRows: field.rows || 3, maxRows: 16 } } : {})}
        style={field.monospace ? { fontFamily: "monospace", fontSize: 12 } : undefined}
      />
      {field.help && <div style={{ ...muted, textTransform: "none", marginTop: 4 }}>{field.help}</div>}
    </Labelled>
  );
}
export const textField = (label, opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <TextInput {...p} field={{ ...opts, ...p.field }} /> });

// --------------------------------------------------------------------------
// Link
// --------------------------------------------------------------------------

function LinkInput({ field, name, value, onChange, readOnly }) {
  const v = typeof value === "string" ? { url: value } : value || {};
  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <Input value={v.url || ""} placeholder="https://… , /cursos ou #ancora" onChange={(e) => onChange({ ...v, url: e.target.value })} disabled={readOnly} />
      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          <Switch size="small" checked={!!v.newTab} onChange={(c) => onChange({ ...v, newTab: c })} disabled={readOnly} /> Novo separador
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          <Switch size="small" checked={!!v.nofollow} onChange={(c) => onChange({ ...v, nofollow: c })} disabled={readOnly} /> nofollow
        </label>
      </div>
    </Labelled>
  );
}
export const linkField = (label = "Link", opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <LinkInput {...p} /> });

// --------------------------------------------------------------------------
// Ícone (com pesquisa e pré-visualização, em vez de um select com 1500
// nomes sem ícone)
// --------------------------------------------------------------------------

const ALL_ICONS = iconNames;

function IconPicker({ field, name, value, onChange, readOnly }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const current = normalizeIconName(value);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase().replace(/\s+/g, "-");
    return (s ? ALL_ICONS.filter((n) => n.includes(s)) : ALL_ICONS).slice(0, 240);
  }, [search]);

  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="el-icon-preview" onClick={() => !readOnly && setOpen(true)} disabled={readOnly}>
          {current ? <ElementIcon name={current} size={22} /> : <span style={muted}>—</span>}
        </button>
        <Button size="small" onClick={() => setOpen(true)} disabled={readOnly}>
          {current ? "Trocar" : "Escolher"}
        </Button>
        {current && field.allowClear !== false && (
          <Button size="small" type="text" onClick={() => onChange(undefined)} disabled={readOnly}>
            Remover
          </Button>
        )}
      </div>
      {open && (
        <Modal open title="Escolher ícone" footer={null} onCancel={() => setOpen(false)} width={720}>
          <Input autoFocus allowClear placeholder="Pesquisar (em inglês: heart, check, book, user…)" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="el-icon-grid">
            {filtered.map((n) => (
              <Tooltip key={n} title={n} mouseEnterDelay={0.4}>
                <button
                  type="button"
                  className={`el-icon-grid__item${n === current ? " el-icon-grid__item--active" : ""}`}
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                >
                  <ElementIcon name={n} size={22} />
                </button>
              </Tooltip>
            ))}
          </div>
          {filtered.length === 240 && <p style={{ ...muted, textTransform: "none", marginTop: 8 }}>A mostrar os primeiros 240 — refine a pesquisa.</p>}
        </Modal>
      )}
    </Labelled>
  );
}
export const iconField = (label = "Ícone", opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <IconPicker {...p} field={{ ...opts, ...p.field }} /> });

// --------------------------------------------------------------------------
// Multimédia (imagem, vídeo, áudio, PDF) — guarda {url: nomeDoFicheiro, alt}
// --------------------------------------------------------------------------

export const MEDIA_KINDS = {
  image: { label: "imagem", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
  video: { label: "vídeo", extensions: ["mp4", "webm", "mov", "m4v"] },
  audio: { label: "áudio", extensions: ["mp3", "wav", "ogg", "m4a", "aac"] },
  pdf: { label: "PDF", extensions: ["pdf"] },
};

function MediaPicker({ field, name, value, onChange, readOnly }) {
  const [open, setOpen] = useState(false);
  const kind = field.kind || "image";
  const v = typeof value === "string" ? { url: value } : value || null;
  const src = mediaSrc(v);

  const handleSelect = (res) => {
    // Trocar a imagem mantém o texto alternativo já escrito.
    if (res?.img) onChange({ ...(field.keepAlt || field.withAlt ? { alt: v?.alt } : {}), url: res.img });
    setOpen(false);
  };

  return (
    <Labelled field={field} name={name} readOnly={readOnly}>
      <div className="el-media-picker" onClick={() => !readOnly && setOpen(true)}>
        {src && kind === "image" ? (
          <img src={src} alt="" />
        ) : src ? (
          <span style={{ fontSize: 12, wordBreak: "break-all", padding: 8 }}>{v.url}</span>
        ) : (
          <span style={{ ...muted, textTransform: "none" }}>Clique para escolher {MEDIA_KINDS[kind]?.label || "ficheiro"}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <Button size="small" onClick={() => setOpen(true)} disabled={readOnly}>
          {src ? "Trocar" : "Escolher"}
        </Button>
        {src && (
          <Button size="small" type="text" onClick={() => onChange(null)} disabled={readOnly}>
            Limpar
          </Button>
        )}
      </div>
      {kind === "image" && field.withAlt && src && (
        <Input
          size="small"
          style={{ marginTop: 6 }}
          placeholder="Texto alternativo (acessibilidade)"
          value={v?.alt || ""}
          onChange={(e) => onChange({ ...v, alt: e.target.value })}
          disabled={readOnly}
        />
      )}
      {open && (
        <Suspense fallback={null}>
          <Media mediaKey="img" open={open} close={handleSelect} fileType={kind === "image" || kind === "pdf" ? kind : undefined} />
        </Suspense>
      )}
    </Labelled>
  );
}
export const mediaField = (label = "Imagem", opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <MediaPicker {...p} field={{ ...opts, ...p.field }} /> });

// --------------------------------------------------------------------------
// Gradiente e sombra
// --------------------------------------------------------------------------

function GradientInput({ field, name, value, onChange, readOnly }) {
  const v = value || {};
  const set = (k, val) => onChange({ ...v, [k]: val });
  return (
    <div className="el-field">
      <div className="el-field el-field--inline">
        <span className="el-field__label">{field.label || name}</span>
        <Switch size="small" checked={!!v.enabled} onChange={(c) => set("enabled", c)} disabled={readOnly} />
      </div>
      {v.enabled && (
        <div className="el-subfields">
          <Radio.Group size="small" value={v.type || "linear"} onChange={(e) => set("type", e.target.value)} optionType="button" buttonStyle="solid" className="el-radio-buttons">
            <Radio.Button value="linear">Linear</Radio.Button>
            <Radio.Button value="radial">Radial</Radio.Button>
          </Radio.Group>
          <AutoField field={colorField("Cor 1")} value={v.from} onChange={(c) => set("from", c)} />
          <AutoField field={sliderField("Posição cor 1", { min: 0, max: 100, suffix: "%" })} value={v.fromStop ?? 0} onChange={(n) => set("fromStop", n)} />
          <AutoField field={colorField("Cor 2")} value={v.to} onChange={(c) => set("to", c)} />
          <AutoField field={sliderField("Posição cor 2", { min: 0, max: 100, suffix: "%" })} value={v.toStop ?? 100} onChange={(n) => set("toStop", n)} />
          {(v.type || "linear") === "linear" && (
            <AutoField field={sliderField("Ângulo", { min: 0, max: 360, suffix: "°" })} value={v.angle ?? 180} onChange={(n) => set("angle", n)} />
          )}
        </div>
      )}
    </div>
  );
}
export const gradientField = (label = "Gradiente", opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <GradientInput {...p} /> });

export const SHADOW_PRESETS = [
  { label: "Nenhuma", value: "" },
  { label: "Pequena", value: "0 1px 2px rgba(0,0,0,0.08)" },
  { label: "Média", value: "0 4px 12px rgba(0,0,0,0.12)" },
  { label: "Grande", value: "0 12px 32px rgba(0,0,0,0.16)" },
  { label: "Suave larga", value: "0 20px 50px rgba(0,0,0,0.10)" },
  { label: "Personalizada", value: "custom" },
];

function ShadowInput({ field, name, value, onChange, readOnly }) {
  const isCustom = value && typeof value === "object";
  const v = isCustom ? value : {};
  const set = (k, val) => onChange({ ...v, enabled: true, [k]: val });
  return (
    <div className="el-field">
      <AutoField
        field={selectField(field.label || name, SHADOW_PRESETS)}
        value={isCustom ? "custom" : value || ""}
        onChange={(sel) => onChange(sel === "custom" ? { enabled: true, x: 0, y: 4, blur: 12, spread: 0, color: "rgba(0,0,0,0.15)" } : sel)}
        readOnly={readOnly}
      />
      {isCustom && (
        <div className="el-subfields">
          <AutoField field={colorField("Cor")} value={v.color} onChange={(c) => set("color", c)} />
          <AutoField field={sliderField("Horizontal", { min: -50, max: 50, suffix: "px" })} value={v.x ?? 0} onChange={(n) => set("x", n)} />
          <AutoField field={sliderField("Vertical", { min: -50, max: 50, suffix: "px" })} value={v.y ?? 4} onChange={(n) => set("y", n)} />
          <AutoField field={sliderField("Desfoque", { min: 0, max: 100, suffix: "px" })} value={v.blur ?? 12} onChange={(n) => set("blur", n)} />
          <AutoField field={sliderField("Expansão", { min: -50, max: 50, suffix: "px" })} value={v.spread ?? 0} onChange={(n) => set("spread", n)} />
          <AutoField field={switchField("Interior (inset)")} value={!!v.inset} onChange={(c) => set("inset", c)} />
        </div>
      )}
    </div>
  );
}
export const shadowField = (label = "Sombra", opts = {}) => ({ type: "custom", label, ...opts, render: (p) => <ShadowInput {...p} /> });

// --------------------------------------------------------------------------
// Grupo de campos guardados num único objeto (para itens de arrays, etc.)
// --------------------------------------------------------------------------

export function headingField(text) {
  return { type: "custom", label: text, render: () => <div className="el-subheading">{text}</div> };
}
