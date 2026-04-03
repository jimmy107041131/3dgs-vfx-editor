import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';
import 'litegraph.js/css/litegraph.css';
import { scene } from './scene.js';
import { registerNodes } from './nodes/index.js';

// Dependencies injected via init
let _attachGizmo = null;
let _detachGizmo = null;
let _getActiveTransformNode = null;
let _keys = null;

// ── LiteGraph patches ────────────────────────────────────
// Fix: litegraph commented out deltaX/deltaY in adjustMouseEvent,
// so number widget drag doesn't work. Patch it back.
const _origAdjust = LGraphCanvas.prototype.adjustMouseEvent;
LGraphCanvas.prototype.adjustMouseEvent = function(e) {
  const prevX = this.last_mouse_position?.[0] ?? e.clientX;
  _origAdjust.call(this, e);
  e.deltaX = e.clientX - prevX;
};

// Fix: number widget precision — round values to avoid floating point noise
const WIDGET_PRECISION = 5;

const _origDrawWidgets = LGraphCanvas.prototype.drawNodeWidgets;
LGraphCanvas.prototype.drawNodeWidgets = function(node, posY, ctx, active_widget) {
  if (node.widgets) {
    for (const w of node.widgets) {
      if (w.type === 'number' && w.options.precision === undefined) {
        w.options.precision = WIDGET_PRECISION;
      }
    }
  }
  return _origDrawWidgets.call(this, node, posY, ctx, active_widget);
};

const _origProcessWidgets = LGraphCanvas.prototype.processNodeWidgets;
LGraphCanvas.prototype.processNodeWidgets = function(node, pos, event, active_widget) {
  // Prevent deltaX from applying to non-active widgets during drag
  const isMove = event.type === 'pointermove' || event.type === 'mousemove';
  const savedDelta = event.deltaX;
  if (isMove && active_widget && node.widgets) {
    for (const w of node.widgets) {
      if (w !== active_widget) w._skipDelta = w.value;
    }
  }
  const result = _origProcessWidgets.call(this, node, pos, event, active_widget);
  // Restore non-active widgets that got accidentally changed, then round active
  if (node.widgets) {
    for (const w of node.widgets) {
      if (w.type === 'number') {
        if (isMove && w._skipDelta !== undefined && w !== active_widget) {
          w.value = w._skipDelta;
        }
        delete w._skipDelta;
        w.value = parseFloat(Number(w.value).toFixed(w.options.precision ?? WIDGET_PRECISION));
      }
    }
  }
  return result;
};

// Fix: require real double-click to open number prompt (litegraph default is fast single click)
let _lastPromptClick = 0;
const _origPrompt = LGraphCanvas.prototype.prompt;
LGraphCanvas.prototype.prompt = function(title, value, callback, event, multiline) {
  // Gate: only open if it's a real double-click (two clicks within 400ms)
  if (title === 'Value') {
    const now = performance.now();
    if (now - _lastPromptClick > 400) {
      _lastPromptClick = now;
      return; // first click — don't open, just record timestamp
    }
    _lastPromptClick = 0; // reset for next double-click
  }
  const result = _origPrompt.call(this, title, value, callback, event, multiline);
  const dialog = this.prompt_box;
  if (dialog) {
    const input = dialog.querySelector('.value');
    const cleanup = () => {
      document.removeEventListener('pointerdown', onClickOutside, true);
    };
    // Watch for dialog removal to auto-cleanup (handles Enter/OK/ESC paths)
    const observer = new MutationObserver(() => {
      if (!dialog.parentNode) { cleanup(); observer.disconnect(); }
    });
    if (dialog.parentNode) observer.observe(dialog.parentNode, { childList: true });

    const onClickOutside = (e) => {
      if (!dialog.contains(e.target)) {
        // Save the current input value before closing
        if (callback && input) callback(input.value);
        dialog.close();
        cleanup();
        observer.disconnect();
        // Stop this pointer event from propagating to litegraph canvas,
        // which would otherwise re-trigger the prompt via processNodeWidgets.
        e.stopPropagation();
        e.preventDefault();
      }
    };
    // Use capture phase + delay so:
    // 1) We intercept the event before litegraph's canvas handler
    // 2) We don't capture the original double-click that opened this prompt
    setTimeout(() => document.addEventListener('pointerdown', onClickOutside, true), 300);
  }
  return result;
};

// Fix: clicking a node that's already selected should not deselect others
// (allows dragging multi-selection without holding Shift)
const _origProcessNodeSelected = LGraphCanvas.prototype.processNodeSelected;
LGraphCanvas.prototype.processNodeSelected = function(node, e) {
  if (node && this.selected_nodes[node.id] && Object.keys(this.selected_nodes).length > 1) {
    // Node is already part of a multi-selection — don't deselect others
    return;
  }
  return _origProcessNodeSelected.call(this, node, e);
};

// ── Cross-domain connection handling ─────────────────────
// Auto-insert bridge for js→dyno, block dyno→js
const JS_TO_DYNO = {
  'js_float:dyno_float': 'Bridge/FloatToGPU',
  'js_vec3:dyno_vec3': 'Bridge/Vec3ToGPU',
};
const DYNO_TYPES = new Set(['dyno_float', 'dyno_vec2', 'dyno_vec3', 'dyno_vec4', 'dyno_int', 'splat_source', 'splat_emitter']);
const JS_TYPES = new Set(['js_float', 'js_vec3']);

const _origConnect = LiteGraph.LGraphNode.prototype.connect;
LiteGraph.LGraphNode.prototype.connect = function (outputSlot, targetNode, targetSlot) {
  const output = this.outputs?.[outputSlot];
  const input = targetNode?.inputs?.[targetSlot];
  if (output && input) {
    const key = `${output.type}:${input.type}`;
    // Auto-insert bridge: js → dyno
    if (JS_TO_DYNO[key]) {
      const bridgeType = JS_TO_DYNO[key];
      const bridge = LiteGraph.createNode(bridgeType);
      if (bridge && this.graph) {
        // Position bridge between source and target
        bridge.pos = [
          (this.pos[0] + targetNode.pos[0]) / 2,
          (this.pos[1] + targetNode.pos[1]) / 2,
        ];
        this.graph.add(bridge);
        _origConnect.call(this, outputSlot, bridge, 0);
        _origConnect.call(bridge, 0, targetNode, targetSlot);
        return;
      }
    }
    // Block: dyno → js (no reverse bridge)
    if (DYNO_TYPES.has(output.type) && JS_TYPES.has(input.type)) {
      console.warn(`Cannot connect ${output.type} → ${input.type}. GPU→CPU bridge not supported.`);
      return null;
    }
  }
  return _origConnect.call(this, outputSlot, targetNode, targetSlot);
};

// ── LiteGraph ─────────────────────────────────────────────
registerNodes();

// Node visibility: show our nodes, hide litegraph built-ins
const FILTER = 'workshop';
const OUR_PREFIXES = ['3dgs/', 'Transform/', '3D Model/', 'CPU/', 'Bridge/', 'Subgraph/'];
for (const type in LiteGraph.registered_node_types) {
  const ours = OUR_PREFIXES.some(p => type.startsWith(p));
  LiteGraph.registered_node_types[type].filter = ours ? FILTER : '__hidden__';
}

const graph = new LGraph();
graph.filter = FILTER;

// ── Node error visual feedback ──────────────────────────
graph.onAfterExecute = function () {
  for (const node of graph._nodes) {
    if (!node.inputs || node.inputs.length === 0) continue;
    // Subgraph / preset inputs are optional (have internal defaults)
    if (node.subgraph) { node.boxcolor = null; continue; }
    let missing = false;
    for (const inp of node.inputs) {
      if (inp.link == null && inp.type !== 'transform') {
        missing = true;
        break;
      }
    }
    node.boxcolor = missing ? '#882222' : null;
  }
};

const lgCanvasEl = document.getElementById('litegraph-canvas');
const lgCanvas = new LGraphCanvas(lgCanvasEl, graph);
lgCanvas.background_image = null;
lgCanvas.render_canvas_border = false;
lgCanvas.always_render_background = true;

// Pan / Select: use litegraph defaults (Ctrl+drag = box select, drag bg = pan)
LGraphCanvas.link_type_colors['transform'] = '#e8a040';
LGraphCanvas.link_type_colors['js_float'] = '#40c8c8';
LGraphCanvas.link_type_colors['js_vec3']  = '#40c8c8';

// ── Undo / Redo ─────────────────────────────────────────
const MAX_UNDO = 50;
const undoStack = [];
const redoStack = [];
let _lastSnapshotTime = 0;

function pushUndo() {
  const now = performance.now();
  if (now - _lastSnapshotTime < 300) return; // debounce rapid changes
  _lastSnapshotTime = now;
  const snapshot = JSON.stringify(graph.serialize());
  undoStack.push(snapshot);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0; // new action clears redo
}

// Cache loaded File objects so undo can re-load them
const _splatFileCache = new Map();
export function cacheSplatFile(fileName, file) {
  _splatFileCache.set(fileName, file);
}

function restoreSnapshot(snapshot) {
  // Clean up existing 3D objects
  graph._nodes.forEach(n => {
    if (n._splatMesh) { scene.remove(n._splatMesh); n._splatMesh = null; }
    if (n._helper) { scene.remove(n._helper); n._helper = null; }
    if (n._model) { scene.remove(n._model); n._model = null; }
  });
  _detachGizmo();
  graph.stop();
  const parsed = JSON.parse(snapshot);
  graph.configure(parsed);
  repairSubgraphLinks(parsed);
  graph.start(1e8);

  // Re-load splat files from cache
  graph._nodes.forEach(n => {
    if (n.type === '3dgs/SplatSource' && n._fileName && !n._splatMesh) {
      const cached = _splatFileCache.get(n._fileName);
      if (cached) n._load(cached);
    }
  });

  lgCanvas.setDirty(true, true);
}

graph.onBeforeChange = () => pushUndo();

// ── Repair subgraph links after configure ────────────────
function repairSubgraphLinks(graphData) {
  if (!graphData.links || !graphData.nodes) return;

  const usedLinks = new Set();
  for (const n of graphData.nodes) {
    if (n.inputs) n.inputs.forEach(inp => { if (inp.link != null) usedLinks.add(inp.link); });
    if (n.outputs) n.outputs.forEach(out => { if (out.links) out.links.forEach(l => usedLinks.add(l)); });
  }

  for (const link of graphData.links) {
    if (!link) continue;
    const linkData = Array.isArray(link) ? link : [link.id, link.origin_id, link.origin_slot, link.target_id, link.target_slot, link.type];
    const [linkId, originId, originSlot, targetId, targetSlot] = linkData;
    if (!usedLinks.has(linkId)) continue;

    const originNode = graph.getNodeById(originId);
    const targetNode = graph.getNodeById(targetId);
    if (!originNode || !targetNode) continue;

    const targetInput = targetNode.inputs?.[targetSlot];
    const originOutput = originNode.outputs?.[originSlot];
    const inputOk = targetInput && targetInput.link === linkId;
    const outputOk = originOutput && originOutput.links && originOutput.links.includes(linkId);
    if (inputOk && outputOk && graph.links[linkId]) continue;

    originNode.connect(originSlot, targetNode, targetSlot);
  }
  lgCanvas.setDirty(true, true);
}

export function initGraphManager({ attachGizmo, detachGizmo, getActiveTransformNode, keys }) {
  _attachGizmo = attachGizmo;
  _detachGizmo = detachGizmo;
  _getActiveTransformNode = getActiveTransformNode;
  _keys = keys;

  // ── Node selection → gizmo ──────────────────────────────
  lgCanvas.onNodeSelected = function (node) {
    const activeNode = _getActiveTransformNode();
    if (activeNode) activeNode._selected = false;
    if (node?.type === 'Transform/Transform' && node._helper) {
      node._selected = true;
      _attachGizmo(node);
    } else {
      _detachGizmo();
    }
  };
  lgCanvas.onNodeDeselected = function (node) {
    if (node) node._selected = false;
    _detachGizmo();
  };

  // ── Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo/redo ──────────
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey) return;

    if (e.code === 'KeyZ' && !e.shiftKey) {
      e.preventDefault();
      if (undoStack.length === 0) return;
      redoStack.push(JSON.stringify(graph.serialize()));
      restoreSnapshot(undoStack.pop());
      return;
    }

    if ((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY') {
      e.preventDefault();
      if (redoStack.length === 0) return;
      undoStack.push(JSON.stringify(graph.serialize()));
      restoreSnapshot(redoStack.pop());
      return;
    }
  });

  // ── Ctrl+D to duplicate selected nodes ───────────────────
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'KeyD') {
      e.preventDefault();
      const sel = lgCanvas.selected_nodes;
      if (!sel || Object.keys(sel).length === 0) return;
      lgCanvas.copyToClipboard();
      lgCanvas.pasteFromClipboard();
    }
  });

  // ── Ctrl+Scroll / Ctrl+Plus/Minus to zoom graph ─────────
  lgCanvasEl.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    lgCanvas.ds.changeDeltaScale(delta, [e.clientX, e.clientY]);
    lgCanvas.setDirty(true, true);
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      lgCanvas.ds.changeDeltaScale(1.1);
      lgCanvas.setDirty(true, true);
    }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      lgCanvas.ds.changeDeltaScale(0.9);
      lgCanvas.setDirty(true, true);
    }
  });

  // ── Search box: close on click outside ───────────────────
  document.addEventListener('pointerdown', (e) => {
    if (!lgCanvas.search_box) return;
    if (lgCanvas.search_box.contains(e.target)) return;
    lgCanvas.search_box.close();
  });

  // ── Hotkey node creation (hold 1/2/3/4 + left-click) ────
  const HOTKEY_MAP = {
    Digit1: '3dgs/GPU/math/Float (GPU)',
    Digit2: '3dgs/GPU/math/Vec2 (GPU)',
    Digit3: '3dgs/GPU/math/Vec3 (GPU)',
    Digit4: '3dgs/GPU/math/Vec4 (GPU)',
  };

  lgCanvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;

    for (const [code, nodeType] of Object.entries(HOTKEY_MAP)) {
      if (!_keys[code]) continue;
      e.stopPropagation();
      e.preventDefault();
      const pos = lgCanvas.convertEventToCanvasOffset(e);
      const node = LiteGraph.createNode(nodeType);
      node.pos = [pos[0] - node.size[0] * 0.5, pos[1] - node.size[1] * 0.5];
      graph.add(node);
      lgCanvas.setDirty(true, true);
      return;
    }
  }, true);

  // ── Graph background: dot grid + origin crosshair ────────
  lgCanvas.onDrawBackground = function (ctx, visibleArea) {
    const s = this.ds.scale;

    let spacing = 40;
    if (s < 0.5) spacing = 80;
    if (s < 0.25) spacing = 160;

    const [vx, vy, vw, vh] = visibleArea;
    const startX = Math.floor(vx / spacing) * spacing;
    const startY = Math.floor(vy / spacing) * spacing;

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const dotSize = 1.5 / s;
    for (let x = startX; x < vx + vw + spacing; x += spacing) {
      for (let y = startY; y < vy + vh + spacing; y += spacing) {
        ctx.fillRect(x - dotSize * 0.5, y - dotSize * 0.5, dotSize, dotSize);
      }
    }

    const lineLen = 60;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5 / s;
    ctx.beginPath();
    ctx.moveTo(-lineLen, 0); ctx.lineTo(lineLen, 0);
    ctx.moveTo(0, -lineLen); ctx.lineTo(0, lineLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5 / s;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px sans-serif';
    ctx.fillText('ORIGIN', 10, -8);
  };
}

// ── Resize helper (called from ui.js) ────────────────────
const HEADER_H = 24;

export function resizeLG() {
  const graphEl = document.getElementById('graph-container');
  const h = graphEl.clientHeight - HEADER_H;
  lgCanvasEl.width  = graphEl.clientWidth;
  lgCanvasEl.height = Math.max(0, h);
  lgCanvas.resize(lgCanvasEl.width, lgCanvasEl.height);
}

export function startGraph() {
  graph.start(1e8);
  resizeLG();
}

export { graph, lgCanvas, pushUndo, repairSubgraphLinks };
