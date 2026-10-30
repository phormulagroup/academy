// Estilos por dispositivo (desktop, tablet e telemóvel) e larguras das colunas do editor de e-mails (MJML).
// Em e-mail só funcionam bem as media queries num <style> do <head>, por isso cada opção do painel "Definições" grava uma classe curta
// no `css-class` do componente (rs-m-fs-18 = telemóvel, tamanho da letra 18px) e o <mj-style> do cabeçalho é gerado a partir das classes
// usadas. Como a regra vive na classe, um bloco guardado e largado noutro e-mail leva o comportamento consigo.
// Os estilos normais (painel Estilos) valem para todos os dispositivos; o bloco de um dispositivo só altera esse dispositivo.

const MARK = "/*rs*/";
const TOKEN = /^rs-([dtm])-([a-z]+)(?:-(.+))?$/;
const HEX = /^([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Mesmo ponto de corte do MJML (480px) para o telemóvel; o tablet cobre os iPad na vertical (até 820px)
const MEDIA = {
  d: "@media only screen and (min-width:821px)",
  t: "@media only screen and (min-width:480px) and (max-width:820px)",
  m: "@media only screen and (max-width:479px)",
};
const DEVICES = ["d", "t", "m"];

const px = (v) => v.split("-").map((n) => `${n}px`).join(" ");
const dec = (v) => String(v).replace("-", ".");
// Nada de ">", "&" ou aspas no CSS: o componente de texto do GrapesJS escapa-os e o MJML receberia o CSS estragado.
// Os selectors usam descendentes e atributos sem aspas. Em mj-section o padding está no td de dentro da tabela externa.
const RULES = {
  hide: (c) => `.${c}{display:none!important}`,
  fs: (c, v) => `.${c} div,.${c} a{font-size:${v}px!important}`,
  lh: (c, v) => `.${c} div,.${c} a{line-height:${dec(v)}!important}`,
  ls: (c, v) => `.${c} div,.${c} a{letter-spacing:${dec(v)}px!important}`,
  c: (c, v) => `.${c} div,.${c} a{color:#${v}!important}`,
  bg: (c, v) => `.${c},.${c} table{background:#${v}!important}`,
  ta: (c, v) => `.${c},.${c} div{text-align:${v}!important}.${c} table{margin:${v === "center" ? "0 auto" : v === "right" ? "0 0 0 auto" : "0 auto 0 0"}!important}`,
  p: (c, v) => `.${c}{padding:${px(v)}!important}`,
  sp: (c, v) => `.${c} table[align=center] td[style*=direction]{padding:${px(v)}!important}`,
  w: (c, v) => `div.${c}{width:${v}%!important;max-width:${v}%!important}`,
  full: (c) => `.${c} table,.${c} td{width:100%!important}.${c} img{width:100%!important;height:auto!important}`,
  h: (c, v) => `.${c} div{height:${v}px!important;line-height:${v}px!important}`,
};

export function buildResponsiveCss(classNames) {
  const byDevice = { d: [], t: [], m: [] };
  [...new Set(classNames)].sort().forEach((cls) => {
    const [, device, key, value] = cls.match(TOKEN) || [];
    if (device && RULES[key]) byDevice[device].push(RULES[key](cls, value));
  });
  return DEVICES.filter((d) => byDevice[d].length).map((d) => `${MEDIA[d]}{${byDevice[d].join("")}}`).join("");
}

const CONTENT = ["mj-text", "mj-image", "mj-button", "mj-divider", "mj-social", "mj-navbar", "mj-spacer", "mj-table"];
const ALL = ["mj-section", "mj-column", "mj-group", ...CONTENT];
const PAD = ["mj-text", "mj-image", "mj-button", "mj-divider", "mj-social", "mj-navbar", "mj-table"];
const TEXTUAL = ["mj-text", "mj-button"];

// Larguras possíveis de uma secção com colunas (em %)
export const LAYOUTS = ["100", "50-50", "33.33-33.33-33.33", "25-75", "75-25", "30-70", "70-30", "40-60", "60-40", "20-80", "80-20", "25-50-25", "20-60-20", "25-25-25-25"];
const layoutName = (key) => key.split("-").map((n) => `${Number(n).toFixed(0)}`).join(" / ");

const isColumn = (c) => c.get("type") === "mj-column";
const round = (n) => Math.round(n * 100) / 100;
const widthOf = (column, count) => {
  const w = String(column.getAttributes().width || "");
  return w.endsWith("%") && parseFloat(w) > 0 ? parseFloat(w) : round(100 / count);
};

// Campos de cada bloco de dispositivo. `kind` define como o valor vira classe; `devices` limita a certos dispositivos.
function fieldList(t) {
  const align = [{ id: "", name: "—" }, { id: "left", name: t("Left") }, { id: "center", name: t("Center") }, { id: "right", name: t("Right") }];
  const colWidth = [{ id: "", name: t("Automatic") }, ...[100, 75, 66, 50, 33, 25].map((n) => ({ id: String(n), name: `${n}%` }))];
  return [
    { key: "hide", kind: "check", types: ALL, label: t("Hide on this device") },
    { key: "p", kind: "padding", types: PAD, label: t("Padding (px)") },
    { key: "sp", kind: "padding", types: ["mj-section"], label: t("Padding (px)") },
    { key: "fs", kind: "number", min: 8, max: 60, types: TEXTUAL, label: t("Font size (px)") },
    { key: "lh", kind: "decimal", min: 0.8, max: 3, step: 0.1, types: TEXTUAL, label: t("Line height") },
    { key: "ls", kind: "decimal", min: 0, max: 10, step: 0.5, types: TEXTUAL, label: t("Letter spacing (px)") },
    { key: "c", kind: "color", types: TEXTUAL, label: t("Text color") },
    { key: "ta", kind: "select", options: align, types: [...TEXTUAL, "mj-image"], label: t("Alignment") },
    { key: "bg", kind: "color", types: ["mj-section", "mj-column", "mj-text", "mj-image"], label: t("Background") },
    { key: "h", kind: "number", min: 0, max: 200, types: ["mj-spacer"], label: t("Height (px)") },
    { key: "w", kind: "select", options: colWidth, types: ["mj-column"], devices: ["t", "m"], label: t("Column width") },
    { key: "full", kind: "check", types: ["mj-image"], label: t("Full width") },
  ];
}
const fieldsFor = (fields, type, device) => fields.filter((f) => f.types.includes(type) && (!f.devices || f.devices.includes(device)));

const classesOf = (component) => String(component.getAttributes()["css-class"] || "").split(/\s+/).filter(Boolean);
const prefix = (device, key) => `rs-${device}-${key}`;

// 1, 2, 3 ou 4 números (como o padding do CSS) → "t-r-b-l"
function paddingToken(text) {
  const parts = String(text || "").trim().split(/\s+/);
  if (!/^\d{1,3}(\s+\d{1,3}){0,3}$/.test(parts.join(" "))) return null;
  const [a, b = a, c = a, d = b] = parts;
  return [a, b, c, d].join("-");
}

// Valor do campo → classe (ou null quando está vazio/inválido)
function tokenOf(field, device, value) {
  const base = prefix(device, field.key);
  if (field.kind === "check") return value ? base : null;
  if (field.kind === "padding") return paddingToken(value) && `${base}-${paddingToken(value)}`;
  if (field.kind === "color") {
    const hex = String(value || "").replace("#", "").trim();
    return HEX.test(hex) ? `${base}-${hex.toLowerCase()}` : null;
  }
  if (field.kind === "number" || field.kind === "decimal") {
    if (String(value).trim() === "" || !Number.isFinite(Number(value))) return null;
    const n = Math.min(field.max, Math.max(field.min, Number(value)));
    return `${base}-${field.kind === "number" ? Math.round(n) : String(round(n)).replace(".", "-")}`;
  }
  return value ? `${base}-${value}` : null;
}

// Lê do css-class os valores de um dispositivo: { fs: "18", p: "10 20 10 20", hide: true... }
function readDevice(component, fields, device) {
  const cls = classesOf(component);
  const values = {};
  fields.forEach((field) => {
    const base = prefix(device, field.key);
    if (field.kind === "check") return (values[field.key] = cls.includes(base));
    const found = cls.find((c) => c.startsWith(`${base}-`));
    const raw = found ? found.slice(base.length + 1) : "";
    values[field.key] = field.kind === "padding" ? raw.split("-").join(" ") : field.kind === "decimal" ? dec(raw) : field.kind === "color" && raw ? `#${raw}` : raw;
  });
  return values;
}

function writeDevice(component, fields, device, values) {
  const own = new Set(fields.map((f) => prefix(device, f.key)));
  const kept = classesOf(component).filter((c) => ![...own].some((p) => c === p || c.startsWith(`${p}-`)));
  const tokens = fields.map((f) => tokenOf(f, device, values[f.key]));
  component.addAttributes({ "css-class": [...kept, ...tokens].filter(Boolean).join(" ") });
}

// Padding atual do componente (placeholder dos campos e valor dos lados que se deixam vazios)
const PAD_DEFAULT = { "mj-section": [20, 0, 20, 0], "mj-column": [0, 0, 0, 0] };
function basePadding(component) {
  const attrs = component.getAttributes();
  const num = (v) => (/^-?\d+(\.\d+)?px$/.test(String(v)) ? parseFloat(v) : null);
  const short = String(attrs.padding || "").trim().split(/\s+/).filter(Boolean).map(num);
  const [a, b = a, c = a, d = b] = short;
  const fallback = PAD_DEFAULT[component.get("type")] || [10, 25, 10, 25];
  return [attrs["padding-top"], attrs["padding-right"], attrs["padding-bottom"], attrs["padding-left"]].map((v, i) => num(v) ?? [a, b, c, d][i] ?? fallback[i]);
}

// A secção cujas colunas estão por cima (ou dentro de um mj-group)
const columnsOf = (section) => {
  const direct = section.components().filter(isColumn);
  if (direct.length) return direct;
  const group = section.components().find((c) => c.get("type") === "mj-group");
  return group ? group.components().filter(isColumn) : [];
};

// Muda a largura de uma coluna e a vizinha (a seguinte, ou a anterior se for a última) fica com o que sobra, para a soma dar sempre 100%
function setColumnWidth(column, pct) {
  const cols = column.parent()?.components().filter(isColumn) || [];
  if (cols.length < 2) return column.addAttributes({ width: "100%" });
  const index = cols.indexOf(column);
  const other = cols[index + 1] || cols[index - 1];
  const own = widthOf(column, cols.length);
  const rest = widthOf(other, cols.length);
  const next = Math.min(Math.max(pct, 5), own + rest - 5);
  column.addAttributes({ width: `${round(next)}%` });
  other.addAttributes({ width: `${round(own + rest - next)}%` });
}

// Troca a estrutura da secção: acrescenta colunas se faltarem, ou junta o conteúdo das que sobram na última
function applyLayout(section, key, t) {
  const widths = key.split("-").map(Number);
  let cols = columnsOf(section);
  if (!cols.length) return;
  const container = cols[0].parent();
  while (cols.length < widths.length) {
    container.append(`<mj-column><mj-text>${t("Column")} ${cols.length + 1}</mj-text></mj-column>`);
    cols = columnsOf(section);
  }
  if (cols.length > widths.length) {
    const last = cols[widths.length - 1];
    cols.slice(widths.length).forEach((extra) => {
      extra.components().models.slice().forEach((child) => child.move(last, { at: last.components().length }));
      extra.remove();
    });
    cols = columnsOf(section);
  }
  cols.forEach((col, i) => col.addAttributes({ width: `${widths[i]}%` }));
}

const currentLayout = (section) => {
  const cols = columnsOf(section);
  const key = cols.map((c) => String(round(widthOf(c, cols.length)))).join("-");
  return LAYOUTS.find((l) => l.split("-").map((n) => String(round(Number(n)))).join("-") === key) || (cols.length === 1 ? "100" : "custom");
};

function collectClasses(component, out = []) {
  classesOf(component).forEach((c) => TOKEN.test(c) && out.push(c));
  component.components().forEach((child) => collectClasses(child, out));
  return out;
}

// Regenera o <mj-style> do cabeçalho com as regras das classes usadas (e apaga-o quando já não há nenhuma)
export function syncResponsiveStyles(editor) {
  const wrapper = editor.getWrapper();
  const head = wrapper?.findType("mj-head")[0];
  if (!head) return;
  const css = buildResponsiveCss(collectClasses(wrapper));
  const existing = head.findType("mj-style").find((s) => s.toHTML().includes(MARK));
  if (existing ? existing.toHTML().includes(MARK + css) && css : !css) return;
  // Estas alterações são derivadas: não entram no histórico (senão o "refazer" deixava de funcionar)
  editor.UndoManager.stop();
  try {
    if (!css) existing?.remove();
    else if (existing) existing.components(MARK + css);
    else head.append(`<mj-style>${MARK}${css}</mj-style>`);
  } finally {
    editor.UndoManager.start();
  }
}

// Que blocos de dispositivo estão abertos (partilhado entre componentes, para o painel não fechar ao mudar de seleção)
const openState = { d: false, t: false, m: true };

const esc = (v) => String(v).replace(/"/g, "&quot;");

// O bloco de um dispositivo: um <details> com todos os campos (mesmo tamanho e grelha em todos)
function devicePanel(editor, trait, t, allFields) {
  const device = trait.get("device");
  const component = () => trait.target;
  const fieldsOf = () => fieldsFor(allFields, component().get("type"), device);
  const labels = { d: [t("Desktop"), t("wider than 820px")], t: [t("Tablet"), "480 – 820px"], m: [t("Mobile"), t("up to 479px")] }[device];

  const row = (field) => {
    const wide = field.kind === "padding" || field.kind === "check";
    let control = "";
    if (field.kind === "check") control = `<input type="checkbox" data-key="${field.key}"/>`;
    else if (field.kind === "select") control = `<select data-key="${field.key}">${field.options.map((o) => `<option value="${esc(o.id)}">${o.name}</option>`).join("")}</select>`;
    else if (field.kind === "color") control = `<div class="rs-color"><input type="text" data-key="${field.key}" placeholder="#163986" maxlength="7"/><input type="color" data-swatch="${field.key}" value="#163986"/></div>`;
    else if (field.kind === "padding") control = `<div class="rs-box">${[t("Top"), t("Right"), t("Bottom"), t("Left")].map((side, i) => `<input type="number" min="0" max="200" data-key="${field.key}" data-i="${i}" title="${side}"/>`).join("")}</div><div class="rs-box-labels"><span>${t("Top")}</span><span>${t("Right")}</span><span>${t("Bottom")}</span><span>${t("Left")}</span></div>`;
    else control = `<input type="number" data-key="${field.key}" min="${field.min}" max="${field.max}" step="${field.step || 1}"/>`;
    return `<label class="rs-row${wide ? " rs-wide" : ""}${field.kind === "check" ? " rs-check" : ""}"><span>${field.label}</span>${control}</label>`;
  };

  const el = document.createElement("details");
  el.className = "rs-dev";
  el.open = openState[device];
  el.innerHTML = `<summary><b>${labels[0]}</b><small>${labels[1]}</small><i class="rs-dot" title="${t("Has styles for this device")}"></i></summary><div class="rs-grid">${fieldsOf().map(row).join("")}</div>`;
  el.addEventListener("toggle", () => (openState[device] = el.open));

  const collect = () => {
    const values = {};
    fieldsOf().forEach((field) => {
      const inputs = [...el.querySelectorAll(`[data-key="${field.key}"]`)];
      if (field.kind === "check") values[field.key] = inputs[0].checked;
      else if (field.kind === "padding") {
        const base = basePadding(component());
        const typed = inputs.map((i) => i.value.trim());
        // Os lados vazios ficam com o valor atual do componente (a classe guarda sempre os 4)
        values[field.key] = typed.some((v) => v !== "") ? typed.map((v, i) => (v === "" ? base[i] : v)).join(" ") : "";
      } else values[field.key] = inputs[0].value;
    });
    return values;
  };
  const paintSwatches = () =>
    el.querySelectorAll("[data-swatch]").forEach((swatch) => {
      const hex = el.querySelector(`[data-key="${swatch.dataset.swatch}"]`).value.replace("#", "");
      if (HEX.test(hex)) swatch.value = `#${hex.length === 3 ? [...hex].map((ch) => ch + ch).join("") : hex}`;
      swatch.classList.toggle("rs-empty", !HEX.test(hex));
    });
  let timer;
  const commit = () => {
    clearTimeout(timer);
    paintSwatches();
    writeDevice(component(), fieldsOf(), device, collect());
    el.querySelector(".rs-dot").style.display = classesOf(component()).some((c) => c.startsWith(`rs-${device}-`)) ? "" : "none";
  };
  el.addEventListener("input", (e) => {
    const swatch = e.target.dataset.swatch;
    if (swatch) el.querySelector(`[data-key="${swatch}"]`).value = e.target.value;
    paintSwatches();
    clearTimeout(timer);
    timer = setTimeout(commit, 350);
  });
  el.addEventListener("change", commit);
  return el;
}

// Preenche o bloco com o que está nas classes do componente (sem mexer no campo onde se está a escrever)
function fillDevicePanel(el, trait, allFields) {
  const device = trait.get("device");
  const component = trait.target;
  const fields = fieldsFor(allFields, component.get("type"), device);
  const values = readDevice(component, fields, device);
  const active = document.activeElement;
  fields.forEach((field) => {
    const inputs = [...el.querySelectorAll(`[data-key="${field.key}"]`)];
    if (field.kind === "check") inputs[0].checked = !!values[field.key];
    else if (field.kind === "padding") {
      const base = basePadding(component);
      const parts = values[field.key] ? values[field.key].split(" ") : [];
      inputs.forEach((input, i) => {
        input.placeholder = String(base[i]);
        if (input !== active) input.value = parts[i] ?? "";
      });
    } else if (inputs[0] !== active) inputs[0].value = values[field.key] ?? "";
    const swatch = el.querySelector(`[data-swatch="${field.key}"]`);
    if (swatch) {
      const hasColor = HEX.test(String(values[field.key]).replace("#", ""));
      if (hasColor) swatch.value = values[field.key];
      swatch.classList.toggle("rs-empty", !hasColor);
    }
  });
  el.querySelector(".rs-dot").style.display = classesOf(component).some((c) => c.startsWith(`rs-${device}-`)) ? "" : "none";
}

// Tudo vive no fim do painel Estilos (o pincel): disposição da secção, largura da coluna e os blocos por dispositivo
export function responsiveEditing(editor, t) {
  const allFields = fieldList(t);
  let mount = null;

  const columnControls = (component, type) => {
    const box = document.createElement("div");
    box.className = "rs-dev rs-plain";
    if (type === "mj-section") {
      const current = currentLayout(component);
      box.innerHTML = `<div class="rs-grid"><label class="rs-row rs-wide"><span>${t("Column layout")}</span><select>${[...LAYOUTS.map((l) => ({ id: l, name: layoutName(l) })), { id: "custom", name: t("Custom") }].map((o) => `<option value="${o.id}"${o.id === current ? " selected" : ""}>${o.name}</option>`).join("")}</select></label></div>`;
      box.querySelector("select").addEventListener("change", (e) => {
        if (e.target.value === "custom") return;
        applyLayout(component, e.target.value, t);
        render(component);
      });
    } else {
      const width = round(widthOf(component, component.parent()?.components().filter(isColumn).length || 1));
      box.innerHTML = `<div class="rs-grid"><label class="rs-row rs-wide"><span>${t("Column width (%)")}</span><input type="number" min="5" max="100" step="1" value="${width}"/></label></div>`;
      box.querySelector("input").addEventListener("change", (e) => Number(e.target.value) > 0 && setColumnWidth(component, Number(e.target.value)));
    }
    return box;
  };

  const render = (component) => {
    const host = editor.getContainer()?.querySelector(".gjs-sm-sectors");
    if (!host) return;
    if (!mount || !mount.isConnected) {
      mount = document.createElement("div");
      mount.className = "rs-devices";
      host.insertAdjacentElement("afterend", mount);
    }
    mount.innerHTML = "";
    const type = component?.get("type");
    if (!ALL.includes(type)) return;
    const title = document.createElement("div");
    title.className = "rs-devices-title";
    title.textContent = t("Per device");
    mount.append(title);
    if (type === "mj-section" || type === "mj-column") mount.append(columnControls(component, type));
    DEVICES.forEach((device) => {
      const trait = { get: (key) => (key === "device" ? device : undefined), target: component };
      const panel = devicePanel(editor, trait, t, allFields);
      mount.append(panel);
      fillDevicePanel(panel, trait, allFields);
    });
  };

  editor.on("component:selected", render);
  editor.on("component:deselected", () => mount && (mount.innerHTML = ""));

  let timer;
  editor.on("update", () => {
    clearTimeout(timer);
    timer = setTimeout(() => editor.getWrapper() && syncResponsiveStyles(editor), 150);
  });
}

// Com um componente selecionado só interessa editá-lo: do painel de blocos passa-se ao dos Estilos, e sem seleção volta-se aos blocos.
// Quem estiver noutro painel (Camadas, Definições) não é mudado.
export function followSelection(editor) {
  const button = (id) => editor.Panels.getButton("views", id);
  editor.on("component:toggled", () => {
    const selected = editor.getSelectedAll().length;
    if (selected > 0 && button("open-blocks")?.get("active")) button("open-sm")?.set("active", true);
    else if (selected === 0 && button("open-sm")?.get("active")) button("open-blocks")?.set("active", true);
  });
}
