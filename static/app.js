// "value" has no entry: it is the flexible filler column that absorbs whatever
// width the others don't use, which is what keeps the table pinned to 100% width.
const DEFAULT_COLUMN_WIDTHS = { name: 160, label: 180, kind: 70, unit: 70 };
const MIN_COLUMN_WIDTH = 50;
const COL_POSITIONS = { name: 0, label: 1, kind: 2, value: 3, unit: 4, actions: 5 };

function loadColumnWidths() {
  try {
    return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(localStorage.getItem("paramColumnWidths") || "{}") };
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

function saveColumnWidths() {
  try {
    localStorage.setItem("paramColumnWidths", JSON.stringify(state.columnWidths));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

const state = {
  mode: "landing", // "landing" | "editor"
  project: null, // { slug, version, versions }
  config: null,
  view: { type: "settings" },
  computedValues: {},
  jsonEditor: null,
  onModalClose: null,
  columnWidths: loadColumnWidths(),
};

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function field(labelText, inputNode) {
  return el("div", {}, [el("label", { class: "field-label" }, [document.createTextNode(labelText)]), inputNode]);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function autoGrow(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function autoGrowTextarea(props) {
  const textarea = el("textarea", { ...props, class: `${props.class || ""} autogrow-ta resize-none overflow-hidden` });
  textarea.addEventListener("input", () => autoGrow(textarea));
  return textarea;
}

function growVisibleTextareas(container) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => container.querySelectorAll(".autogrow-ta").forEach(autoGrow));
  });
}

async function api(path, body) {
  const opts = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(path, opts);
  return res.json();
}

function setStatus(message, kind) {
  const node = document.getElementById("status");
  node.textContent = message;
  node.classList.remove("hidden", "bg-green-50", "text-green-700", "bg-red-50", "text-red-700", "dark:bg-green-950", "dark:text-green-300", "dark:bg-red-950", "dark:text-red-300");
  if (kind === "ok") node.classList.add("bg-green-50", "text-green-700", "dark:bg-green-950", "dark:text-green-300");
  else if (kind === "err") node.classList.add("bg-red-50", "text-red-700", "dark:bg-red-950", "dark:text-red-300");
}

function collectKnownNames(excludeName) {
  const names = [];
  for (const group of state.config.groups) {
    for (const param of group.parameters) {
      if (param.name && param.name !== excludeName) names.push(param.name);
    }
  }
  return names;
}

function newParameter() {
  const defaults = state.config.defaults || {};
  return {
    name: "",
    label: "",
    type: "length",
    value: 0,
    description: "",
    unit: defaults.unit || "mm",
    min: defaults.min ?? 0,
    max: defaults.max ?? 1000,
  };
}

function formatComputed(value) {
  if (value == null || Number.isNaN(value)) return "";
  return `= ${Math.round(value * 1000) / 1000}`;
}

async function refreshComputedValues() {
  const res = await api("/api/evaluate", { config: state.config });
  state.computedValues = res.ok ? res.values : {};
  document.querySelectorAll("[data-computed-name]").forEach((elm) => {
    const value = state.computedValues[elm.getAttribute("data-computed-name")];
    elm.textContent = formatComputed(value);
  });
}
const debouncedRefreshComputed = debounce(refreshComputedValues, 400);

// ---------- Routing (landing page vs. /<slug>/<version>) ----------

function navigateTo(url) {
  history.pushState({}, "", url);
  route();
}

function parseLocation() {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return { mode: "landing" };
  return { mode: "editor", slug: decodeURIComponent(parts[0]), version: parts[1] || "latest" };
}

async function route() {
  const loc = parseLocation();
  if (loc.mode === "landing") {
    state.mode = "landing";
    state.project = null;
    await showLanding();
    return;
  }

  const res = await api(`/api/projects/${encodeURIComponent(loc.slug)}/${loc.version}`);
  if (!res.ok) {
    setStatus(res.error || "Project not found", "err");
    history.replaceState({}, "", "/");
    state.mode = "landing";
    await showLanding();
    return;
  }

  state.mode = "editor";
  state.project = { slug: loc.slug, version: res.version, versions: res.versions };
  state.config = res.config;
  state.view = { type: "settings" };

  const canonicalPath = `/${loc.slug}/${res.version}`;
  if (location.pathname !== canonicalPath) history.replaceState({}, "", canonicalPath);

  showEditor();
}

function setShellVisibility() {
  document.getElementById("landingRoot").classList.toggle("hidden", state.mode !== "landing");
  document.getElementById("appShell").classList.toggle("hidden", state.mode !== "editor");
}

async function showLanding() {
  setShellVisibility();
  const root = document.getElementById("landingRoot");
  root.innerHTML = "";

  const res = await api("/api/projects");
  const projects = res.ok ? res.projects : [];

  const newBtn = el("button", { class: "btn-primary", text: "+ New project", onclick: createProjectFlow });
  const importInput = el("input", { type: "file", accept: "application/json", class: "hidden" });
  importInput.addEventListener("change", () => importProjectFlow(importInput.files[0]));
  const importLabel = el("label", { class: "btn-secondary cursor-pointer" }, [
    document.createTextNode("Import JSON"),
    importInput,
  ]);

  const list = el("div", { class: "space-y-2 mt-6" });
  if (projects.length === 0) {
    list.appendChild(
      el("p", { class: "text-sm text-slate-400" }, [
        document.createTextNode("No projects yet — create one or import a JSON file to get started."),
      ])
    );
  }
  projects.forEach((p) => {
    list.appendChild(
      el(
        "a",
        {
          class: "card p-3 flex items-center justify-between hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer",
          onclick: () => navigateTo(`/${p.slug}/${p.latestVersion}`),
        },
        [
          el("div", {}, [
            el("div", { class: "font-medium", text: p.name }),
            el("div", {
              class: "text-xs text-slate-400",
              text: `${p.slug} · v${p.latestVersion} · ${p.versionCount} version${p.versionCount === 1 ? "" : "s"}`,
            }),
          ]),
          el("div", { class: "text-xs text-slate-400 shrink-0 ml-3", text: new Date(p.updated * 1000).toLocaleString() }),
        ]
      )
    );
  });

  root.appendChild(
    el("div", { class: "max-w-3xl mx-auto p-8 space-y-6" }, [
      el("h1", { class: "text-2xl font-semibold" }, [document.createTextNode("FeatureScript Parameter Studio")]),
      el("p", { class: "text-sm text-slate-400" }, [
        document.createTextNode("Create or open a project, or import an existing parameter JSON file."),
      ]),
      el("div", { class: "flex gap-3" }, [newBtn, importLabel]),
      list,
    ])
  );
}

async function createProjectFlow() {
  const name = prompt("Project name?");
  if (!name) return;
  const res = await api("/api/projects", { name });
  if (!res.ok) {
    alert(res.error || "Failed to create project");
    return;
  }
  navigateTo(`/${res.slug}/${res.version}`);
}

async function importProjectFlow(file) {
  if (!file) return;
  let config;
  try {
    config = JSON.parse(await file.text());
  } catch (e) {
    alert(`Invalid JSON: ${e.message}`);
    return;
  }
  const name = config.project || file.name.replace(/\.json$/i, "");
  const res = await api("/api/projects", { name, config });
  if (!res.ok) {
    alert(res.error || "Failed to import project");
    return;
  }
  navigateTo(`/${res.slug}/${res.version}`);
}

function updateProjectUrlDisplay() {
  document.getElementById("projectMeta").textContent = `${state.project.slug} · v${state.project.version}`;
  document.getElementById("projectUrlInput").value = `${location.origin}/${state.project.slug}/${state.project.version}`;
}

function showEditor() {
  setShellVisibility();
  updateProjectUrlDisplay();
  render();
}

window.addEventListener("popstate", route);
document.getElementById("allProjectsLink").addEventListener("click", () => navigateTo("/"));
document.getElementById("newProjectLink").addEventListener("click", createProjectFlow);
document.getElementById("copyUrlBtn").addEventListener("click", async (e) => {
  const input = document.getElementById("projectUrlInput");
  await navigator.clipboard.writeText(input.value);
  const original = e.target.textContent;
  e.target.textContent = "Copied!";
  setTimeout(() => (e.target.textContent = original), 1200);
});

// ---------- Navigation / view switching ----------

async function ensureAppliedIfJson() {
  if (state.view.type !== "json") return true;
  return applyJsonEditor();
}

async function setView(view) {
  if (!(await ensureAppliedIfJson())) return;
  state.view = view;
  render();
}

function render() {
  document.getElementById("projectName").value = state.config.project || "";
  renderNav();
  renderMain();
}

function navItem(label, active, onClick, badge) {
  const children = [el("span", { text: label })];
  if (badge != null) children.push(el("span", { class: "text-[11px] text-slate-400", text: badge }));
  return el("a", { class: "nav-link" + (active ? " nav-link-active" : ""), onclick: onClick }, children);
}

function renderNav() {
  const mainNav = document.getElementById("mainNav");
  const groupNav = document.getElementById("groupNav");
  mainNav.innerHTML = "";
  groupNav.innerHTML = "";

  mainNav.appendChild(navItem("⚙️ Settings", state.view.type === "settings", () => setView({ type: "settings" })));
  mainNav.appendChild(navItem("{ } Raw JSON", state.view.type === "json", () => setView({ type: "json" })));
  mainNav.appendChild(navItem("🕸 Impact map", state.view.type === "impact", () => setView({ type: "impact" })));

  state.config.groups.forEach((group, gIdx) => {
    const isActive = state.view.type === "group" && state.view.index === gIdx;
    groupNav.appendChild(
      navItem(
        group.name || "(unnamed)",
        isActive,
        () => setView({ type: "group", index: gIdx }),
        String(group.parameters.length)
      )
    );
  });
}

function renderMain() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  if (state.view.type === "settings") {
    main.appendChild(renderSettingsView());
  } else if (state.view.type === "json") {
    main.appendChild(renderJsonView());
  } else if (state.view.type === "impact") {
    main.appendChild(renderImpactView());
  } else {
    const group = state.config.groups[state.view.index];
    if (!group) {
      state.view = { type: "settings" };
      renderMain();
      return;
    }
    main.appendChild(renderGroupView(group, state.view.index));
    refreshComputedValues();
  }
  growVisibleTextareas(main);
}

// ---------- Settings view ----------

function renderSettingsView() {
  const fs = state.config.featurescript || (state.config.featurescript = {});
  const defaults = state.config.defaults || (state.config.defaults = {});

  const fsFields = el("div", { class: "grid grid-cols-2 gap-3" });
  for (const [key, label, type] of [
    ["version", "Version", "number"],
    ["feature_name", "Feature name", "text"],
    ["feature_id", "Feature id", "text"],
    ["table_name", "Table name", "text"],
    ["table_id", "Table id", "text"],
    ["output", "Output filename", "text"],
  ]) {
    const input = el("input", {
      class: "field",
      type,
      value: fs[key] ?? (key === "output" ? "parameters.fs" : ""),
      onchange: (e) => {
        fs[key] = type === "number" ? Number(e.target.value) : e.target.value;
      },
    });
    fsFields.appendChild(field(label, input));
  }

  const editableDialog = fs.editable_dialog === true;

  const defaultsFields = el("div", { class: editableDialog ? "grid grid-cols-3 gap-3" : "grid grid-cols-1 gap-3" });
  const unitSelect = el(
    "select",
    { class: "field", onchange: (e) => (defaults.unit = e.target.value) },
    ["mm", "cm", "m", "in"].map((u) =>
      el("option", { value: u, ...(defaults.unit === u ? { selected: "selected" } : {}) }, [document.createTextNode(u)])
    )
  );
  defaultsFields.appendChild(field("Unit", unitSelect));
  if (editableDialog) {
    for (const [key, label] of [["min", "Min"], ["max", "Max"]]) {
      const input = el("input", {
        class: "field",
        type: "number",
        value: defaults[key] ?? "",
        onchange: (e) => (defaults[key] = Number(e.target.value)),
      });
      defaultsFields.appendChild(field(label, input));
    }
  }

  const editableDialogCheckbox = el("input", { type: "checkbox", class: "rounded" });
  editableDialogCheckbox.checked = editableDialog;
  editableDialogCheckbox.addEventListener("change", (e) => {
    fs.editable_dialog = e.target.checked;
    renderMain();
  });

  return el("div", { class: "h-full overflow-y-auto space-y-5" }, [
    el("h2", { class: "text-lg font-semibold" }, [document.createTextNode("Project settings")]),
    el("div", { class: "grid md:grid-cols-2 gap-5" }, [
      el("section", { class: "card p-4 space-y-3" }, [
        el("h3", { class: "text-sm font-semibold" }, [document.createTextNode("FeatureScript settings")]),
        fsFields,
        el("label", { class: "flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1" }, [
          editableDialogCheckbox,
          el("span", {}, [
            document.createTextNode(
              "Generate an editable Onshape dialog (sliders with min/max bounds) instead of a plain feature that just sets pre-computed variables. Leave this off if you only ever edit values here."
            ),
          ]),
        ]),
      ]),
      el("section", { class: "card p-4 space-y-2" }, [
        el("h3", { class: "text-sm font-semibold" }, [document.createTextNode("Defaults")]),
        defaultsFields,
      ]),
    ]),
  ]);
}

// ---------- Raw JSON view ----------

function renderJsonView() {
  const wrapper = el("div", { class: "h-full flex flex-col gap-3" });
  const toolbar = el("div", { class: "flex items-center justify-between shrink-0" }, [
    el("h2", { class: "text-lg font-semibold" }, [document.createTextNode("Raw JSON")]),
    el("button", {
      class: "btn-secondary text-xs",
      text: "Apply",
      onclick: async () => {
        if (await applyJsonEditor()) renderNav();
      },
    }),
  ]);
  const editorHost = el("div", { class: "flex-1 min-h-0 rounded-md overflow-hidden border border-slate-300 dark:border-slate-600" });
  wrapper.appendChild(toolbar);
  wrapper.appendChild(editorHost);

  const textarea = document.createElement("textarea");
  textarea.value = JSON.stringify(state.config, null, 2);
  editorHost.appendChild(textarea);

  requestAnimationFrame(() => {
    state.jsonEditor = CodeMirror.fromTextArea(textarea, {
      mode: { name: "javascript", json: true },
      theme: "material-darker",
      lineNumbers: true,
      tabSize: 2,
      viewportMargin: Infinity,
    });
    state.jsonEditor.setSize("100%", "100%");
  });

  return wrapper;
}

async function applyJsonEditor() {
  let parsed;
  try {
    parsed = JSON.parse(state.jsonEditor.getValue());
  } catch (e) {
    setStatus(`Invalid JSON: ${e.message}`, "err");
    return false;
  }
  const res = await api("/api/validate", { config: parsed });
  if (!res.ok) {
    setStatus(res.error, "err");
    return false;
  }
  state.config = parsed;
  setStatus(`Valid — ${res.parameterCount} parameters`, "ok");
  return true;
}

// ---------- Group view: table + formula bar ----------

function renderGroupView(group, gIdx) {
  const editableDialog = state.config.featurescript?.editable_dialog === true;

  const nameInput = el("input", {
    class: "field font-semibold text-lg flex-1",
    type: "text",
    value: group.name || "",
    onchange: (e) => {
      group.name = e.target.value;
      renderNav();
    },
  });

  const removeGroupBtn = el("button", {
    class: "btn-secondary text-xs",
    text: "Remove group",
    onclick: () => {
      if (confirm(`Remove component group "${group.name}" and all its parameters?`)) {
        state.config.groups.splice(gIdx, 1);
        setView({ type: "settings" });
      }
    },
  });

  const header = el("div", { class: "flex items-center gap-3 shrink-0" }, [nameInput, removeGroupBtn]);

  const headerBlock = [header];
  if (editableDialog) {
    const collapsedCheckbox = el("input", { type: "checkbox", class: "rounded" });
    collapsedCheckbox.checked = group.collapsed !== false;
    collapsedCheckbox.addEventListener("change", (e) => (group.collapsed = e.target.checked));

    const advanced = el("details", { class: "mt-2" }, [
      el("summary", { class: "text-xs text-slate-400 cursor-pointer select-none" }, [document.createTextNode("Advanced")]),
      el("label", { class: "flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1" }, [
        collapsedCheckbox,
        document.createTextNode("collapsed in Onshape"),
      ]),
    ]);
    headerBlock.push(advanced);
  }
  const headerWrap = el("div", { class: "mb-3 shrink-0" }, headerBlock);

  const table = buildParamTable(group, (pIdx) => openRowEditor(group, pIdx));
  const addParamBtn = el("button", {
    class: "btn-ghost text-xs mt-2",
    text: "+ Add parameter",
    onclick: () => {
      group.parameters.push(newParameter());
      const newIndex = group.parameters.length - 1;
      renderMain();
      openRowEditor(group, newIndex);
    },
  });

  const tableScroll = el("div", { class: "flex-1 min-h-0 overflow-auto" }, [table, addParamBtn]);

  return el("div", { class: "h-full flex flex-col" }, [headerWrap, tableScroll]);
}

function buildColGroup() {
  const w = state.columnWidths;
  return el("colgroup", {}, [
    el("col", { style: `width:${w.name}px` }),
    el("col", { style: `width:${w.label}px` }),
    el("col", { style: `width:${w.kind}px` }),
    el("col"), // value: flexible, no explicit width
    el("col", { style: `width:${w.unit}px` }),
    el("col", { style: "width:60px" }),
  ]);
}

function addResizeHandle(th, key, table) {
  const handle = el("div", { class: "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-indigo-400/50" });
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = state.columnWidths[key];
    const col = table.querySelectorAll("col")[COL_POSITIONS[key]];
    const onMove = (ev) => {
      const width = Math.max(MIN_COLUMN_WIDTH, startWidth + (ev.clientX - startX));
      state.columnWidths[key] = width;
      if (col) col.style.width = `${width}px`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveColumnWidths();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
  th.classList.add("relative");
  th.appendChild(handle);
}

function buildParamTable(group, selectRow) {
  const table = el("table", { class: "w-full table-fixed text-sm border-collapse" });
  table.appendChild(buildColGroup());

  const headerCells = [
    ["name", "Name"],
    ["label", "Label"],
    ["kind", "Kind"],
    ["value", "Value / Expression"],
    ["unit", "Unit"],
  ].map(([key, label]) => {
    const th = el("th", { class: "py-1.5 pr-2 text-left", text: label });
    if (key !== "value") addResizeHandle(th, key, table);
    return th;
  });
  headerCells.push(el("th", { class: "py-1.5" }));

  const thead = el("thead", {}, [
    el(
      "tr",
      { class: "text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700" },
      headerCells
    ),
  ]);
  const tbody = el("tbody");
  group.parameters.forEach((param, pIdx) => tbody.appendChild(buildParamRow(group, param, pIdx, selectRow)));
  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

function buildParamRow(group, param, pIdx, openEditor) {
  const isExpression = typeof param.expression === "string";
  const openThisRow = () => openEditor(pIdx);

  const tr = el("tr", { class: "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60" });

  const nameInput = el("input", {
    class: "cell-input font-medium",
    type: "text",
    value: param.name || "",
    onchange: (e) => (param.name = e.target.value.trim()),
  });
  const labelInput = el("input", {
    class: "cell-input text-slate-500 dark:text-slate-400",
    type: "text",
    value: param.label || "",
    onchange: (e) => (param.label = e.target.value),
  });

  const kindBadge = el("span", {
    class:
      "inline-block px-1.5 py-0.5 rounded text-[11px] font-medium " +
      (isExpression
        ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"),
    text: isExpression ? "Expr" : "Value",
  });

  let valueCell;
  if (isExpression) {
    const preview = el("span", { class: "font-mono text-xs text-slate-600 dark:text-slate-300 truncate min-w-0", text: param.expression || "" });
    const computed = el("span", { class: "text-[11px] text-slate-400 shrink-0", "data-computed-name": param.name });
    valueCell = el("div", { class: "flex items-center gap-2 min-w-0 cursor-pointer", onclick: openThisRow }, [preview, computed]);
  } else {
    valueCell = el("input", {
      class: "cell-input font-mono",
      type: "number",
      step: "any",
      value: param.value ?? 0,
      onchange: (e) => {
        param.value = Number(e.target.value);
        debouncedRefreshComputed();
      },
    });
  }

  const unitSelect = el(
    "select",
    { class: "cell-input text-xs", onchange: (e) => (param.unit = e.target.value) },
    ["mm", "cm", "m", "in"].map((u) =>
      el("option", { value: u, ...(param.unit === u ? { selected: "selected" } : {}) }, [document.createTextNode(u)])
    )
  );

  const editBtn = el("button", {
    class: "btn-icon",
    title: "Edit description & bounds",
    text: "✎",
    onclick: (e) => {
      e.stopPropagation();
      openThisRow();
    },
  });
  const removeBtn = el("button", {
    class: "btn-icon",
    title: "Remove parameter",
    text: "✕",
    onclick: (e) => {
      e.stopPropagation();
      group.parameters.splice(pIdx, 1);
      renderMain();
    },
  });

  tr.appendChild(el("td", { class: "py-1 pr-2 overflow-hidden" }, [nameInput]));
  tr.appendChild(el("td", { class: "py-1 pr-2 overflow-hidden" }, [labelInput]));
  tr.appendChild(el("td", { class: "py-1 pr-2 overflow-hidden" }, [kindBadge]));
  tr.appendChild(el("td", { class: "py-1 pr-2 overflow-hidden min-w-0" }, [valueCell]));
  tr.appendChild(el("td", { class: "py-1 pr-2" }, [unitSelect]));
  tr.appendChild(el("td", { class: "py-1 text-right whitespace-nowrap" }, [editBtn, removeBtn]));
  return tr;
}

// ---------- Formula bar (selected row detail editor) ----------

function openRowEditor(group, pIdx) {
  const param = group.parameters[pIdx];
  if (!param) return;

  const rebuild = () => {
    const isExpression = typeof param.expression === "string";

    const valueBtn = el("button", {
      type: "button",
      class: "seg-btn rounded-l-md" + (isExpression ? "" : " seg-btn-active"),
      text: "Value",
    });
    const exprBtn = el("button", {
      type: "button",
      class: "seg-btn rounded-r-md border-l border-slate-300 dark:border-slate-600" + (isExpression ? " seg-btn-active" : ""),
      text: "Expr",
    });
    const switchKind = (toExpression) => {
      if (toExpression === isExpression) return;
      if (toExpression) {
        param.expression = param.expression || "0";
        delete param.value;
      } else {
        param.value = typeof param.value === "number" ? param.value : 0;
        delete param.expression;
      }
      rebuild();
    };
    valueBtn.addEventListener("click", () => switchKind(false));
    exprBtn.addEventListener("click", () => switchKind(true));
    const kindToggle = el("div", { class: "inline-flex rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden shrink-0" }, [
      valueBtn,
      exprBtn,
    ]);

    const titleNode = el("div", { class: "flex items-baseline gap-2 min-w-0" }, [
      el("span", { class: "font-mono text-sm font-semibold truncate", text: param.name || "(unnamed)" }),
      el("span", { class: "text-xs text-slate-400 truncate", text: param.label || "" }),
    ]);

    const editorArea = isExpression
      ? buildExpressionEditor(param)
      : field(
          "Value",
          el("input", {
            class: "field font-mono",
            type: "number",
            step: "any",
            value: param.value ?? 0,
            onchange: (e) => {
              param.value = Number(e.target.value);
              debouncedRefreshComputed();
            },
          })
        );

    const descInput = autoGrowTextarea({ class: "field", rows: "2", onchange: (e) => (param.description = e.target.value) });
    descInput.value = param.description || "";

    const bodyChildren = [editorArea, field("Description", descInput)];

    if (state.config.featurescript?.editable_dialog === true) {
      const minInput = el("input", {
        class: "field",
        type: "number",
        step: "any",
        value: param.min ?? 0,
        onchange: (e) => (param.min = Number(e.target.value)),
      });
      const maxInput = el("input", {
        class: "field",
        type: "number",
        step: "any",
        value: param.max ?? 1000,
        onchange: (e) => (param.max = Number(e.target.value)),
      });
      const boundsRow = el("div", { class: "grid grid-cols-2 gap-3 mt-2" }, [field("Min", minInput), field("Max", maxInput)]);
      bodyChildren.push(
        el("details", {}, [
          el("summary", { class: "text-xs text-slate-400 cursor-pointer select-none" }, [document.createTextNode("Advanced")]),
          boundsRow,
        ])
      );
    }

    const body = el("div", { class: "p-4 space-y-3 overflow-y-auto" }, bodyChildren);

    openModal([titleNode, kindToggle], body, () => renderMain());
    growVisibleTextareas(body);
  };

  rebuild();
}

function buildExpressionEditor(param) {
  const textarea = autoGrowTextarea({ class: "field font-mono text-sm", rows: "2" });
  textarea.value = param.expression || "";

  const suggestBox = el("div", {
    class:
      "hidden absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg",
  });
  const resultMsg = el("div", { class: "text-xs mt-1" });
  const computedMsg = el("div", { class: "text-xs mt-1 text-slate-400 font-mono", "data-computed-name": param.name });

  let activeIndex = -1;

  const getWordRange = () => {
    const pos = textarea.selectionStart;
    const before = textarea.value.slice(0, pos);
    const match = before.match(/[A-Za-z0-9_]*$/);
    return { start: pos - match[0].length, end: pos, word: match[0] };
  };

  const hideSuggestions = () => {
    suggestBox.classList.add("hidden");
    activeIndex = -1;
  };

  const highlightActive = () => {
    Array.from(suggestBox.children).forEach((item, i) => item.classList.toggle("autocomplete-item-active", i === activeIndex));
  };

  const chooseSuggestion = (name) => {
    const { start, end } = getWordRange();
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = before + name + after;
    textarea.selectionStart = textarea.selectionEnd = before.length + name.length;
    param.expression = textarea.value;
    hideSuggestions();
    textarea.focus();
    autoGrow(textarea);
    scheduleValidate();
  };

  const updateSuggestions = () => {
    const { word } = getWordRange();
    if (!word) {
      hideSuggestions();
      return;
    }
    const known = collectKnownNames(param.name);
    const matches = known.filter((n) => n.toLowerCase().startsWith(word.toLowerCase()) && n.toLowerCase() !== word.toLowerCase()).slice(0, 8);
    if (matches.length === 0) {
      hideSuggestions();
      return;
    }
    activeIndex = 0;
    suggestBox.innerHTML = "";
    matches.forEach((name, i) => {
      const item = el("div", { class: "autocomplete-item" + (i === 0 ? " autocomplete-item-active" : ""), text: name });
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        chooseSuggestion(name);
      });
      suggestBox.appendChild(item);
    });
    suggestBox.classList.remove("hidden");
  };

  const scheduleValidate = debounce(async () => {
    param.expression = textarea.value;
    const res = await api("/api/validate-expression", {
      expression: textarea.value,
      knownNames: collectKnownNames(param.name),
      name: param.name,
    });
    if (res.ok) {
      resultMsg.textContent = `✓ depends on: ${res.dependencies.join(", ") || "(none)"}`;
      resultMsg.className = "text-xs mt-1 text-green-600 dark:text-green-400";
      refreshComputedValues();
    } else {
      resultMsg.textContent = `✗ ${res.error}`;
      resultMsg.className = "text-xs mt-1 text-red-600 dark:text-red-400";
      computedMsg.textContent = "";
    }
  }, 400);

  textarea.addEventListener("input", () => {
    param.expression = textarea.value;
    updateSuggestions();
    scheduleValidate();
  });
  textarea.addEventListener("keydown", (e) => {
    if (suggestBox.classList.contains("hidden")) return;
    const items = Array.from(suggestBox.children);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      highlightActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (activeIndex >= 0) {
        e.preventDefault();
        chooseSuggestion(items[activeIndex].textContent);
      }
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });
  textarea.addEventListener("blur", () => setTimeout(hideSuggestions, 100));

  const wrapper = el("div", { class: "relative" }, [textarea, suggestBox]);
  return el("div", {}, [wrapper, resultMsg, computedMsg]);
}

// ---------- Modal (row editor, generated output) ----------

function openModal(headerChildren, bodyNode, onClose) {
  const backdrop = document.getElementById("modalBackdrop");
  const panel = backdrop.firstElementChild;
  panel.innerHTML = "";
  state.onModalClose = onClose || null;

  const closeBtn = el("button", { class: "btn-icon", title: "Close", text: "✕", onclick: closeModal });
  const header = el(
    "div",
    { class: "flex items-center justify-between gap-3 p-3 border-b border-slate-200 dark:border-slate-700 shrink-0" },
    [...headerChildren, closeBtn]
  );
  panel.appendChild(header);
  panel.appendChild(bodyNode);

  backdrop.classList.remove("hidden");
  backdrop.classList.add("flex");
}

function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.classList.add("hidden");
  backdrop.classList.remove("flex");
  const onClose = state.onModalClose;
  state.onModalClose = null;
  if (onClose) onClose();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ---------- Top-level actions ----------

async function validateConfig() {
  if (!(await ensureAppliedIfJson())) return;
  const res = await api("/api/validate", { config: state.config });
  setStatus(res.ok ? `Valid — ${res.parameterCount} parameters` : res.error, res.ok ? "ok" : "err");
}

async function saveConfig() {
  if (!(await ensureAppliedIfJson())) return;
  const res = await api(`/api/projects/${state.project.slug}/save`, { config: state.config });
  if (!res.ok) {
    setStatus(res.error, "err");
    return;
  }
  state.project.version = res.version;
  state.project.versions.push(res.version);
  history.pushState({}, "", `/${state.project.slug}/${res.version}`);
  updateProjectUrlDisplay();
  setStatus(`Saved as version ${res.version}`, "ok");
}

async function generateScript() {
  if (!(await ensureAppliedIfJson())) return;
  const res = await api(`/api/projects/${state.project.slug}/generate`, { config: state.config });
  if (!res.ok) {
    setStatus(res.error, "err");
    return;
  }
  setStatus(`Generated ${res.path}`, "ok");

  const copyBtn = el("button", {
    class: "btn-secondary text-xs",
    text: "Copy to clipboard",
    onclick: async (e) => {
      await navigator.clipboard.writeText(res.script);
      const original = e.target.textContent;
      e.target.textContent = "Copied!";
      setTimeout(() => (e.target.textContent = original), 1200);
    },
  });
  const titleNode = el("h2", { class: "text-sm font-semibold truncate" }, [document.createTextNode(`Output — ${res.path}`)]);

  const code = el("code", { class: "language-javascript", text: res.script });
  const pre = el("pre", { class: "text-xs !p-4 overflow-auto flex-1 !m-0 !rounded-none" }, [code]);
  if (window.hljs) window.hljs.highlightElement(code);

  openModal([titleNode, copyBtn], pre);
}

document.getElementById("projectName").addEventListener("change", (e) => {
  state.config.project = e.target.value;
});
document.getElementById("validateBtn").addEventListener("click", validateConfig);
document.getElementById("saveBtn").addEventListener("click", saveConfig);
document.getElementById("generateBtn").addEventListener("click", generateScript);
document.getElementById("addGroupBtn").addEventListener("click", async () => {
  if (!(await ensureAppliedIfJson())) return;
  state.config.groups.push({ name: "New Group", collapsed: true, parameters: [] });
  state.view = { type: "group", index: state.config.groups.length - 1 };
  render();
});

window.addEventListener("resize", () => {
  document.querySelectorAll(".autogrow-ta").forEach(autoGrow);
});

route();
