// ---------- Impact map: live dependency graph + what-if sandbox ----------
//
// Loaded after app.js and shares its globals (state, el, api, debounce, setStatus, renderMain).
// The map is a layered graph of every parameter: inputs on the left, derived values to the
// right of everything they depend on. Selecting a node traces what feeds it (amber) and what it
// feeds (indigo). Scrubbing an input evaluates the whole config with that override applied and
// shows the resulting deltas on every affected node, without touching the project until the
// user clicks "Apply to project".

const IMPACT_NODE_W = 172;
const IMPACT_NODE_H = 40;
const IMPACT_ROW_GAP = 10;
const IMPACT_COL_GAP = 120;
const IMPACT_SUB_GAP = 28; // gap between sub-columns of a wrapped layer (edges drop into lanes here)
const IMPACT_LANE_INSET = 4; // first lane sits this far outside the node row
const IMPACT_LANE_STEP = 3; // spacing between parallel lanes
const IMPACT_MIN_ZOOM = 0.15;
const IMPACT_MAX_ZOOM = 3;
const IMPACT_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6",
  "#14b8a6", "#f97316", "#d946ef", "#84cc16", "#06b6d4", "#ec4899",
];
const SVG_NS = "http://www.w3.org/2000/svg";

function freshImpactState(slug) {
  return {
    slug,
    graph: null, // { nodes, values } from /api/graph
    byName: {}, // name -> node enriched with dependents/layer/x/y
    visible: [], // laid-out node names
    extent: { w: 0, h: 0 },
    overrides: {}, // what-if: input name -> value
    sandbox: null, // values with overrides applied (null when no overrides)
    sandboxError: null,
    evalSeq: 0,
    selected: null,
    showIsolated: false,
    view: { x: 0, y: 0, k: 1 },
    dom: null,
  };
}

function impactState() {
  const slug = state.project ? state.project.slug : null;
  if (!state.impact || state.impact.slug !== slug) state.impact = freshImpactState(slug);
  return state.impact;
}

function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.setAttribute("class", value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function fmtNum(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function fmtDelta(delta) {
  return `${delta > 0 ? "+" : "−"}${fmtNum(Math.abs(delta))}`;
}

function impactGroupColor(groupName) {
  const groups = state.config.groups.map((g) => g.name);
  const index = groups.indexOf(groupName);
  return IMPACT_PALETTE[(index < 0 ? 0 : index) % IMPACT_PALETTE.length];
}

function findParam(name) {
  for (const group of state.config.groups) {
    for (const param of group.parameters) if (param.name === name) return param;
  }
  return null;
}

function configWithOverrides(overrides) {
  const config = JSON.parse(JSON.stringify(state.config));
  for (const group of config.groups) {
    for (const param of group.parameters) {
      if (param.name in overrides && typeof param.expression !== "string") param.value = overrides[param.name];
    }
  }
  return config;
}

function ancestorsOf(byName, name) {
  const seen = new Set();
  const stack = [name];
  while (stack.length) {
    for (const dep of byName[stack.pop()].deps) {
      if (!seen.has(dep)) {
        seen.add(dep);
        stack.push(dep);
      }
    }
  }
  return seen;
}

function descendantsOf(byName, name) {
  const seen = new Set();
  const stack = [name];
  while (stack.length) {
    for (const dependent of byName[stack.pop()].dependents) {
      if (!seen.has(dependent)) {
        seen.add(dependent);
        stack.push(dependent);
      }
    }
  }
  return seen;
}

// ---------- Layout: longest-path layering + barycenter ordering ----------

function impactLayout(im) {
  const byName = {};
  im.graph.nodes.forEach((n) => (byName[n.name] = { ...n, dependents: [] }));
  im.graph.nodes.forEach((n) => n.deps.forEach((d) => byName[d].dependents.push(n.name)));

  const visible = Object.values(byName).filter((n) => im.showIsolated || n.deps.length || n.dependents.length);
  const layerOf = {};
  const layer = (node) => {
    if (layerOf[node.name] != null) return layerOf[node.name];
    layerOf[node.name] = node.deps.length
      ? 1 + Math.max(...node.deps.map((d) => layer(byName[d])))
      : node.kind === "derived"
        ? 1
        : 0;
    return layerOf[node.name];
  };
  visible.forEach(layer);

  const layers = [];
  visible.forEach((n) => {
    const l = layerOf[n.name];
    (layers[l] || (layers[l] = [])).push(n.name);
  });
  for (let l = 0; l < layers.length; l++) layers[l] = layers[l] || [];

  // Positions are normalised to 0..1 within each layer so barycenters are comparable across layers.
  const pos = {};
  const assign = (names) => names.forEach((n, i) => (pos[n] = (i + 0.5) / names.length));
  layers.forEach(assign);
  for (let sweep = 0; sweep < 6; sweep++) {
    const downward = sweep % 2 === 0;
    const order = downward
      ? layers.map((_, i) => i).slice(1)
      : layers.map((_, i) => i).slice(0, -1).reverse();
    for (const l of order) {
      const names = layers[l];
      const bary = {};
      for (const n of names) {
        const neighbours = downward ? byName[n].deps : byName[n].dependents;
        const known = neighbours.filter((m) => pos[m] != null);
        bary[n] = known.length ? known.reduce((sum, m) => sum + pos[m], 0) / known.length : pos[n];
      }
      names.sort((a, b) => bary[a] - bary[b] || pos[a] - pos[b]);
      assign(names);
    }
  }

  im.byName = byName;
  im.visible = visible.map((n) => n.name);
  if (!visible.length) {
    im.extent = { w: 1, h: 1 };
    return;
  }

  // A layer with many nodes is wrapped into side-by-side sub-columns (filled row by row, so
  // nodes with similar targets share a row). Pick the row count that lets the whole map fit the
  // canvas at the largest zoom, with a mild preference for fewer sub-columns.
  const rect = im.dom && im.dom.canvas ? im.dom.canvas.getBoundingClientRect() : null;
  const canvasW = rect && rect.width ? rect.width : 800;
  const canvasH = rect && rect.height ? rect.height : 600;
  const tallest = Math.max(...layers.map((names) => names.length));
  let plan = null;
  for (let rows = 1; rows <= tallest; rows++) {
    const cols = layers.map((names) => Math.max(1, Math.ceil(names.length / rows)));
    const maxCols = Math.max(...cols);
    const rowGap = IMPACT_ROW_GAP + 6 * (maxCols - 1); // room for entry lanes above and exit lanes below each row
    const width =
      cols.reduce((sum, k) => sum + k * IMPACT_NODE_W + (k - 1) * IMPACT_SUB_GAP, 0) + (layers.length - 1) * IMPACT_COL_GAP;
    const blockRows = Math.max(...layers.map((names, l) => Math.ceil(names.length / cols[l])));
    const height = blockRows * (IMPACT_NODE_H + rowGap) - rowGap;
    const zoom = Math.min(canvasW / width, canvasH / height);
    const score = zoom / (1 + 0.04 * (maxCols - 1));
    if (!plan || score > plan.score) plan = { cols, rowGap, width, height, score };
  }

  const pitch = IMPACT_NODE_H + plan.rowGap;
  let blockLeft = 0;
  layers.forEach((names, l) => {
    const k = plan.cols[l];
    const blockRows = Math.ceil(names.length / k);
    const offset = (plan.height - (blockRows * pitch - plan.rowGap)) / 2;
    const blockRight = blockLeft + k * IMPACT_NODE_W + (k - 1) * IMPACT_SUB_GAP;
    names.forEach((n, i) => {
      const node = byName[n];
      node.layer = l;
      node.col = i % k;
      node.cols = k;
      node.blockLeft = blockLeft;
      node.blockRight = blockRight;
      node.x = blockLeft + node.col * (IMPACT_NODE_W + IMPACT_SUB_GAP);
      node.y = offset + Math.floor(i / k) * pitch;
    });
    blockLeft = blockRight + IMPACT_COL_GAP;
  });

  im.extent = { w: plan.width, h: plan.height };
}

// ---------- SVG rendering ----------

// Edges leave a node's right edge and arrive at the target's left edge. When a node sits in an
// inner sub-column of a wrapped layer, the edge first drops into a horizontal lane just below its
// row (or, on arrival, just above the target's row) so it passes cleanly between its neighbours
// instead of through them.
function edgePath(from, to) {
  let x1 = from.x + IMPACT_NODE_W;
  let y1 = from.y + IMPACT_NODE_H / 2;
  let d = `M${x1} ${y1}`;
  if (from.col < from.cols - 1) {
    const laneY = from.y + IMPACT_NODE_H + IMPACT_LANE_INSET + IMPACT_LANE_STEP * from.col;
    const laneEnd = from.blockRight - 2;
    d += ` C${x1 + 10} ${y1}, ${x1 + 8} ${laneY}, ${x1 + 18} ${laneY} L${laneEnd} ${laneY}`;
    x1 = laneEnd;
    y1 = laneY;
  }

  let x2 = to.x - 2;
  let y2 = to.y + IMPACT_NODE_H / 2;
  let tail = "";
  if (to.col > 0) {
    const laneY = to.y - IMPACT_LANE_INSET - IMPACT_LANE_STEP * (to.col - 1);
    const laneStart = to.blockLeft + 2;
    tail = ` L${x2 - 18} ${laneY} C${x2 - 8} ${laneY}, ${x2 - 10} ${y2}, ${x2} ${y2}`;
    x2 = laneStart;
    y2 = laneY;
  }

  const dx = Math.max(40, (x2 - x1) / 2);
  return `${d} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}${tail}`;
}

function truncateName(name, max = 22) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function buildImpactSvg(im) {
  const marker = (id, fillClass) =>
    svgEl(
      "marker",
      { id, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" },
      [svgEl("path", { d: "M0 0L10 5L0 10z", class: fillClass })]
    );
  const defs = svgEl("defs", {}, [
    marker("impactArrow", "fill-slate-300 dark:fill-slate-600"),
    marker("impactArrowDown", "fill-indigo-500"),
    marker("impactArrowUp", "fill-amber-500"),
  ]);

  const edgesG = svgEl("g", { class: "impact-edges" });
  const nodesG = svgEl("g", { class: "impact-nodes" });
  const edgeEls = {};
  const nodeEls = {};

  im.visible.forEach((name, index) => {
    const node = im.byName[name];
    node.deps.forEach((dep) => {
      const path = svgEl("path", { class: "impact-edge", d: edgePath(im.byName[dep], node) });
      edgeEls[`${dep}->${name}`] = path;
      edgesG.appendChild(path);
    });

    const color = impactGroupColor(node.group);
    const inner = svgEl("g", { class: "impact-node-inner", style: `--i:${index}` }, [
      svgEl("rect", {
        class: "body fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600",
        width: IMPACT_NODE_W,
        height: IMPACT_NODE_H,
        rx: 8,
        "stroke-width": 1.5,
      }),
      svgEl("rect", { class: "stripe", x: 0, y: 6, width: 4, height: IMPACT_NODE_H - 12, rx: 2, fill: color }),
      svgEl("text", {
        class: "name fill-slate-800 dark:fill-slate-100",
        x: 12,
        y: 16,
        "font-size": 11.5,
        "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
        "font-weight": node.kind === "derived" ? "600" : "500",
        text: truncateName(node.name),
      }),
      svgEl("text", {
        class: "value fill-slate-500 dark:fill-slate-400",
        x: 12,
        y: 31,
        "font-size": 11,
        text: "",
      }),
      svgEl("title", { text: `${node.name}${node.label ? ` — ${node.label}` : ""}\n${node.group} · ${node.kind}` }),
    ]);
    if (node.kind === "derived") {
      inner.appendChild(
        svgEl("text", {
          class: "fill-purple-500 dark:fill-purple-400",
          x: IMPACT_NODE_W - 8,
          y: 31,
          "font-size": 9,
          "font-weight": "700",
          "text-anchor": "end",
          "letter-spacing": "0.05em",
          text: "EXPR",
        })
      );
    }
    const delta = svgEl("g", { class: "delta hidden" }, [
      svgEl("rect", { class: "pill fill-emerald-500", x: 0, y: 0, height: 16, width: 44, rx: 8 }),
      svgEl("text", {
        class: "fill-white",
        x: 22,
        y: 11.5,
        "font-size": 10,
        "font-weight": "700",
        "text-anchor": "middle",
        "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
        text: "",
      }),
    ]);
    inner.appendChild(delta);

    const g = svgEl(
      "g",
      {
        class: "impact-node",
        "data-name": name,
        transform: `translate(${node.x} ${node.y})`,
        onclick: (e) => {
          e.stopPropagation();
          if (im.dom.dragged) return;
          selectImpactNode(name, false);
        },
      },
      [inner]
    );
    nodeEls[name] = g;
    nodesG.appendChild(g);
  });

  const viewport = svgEl("g", { class: "impact-viewport" }, [edgesG, nodesG]);
  const svg = svgEl("svg", { class: "impact-svg w-full h-full select-none touch-none", tabindex: "0" }, [defs, viewport]);

  return { svg, viewport, nodeEls, edgeEls, dragged: false };
}

// ---------- Pan / zoom ----------

function applyImpactView(im) {
  const { x, y, k } = im.view;
  im.dom.viewport.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
}

function impactCanvasSize(im) {
  const rect = im.dom.svg.getBoundingClientRect();
  return { w: rect.width || 800, h: rect.height || 600 };
}

function tweenImpactView(im, target, duration = 320) {
  const start = { ...im.view };
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    const ease = 1 - Math.pow(1 - t, 3);
    im.view = {
      x: start.x + (target.x - start.x) * ease,
      y: start.y + (target.y - start.y) * ease,
      k: start.k + (target.k - start.k) * ease,
    };
    applyImpactView(im);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function fitImpactView(im, animate) {
  const { w, h } = impactCanvasSize(im);
  const pad = 32;
  const k = Math.max(IMPACT_MIN_ZOOM, Math.min(1, (w - pad * 2) / im.extent.w, (h - pad * 2) / im.extent.h));
  const target = { k, x: (w - im.extent.w * k) / 2, y: (h - im.extent.h * k) / 2 };
  if (animate) tweenImpactView(im, target);
  else {
    im.view = target;
    applyImpactView(im);
  }
}

function focusImpactNode(im, name) {
  const node = im.byName[name];
  if (!node || !im.dom) return;
  const { w, h } = impactCanvasSize(im);
  const k = im.view.k < 0.75 ? 0.95 : im.view.k;
  const cx = node.x + IMPACT_NODE_W / 2;
  const cy = node.y + IMPACT_NODE_H / 2;
  tweenImpactView(im, { k, x: w / 2 - cx * k, y: h / 2 - cy * k });
}

function zoomImpactBy(im, factor, centre) {
  const { w, h } = impactCanvasSize(im);
  const mx = centre ? centre.x : w / 2;
  const my = centre ? centre.y : h / 2;
  const k = Math.max(IMPACT_MIN_ZOOM, Math.min(IMPACT_MAX_ZOOM, im.view.k * factor));
  const ratio = k / im.view.k;
  im.view = { k, x: mx - (mx - im.view.x) * ratio, y: my - (my - im.view.y) * ratio };
  applyImpactView(im);
}

function attachImpactPanZoom(im) {
  const svg = im.dom.svg;
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomImpactBy(im, Math.exp(-e.deltaY * 0.0015), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    { passive: false }
  );

  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, viewX: im.view.x, viewY: im.view.y };
    im.dom.dragged = false;
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!im.dom.dragged && Math.abs(dx) + Math.abs(dy) > 3) {
      // Capture only once a real drag starts, so plain clicks still reach the node underneath.
      im.dom.dragged = true;
      svg.setPointerCapture(drag.pointerId);
    }
    if (!im.dom.dragged) return;
    im.view.x = drag.viewX + dx;
    im.view.y = drag.viewY + dy;
    applyImpactView(im);
  });
  const endDrag = () => {
    drag = null;
    // Let the click that ends a drag see `dragged` before it resets.
    setTimeout(() => im.dom && (im.dom.dragged = false), 0);
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("click", () => {
    if (!im.dom.dragged) selectImpactNode(null, false);
  });
}

// ---------- Highlighting and values ----------

function refreshImpactHighlight(im) {
  if (!im.dom) return;
  const selected = im.selected && im.byName[im.selected] ? im.selected : null;
  const up = selected ? ancestorsOf(im.byName, selected) : new Set();
  const down = selected ? descendantsOf(im.byName, selected) : new Set();

  for (const [name, g] of Object.entries(im.dom.nodeEls)) {
    g.classList.toggle("is-selected", name === selected);
    g.classList.toggle("is-up", up.has(name));
    g.classList.toggle("is-down", down.has(name));
    g.classList.toggle("is-dim", !!selected && name !== selected && !up.has(name) && !down.has(name));
  }
  for (const [key, path] of Object.entries(im.dom.edgeEls)) {
    const [from, to] = key.split("->");
    const isUp = !!selected && (to === selected || up.has(to)) && up.has(from);
    const isDown = !!selected && (from === selected || down.has(from)) && down.has(to);
    path.classList.toggle("is-up", isUp);
    path.classList.toggle("is-down", isDown);
    path.classList.toggle("is-dim", !!selected && !isUp && !isDown);
  }
}

function impactCurrentValue(im, name) {
  return im.sandbox && name in im.sandbox ? im.sandbox[name] : im.graph.values[name];
}

function impactDelta(im, name) {
  if (!im.sandbox) return 0;
  const delta = impactCurrentValue(im, name) - im.graph.values[name];
  return Math.abs(delta) > 1e-9 ? delta : 0;
}

function refreshImpactValues(im) {
  if (!im.dom) return;
  for (const [name, g] of Object.entries(im.dom.nodeEls)) {
    const node = im.byName[name];
    g.querySelector("text.value").textContent = `= ${fmtNum(impactCurrentValue(im, name))} ${node.unit}`;
    const delta = impactDelta(im, name);
    const pillGroup = g.querySelector("g.delta");
    pillGroup.classList.toggle("hidden", delta === 0);
    g.classList.toggle("is-changed", delta !== 0);
    if (delta !== 0) {
      const text = pillGroup.querySelector("text");
      text.textContent = fmtDelta(delta);
      const width = Math.max(36, text.textContent.length * 6.5 + 12);
      const pill = pillGroup.querySelector("rect");
      pill.setAttribute("width", width);
      pill.setAttribute("class", `pill ${delta > 0 ? "fill-emerald-500" : "fill-rose-500"}`);
      text.setAttribute("x", width / 2);
      pillGroup.setAttribute("transform", `translate(${IMPACT_NODE_W - width + 6} -8)`);
    }
  }
}

const evaluateImpactSandbox = debounce(async () => {
  const im = impactState();
  if (!im.graph) return;
  const seq = ++im.evalSeq;
  if (Object.keys(im.overrides).length === 0) {
    im.sandbox = null;
    im.sandboxError = null;
  } else {
    const res = await api("/api/evaluate", { config: configWithOverrides(im.overrides) });
    if (seq !== im.evalSeq) return; // a newer evaluation superseded this one
    if (res.ok) {
      im.sandbox = res.values;
      im.sandboxError = null;
    } else {
      im.sandboxError = res.error;
    }
  }
  refreshImpactValues(im);
  refreshImpactPanelDynamic(im);
  refreshImpactBanner(im);
}, 40);

function setImpactOverride(im, name, value) {
  if (!Number.isFinite(value) || Math.abs(value - im.graph.values[name]) < 1e-9) delete im.overrides[name];
  else im.overrides[name] = value;
  evaluateImpactSandbox();
}

function selectImpactNode(name, focus) {
  const im = impactState();
  if (name && !im.byName[name]) {
    if (!im.graph.nodes.some((n) => n.name === name)) return;
    im.showIsolated = true;
    im.selected = name;
    rebuildImpactGraph(im);
    focusImpactNode(im, name);
    return;
  }
  im.selected = name;
  refreshImpactHighlight(im);
  renderImpactPanel(im);
  if (name && focus) focusImpactNode(im, name);
}

// ---------- Side panel ----------

function groupChip(groupName) {
  return el("span", { class: "inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400" }, [
    el("span", { class: "inline-block w-2 h-2 rounded-full", style: `background:${impactGroupColor(groupName)}` }),
    el("span", { text: groupName }),
  ]);
}

function nodeListItem(im, name, trailing) {
  const node = im.byName[name] || im.graph.nodes.find((n) => n.name === name);
  return el(
    "button",
    {
      type: "button",
      class:
        "w-full flex items-center gap-2 px-2 py-1 rounded-md text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 min-w-0",
      onclick: () => selectImpactNode(name, true),
    },
    [
      el("span", { class: "inline-block w-2 h-2 rounded-full shrink-0", style: `background:${impactGroupColor(node.group)}` }),
      el("span", { class: "font-mono text-xs truncate flex-1 min-w-0", text: name }),
      ...trailing,
    ]
  );
}

function deltaBadge(delta) {
  return el("span", {
    class:
      "font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 " +
      (delta > 0
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"),
    text: fmtDelta(delta),
  });
}

function affectedList(im, name) {
  const affected = Array.from(descendantsOf(im.byName, name));
  affected.sort((a, b) => Math.abs(impactDelta(im, b)) - Math.abs(impactDelta(im, a)) || a.localeCompare(b));
  const container = el("div", { class: "space-y-2" });
  const changed = affected.filter((n) => impactDelta(im, n) !== 0).length;
  container.appendChild(
    el("h4", {
      class: "field-label",
      text: affected.length
        ? `Affects ${affected.length} parameter${affected.length === 1 ? "" : "s"}${im.sandbox ? ` · ${changed} changed` : ""}`
        : "Affects nothing yet",
    })
  );
  if (!affected.length) {
    container.appendChild(
      el("p", { class: "text-xs text-slate-400", text: "Reference this parameter from an expression and its ripple will show up here." })
    );
    return container;
  }
  const list = el("div", { class: "-mx-2" });
  for (const dep of affected) {
    const delta = impactDelta(im, dep);
    const trailing = [
      el("span", {
        class: "text-[11px] text-slate-400 font-mono shrink-0",
        text: delta ? `${fmtNum(im.graph.values[dep])} → ${fmtNum(impactCurrentValue(im, dep))}` : fmtNum(im.graph.values[dep]),
      }),
    ];
    if (delta) trailing.push(deltaBadge(delta));
    list.appendChild(nodeListItem(im, dep, trailing));
  }
  container.appendChild(list);
  return container;
}

function substituteExpression(expression, values) {
  return expression.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (id) => (id in values ? fmtNum(values[id]) : id));
}

function derivedValueBlock(im, node) {
  const block = el("div", { class: "space-y-1" });
  block.appendChild(el("h4", { class: "field-label", text: "Expression" }));
  block.appendChild(el("div", { class: "font-mono text-xs break-words bg-slate-50 dark:bg-slate-900 rounded-md px-2 py-1.5", text: node.expression }));
  const baseline = im.graph.values;
  block.appendChild(
    el("div", { class: "font-mono text-xs text-slate-500 dark:text-slate-400 break-words", text: `= ${substituteExpression(node.expression, baseline)}` })
  );
  block.appendChild(
    el("div", { class: "font-mono text-sm font-semibold", text: `= ${fmtNum(baseline[node.name])} ${node.unit}` })
  );
  if (im.sandbox && impactDelta(im, node.name) !== 0) {
    block.appendChild(
      el("div", { class: "font-mono text-xs text-indigo-600 dark:text-indigo-300 break-words mt-1" }, [
        el("div", { text: `what-if: ${substituteExpression(node.expression, im.sandbox)}` }),
        el("div", { class: "flex items-center gap-2" }, [
          el("span", { class: "font-semibold", text: `= ${fmtNum(im.sandbox[node.name])} ${node.unit}` }),
          deltaBadge(impactDelta(im, node.name)),
        ]),
      ])
    );
  }
  return block;
}

function dependsOnList(im, node) {
  const container = el("div", { class: "space-y-2" });
  container.appendChild(el("h4", { class: "field-label", text: `Depends on ${node.deps.length} parameter${node.deps.length === 1 ? "" : "s"}` }));
  const list = el("div", { class: "-mx-2" });
  for (const dep of node.deps) {
    const delta = impactDelta(im, dep);
    const trailing = [el("span", { class: "text-[11px] text-slate-400 font-mono shrink-0", text: `${fmtNum(impactCurrentValue(im, dep))} ${im.byName[dep].unit}` })];
    if (delta) trailing.push(deltaBadge(delta));
    list.appendChild(nodeListItem(im, dep, trailing));
  }
  container.appendChild(list);
  return container;
}

function sliderRange(im, node) {
  const baseline = im.graph.values[node.name];
  const magnitude = Math.abs(baseline) || 1;
  const step = Math.pow(10, Math.floor(Math.log10(magnitude)) - 2);
  const span = Math.max(magnitude, step * 100);
  const lo = Math.max(node.min, baseline - span);
  const hi = Math.min(node.max, baseline + span);
  return { lo, hi, step };
}

function whatIfControls(im, node) {
  const baseline = im.graph.values[node.name];
  const { lo, hi, step } = sliderRange(im, node);
  const current = node.name in im.overrides ? im.overrides[node.name] : baseline;

  const readout = el("span", { class: "font-mono text-sm font-semibold", text: `${fmtNum(current)} ${node.unit}` });
  const slider = el("input", { type: "range", class: "w-full accent-indigo-600", min: lo, max: hi, step, value: current });
  const number = el("input", { type: "number", class: "field font-mono", step: "any", value: current });
  const reset = el("button", {
    type: "button",
    class: "btn-secondary text-xs" + (node.name in im.overrides ? "" : " hidden"),
    text: "Reset",
  });

  const push = (value) => {
    readout.textContent = `${fmtNum(value)} ${node.unit}`;
    reset.classList.toggle("hidden", Math.abs(value - baseline) < 1e-9);
    setImpactOverride(im, node.name, value);
  };
  slider.addEventListener("input", () => {
    const value = Number(slider.value);
    number.value = value;
    push(value);
  });
  number.addEventListener("input", () => {
    const value = Number(number.value);
    if (!Number.isFinite(value)) return;
    slider.value = value;
    push(value);
  });
  reset.addEventListener("click", () => {
    slider.value = baseline;
    number.value = baseline;
    push(baseline);
  });

  return el("div", { class: "space-y-2" }, [
    el("div", { class: "flex items-center justify-between" }, [
      el("h4", { class: "field-label !mb-0", text: "What if this were…" }),
      readout,
    ]),
    slider,
    el("div", { class: "flex items-center gap-2" }, [
      number,
      reset,
    ]),
    el("p", { class: "text-[11px] text-slate-400", text: `Baseline ${fmtNum(baseline)} ${node.unit} · slider spans ${fmtNum(lo)}–${fmtNum(hi)}. Nothing is saved until you apply.` }),
  ]);
}

function renderImpactPanel(im) {
  if (!im.dom) return;
  const panel = im.dom.panel;
  panel.innerHTML = "";
  const node = im.selected ? im.byName[im.selected] : null;

  if (!node) {
    const inputs = im.graph.nodes.filter((n) => n.kind === "input").length;
    const derived = im.graph.nodes.length - inputs;
    const links = im.graph.nodes.reduce((sum, n) => sum + n.deps.length, 0);
    panel.appendChild(
      el("div", { class: "p-4 space-y-3 text-sm" }, [
        el("h3", { class: "font-semibold", text: "Trace any parameter" }),
        el("p", { class: "text-slate-500 dark:text-slate-400 text-xs leading-relaxed" }, [
          document.createTextNode("Click a node to light up everything that feeds it "),
          el("span", { class: "text-amber-500 font-semibold", text: "(amber)" }),
          document.createTextNode(" and everything it feeds "),
          el("span", { class: "text-indigo-500 font-semibold", text: "(indigo)" }),
          document.createTextNode(". Pick an input and drag its slider to watch the change ripple through every derived value before you commit it."),
        ]),
        el("dl", { class: "grid grid-cols-3 gap-2 text-center" }, [
          ["Inputs", inputs],
          ["Derived", derived],
          ["Links", links],
        ].flatMap(([label, count]) => [
          el("div", { class: "rounded-md bg-slate-50 dark:bg-slate-900 py-2" }, [
            el("dt", { class: "text-[11px] uppercase tracking-wide text-slate-400", text: label }),
            el("dd", { class: "text-lg font-semibold", text: String(count) }),
          ]),
        ])),
        el("p", { class: "text-[11px] text-slate-400", text: "Scroll to zoom, drag to pan, click the background to clear the trace." }),
      ])
    );
    im.dom.panelDynamic = null;
    return;
  }

  const header = el("div", { class: "space-y-1" }, [
    el("div", { class: "flex items-center gap-2 min-w-0" }, [
      el("span", { class: "font-mono text-sm font-semibold truncate", text: node.name }),
      el("span", {
        class:
          "inline-block px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 " +
          (node.kind === "derived"
            ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"),
        text: node.kind === "derived" ? "Expr" : "Value",
      }),
    ]),
    el("div", { class: "text-xs text-slate-500 dark:text-slate-400", text: node.label || "" }),
    groupChip(node.group),
  ]);

  const staticParts = [header];
  if (node.kind === "input") staticParts.push(whatIfControls(im, node));

  const dynamic = el("div", { class: "space-y-4" });
  im.dom.panelDynamic = dynamic;
  panel.appendChild(el("div", { class: "p-4 space-y-4 text-sm" }, [...staticParts, dynamic]));
  refreshImpactPanelDynamic(im);
}

function refreshImpactPanelDynamic(im) {
  if (!im.dom || !im.dom.panelDynamic) return;
  const node = im.byName[im.selected];
  if (!node) return;
  const dynamic = im.dom.panelDynamic;
  dynamic.innerHTML = "";
  if (im.sandboxError) {
    dynamic.appendChild(
      el("div", { class: "text-xs rounded-md px-2 py-1.5 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", text: `What-if can't be evaluated: ${im.sandboxError}` })
    );
  }
  if (node.kind === "derived") {
    dynamic.appendChild(derivedValueBlock(im, node));
    dynamic.appendChild(dependsOnList(im, node));
  }
  dynamic.appendChild(affectedList(im, node.name));
}

// ---------- Toolbar / banner ----------

function refreshImpactBanner(im) {
  if (!im.dom) return;
  const banner = im.dom.banner;
  const count = Object.keys(im.overrides).length;
  banner.classList.toggle("hidden", count === 0);
  if (count === 0) return;
  const changed = im.sandbox
    ? im.graph.nodes.filter((n) => n.kind === "derived" && impactDelta(im, n.name) !== 0).length
    : 0;
  banner.querySelector("[data-banner-text]").textContent =
    `What-if: ${count} input${count === 1 ? "" : "s"} changed · ${changed} derived value${changed === 1 ? "" : "s"} move`;
}

function applyImpactOverrides(im) {
  const names = Object.keys(im.overrides);
  if (!names.length) return;
  for (const name of names) {
    const param = findParam(name);
    if (param && typeof param.expression !== "string") param.value = im.overrides[name];
  }
  im.overrides = {};
  im.sandbox = null;
  im.sandboxError = null;
  setStatus(`Applied ${names.length} what-if change${names.length === 1 ? "" : "s"} — Save to keep them`, "ok");
  loadImpactGraph(im);
}

function discardImpactOverrides(im) {
  im.overrides = {};
  im.sandbox = null;
  im.sandboxError = null;
  refreshImpactValues(im);
  refreshImpactBanner(im);
  renderImpactPanel(im);
}

// ---------- View assembly ----------

function rebuildImpactGraph(im) {
  impactLayout(im);
  const canvas = im.dom.canvas;
  const previous = im.dom.svg;
  const built = buildImpactSvg(im);
  Object.assign(im.dom, built);
  if (previous) previous.replaceWith(built.svg);
  else canvas.insertBefore(built.svg, canvas.firstChild);
  attachImpactPanZoom(im);
  fitImpactView(im, false);
  canvas.querySelectorAll("[data-impact-empty]").forEach((n) => n.remove());
  if (!im.visible.length) {
    canvas.appendChild(
      el("div", { class: "absolute inset-0 flex items-center justify-center p-6 pointer-events-none", "data-impact-empty": "1" }, [
        el("p", {
          class: "max-w-sm text-center text-sm text-slate-400",
          text: "Nothing references anything yet. Give a parameter an expression to see it here, or show the unlinked parameters.",
        }),
      ])
    );
  }
  im.dom.isolatedToggle.textContent = `${im.showIsolated ? "Hide" : "Show"} ${im.graph.nodes.length - im.visible.length || ""} unlinked`.replace("  ", " ");
  im.dom.isolatedToggle.classList.toggle("hidden", im.graph.nodes.length === im.visible.length && !im.showIsolated);
  if (im.selected && !im.byName[im.selected]) im.selected = null;
  refreshImpactValues(im);
  refreshImpactHighlight(im);
  renderImpactPanel(im);
  refreshImpactBanner(im);
}

async function loadImpactGraph(im) {
  const res = await api("/api/graph", { config: state.config });
  if (!im.dom || im !== state.impact) return;
  im.dom.canvas.querySelectorAll("[data-impact-placeholder]").forEach((n) => n.remove());
  if (!res.ok) {
    im.graph = null;
    im.dom.canvas.appendChild(
      el("div", { class: "absolute inset-0 flex items-center justify-center p-6", "data-impact-placeholder": "1" }, [
        el("div", { class: "max-w-md text-center space-y-2" }, [
          el("div", { class: "text-sm font-semibold text-red-600 dark:text-red-400", text: "The impact map needs a valid configuration" }),
          el("div", { class: "text-xs text-slate-500 dark:text-slate-400 font-mono", text: res.error }),
        ]),
      ])
    );
    return;
  }
  im.graph = { nodes: res.nodes, values: res.values };
  const inputNames = new Set(res.nodes.filter((n) => n.kind === "input").map((n) => n.name));
  for (const name of Object.keys(im.overrides)) if (!inputNames.has(name)) delete im.overrides[name];

  const datalist = im.dom.datalist;
  datalist.innerHTML = "";
  res.nodes.forEach((n) => datalist.appendChild(el("option", { value: n.name })));

  rebuildImpactGraph(im);
  if (Object.keys(im.overrides).length) evaluateImpactSandbox();
}

function renderImpactView() {
  const im = impactState();
  const dom = {};
  im.dom = dom;

  const findInput = el("input", {
    class: "field text-xs font-mono w-48",
    type: "text",
    placeholder: "Find parameter…",
    list: "impactNameList",
    onchange: (e) => {
      const name = e.target.value.trim();
      if (name && im.graph && im.graph.nodes.some((n) => n.name === name)) {
        selectImpactNode(name, true);
        e.target.value = "";
      }
    },
  });
  dom.datalist = el("datalist", { id: "impactNameList" });

  dom.isolatedToggle = el("button", {
    type: "button",
    class: "btn-secondary text-xs",
    text: "Show unlinked",
    onclick: () => {
      im.showIsolated = !im.showIsolated;
      rebuildImpactGraph(im);
    },
  });

  const zoomBtn = (label, title, onclick) => el("button", { type: "button", class: "btn-secondary text-xs px-2", text: label, title, onclick });
  const zoomControls = el("div", { class: "flex gap-1" }, [
    zoomBtn("−", "Zoom out", () => zoomImpactBy(im, 1 / 1.25)),
    zoomBtn("+", "Zoom in", () => zoomImpactBy(im, 1.25)),
    zoomBtn("Fit", "Fit the whole map", () => fitImpactView(im, true)),
  ]);

  dom.banner = el(
    "div",
    {
      class:
        "hidden flex items-center gap-2 text-xs rounded-md px-2 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    },
    [
      el("span", { class: "font-medium", "data-banner-text": "1" }),
      el("button", { type: "button", class: "btn-primary text-xs !py-1", text: "Apply to project", onclick: () => applyImpactOverrides(im) }),
      el("button", { type: "button", class: "btn-secondary text-xs !py-1", text: "Discard", onclick: () => discardImpactOverrides(im) }),
    ]
  );

  const toolbar = el("div", { class: "flex items-center gap-3 shrink-0 flex-wrap" }, [
    el("div", { class: "min-w-0" }, [
      el("h2", { class: "text-lg font-semibold", text: "Impact map" }),
      el("p", { class: "text-xs text-slate-400", text: "Every parameter and what it feeds. Trace a node, or scrub an input to preview the ripple." }),
    ]),
    el("div", { class: "flex-1" }),
    dom.banner,
    findInput,
    dom.datalist,
    dom.isolatedToggle,
    zoomControls,
  ]);

  const legend = el(
    "div",
    { class: "flex flex-wrap gap-x-3 gap-y-1 shrink-0" },
    state.config.groups.map((g) => groupChip(g.name || "(unnamed)"))
  );
  dom.canvas = el("div", { class: "card relative flex-1 min-w-0 overflow-hidden" }, [
    el("div", { class: "absolute inset-0 flex items-center justify-center text-sm text-slate-400", "data-impact-placeholder": "1", text: "Mapping dependencies…" }),
  ]);
  dom.panel = el("div", { class: "card w-80 shrink-0 overflow-y-auto" });

  const body = el("div", { class: "flex-1 min-h-0 flex gap-3" }, [dom.canvas, dom.panel]);
  const root = el("div", { class: "h-full flex flex-col gap-3" }, [toolbar, legend, body]);

  loadImpactGraph(im);
  return root;
}
