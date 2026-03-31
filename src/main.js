import * as THREE from 'three';
import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';
import 'litegraph.js/css/litegraph.css';
import { scene } from './scene.js';
import { renderCornerGizmo, toggleGrid, toggleAxes, toggleCorner } from './gizmos.js';
import { registerNodes } from './nodes/index.js';

// ── Renderer ──────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
camera.position.set(0, 3, 5);

// ── FPS Camera Controls ──────────────────────────────────
const keys = {};
let mouseOver3D = false;

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup',   (e) => { keys[e.code] = false; });

renderer.domElement.addEventListener('mouseenter', () => { mouseOver3D = true; });
renderer.domElement.addEventListener('mouseleave', () => { mouseOver3D = false; isDragLook = false; isDragPan = false; });

const _euler   = new THREE.Euler(0, 0, 0, 'YXZ');
const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();
const _up      = new THREE.Vector3(0, 1, 0);

// Init euler from camera
_euler.setFromQuaternion(camera.quaternion, 'YXZ');

let isDragLook = false;
let isDragPan  = false;
let prevX = 0, prevY = 0;
const LOOK_SPEED = 0.003;
const PAN_SPEED  = 0.005;
const SCROLL_SPEED = 0.5;

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0) { isDragLook = true; prevX = e.clientX; prevY = e.clientY; }
  if (e.button === 2) { isDragPan  = true; prevX = e.clientX; prevY = e.clientY; }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) isDragLook = false;
  if (e.button === 2) isDragPan  = false;
});

window.addEventListener('mousemove', (e) => {
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;

  if (isDragLook) {
    _euler.y -= dx * LOOK_SPEED;
    _euler.x -= dy * LOOK_SPEED;
    _euler.x = Math.max(-Math.PI * 0.495, Math.min(Math.PI * 0.495, _euler.x));
    camera.quaternion.setFromEuler(_euler);
  }

  if (isDragPan) {
    camera.getWorldDirection(_forward);
    _right.crossVectors(_forward, _up).normalize();
    const panUp = new THREE.Vector3().crossVectors(_right, _forward).normalize();
    camera.position.addScaledVector(_right, -dx * PAN_SPEED);
    camera.position.addScaledVector(panUp,   dy * PAN_SPEED);
  }
});

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  camera.getWorldDirection(_forward);
  camera.position.addScaledVector(_forward, -Math.sign(e.deltaY) * SCROLL_SPEED);
}, { passive: false });

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

function applyKeyboardMovement() {
  if (!mouseOver3D) return;
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

  const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 0.08 : 0.02;
  camera.getWorldDirection(_forward);
  _forward.y = 0;
  _forward.normalize();
  _right.crossVectors(_forward, _up).normalize();

  const delta = new THREE.Vector3();
  if (keys['KeyW']) delta.addScaledVector(_forward,  speed);
  if (keys['KeyS']) delta.addScaledVector(_forward, -speed);
  if (keys['KeyA']) delta.addScaledVector(_right,   -speed);
  if (keys['KeyD']) delta.addScaledVector(_right,    speed);
  if (keys['KeyE']) delta.addScaledVector(_up,       speed);
  if (keys['KeyQ']) delta.addScaledVector(_up,      -speed);

  if (delta.lengthSq() > 0) {
    camera.position.add(delta);
  }
}

// ── Panel layout ───────────────────────────────────────────
const HEADER_H = 24;
const MIN_GRAPH_H = HEADER_H + 40;
const MIN_3D_H = 80;
let graphHeight = 280;
let collapsed = false;

const dividerEl = document.getElementById('divider');
const graphEl   = document.getElementById('graph-container');
const canvasEl  = document.getElementById('canvas-container');

function applyLayout() {
  const totalH = window.innerHeight;
  const gh = collapsed ? HEADER_H : Math.max(MIN_GRAPH_H, Math.min(graphHeight, totalH - MIN_3D_H));
  const divH = collapsed ? 0 : 6;
  const viewH = totalH - gh - divH;

  canvasEl.style.height = viewH + 'px';
  dividerEl.style.bottom = gh + 'px';
  dividerEl.style.height = divH + 'px';
  graphEl.style.height   = gh + 'px';

  renderer.setSize(window.innerWidth, viewH);
  camera.aspect = window.innerWidth / viewH;
  camera.updateProjectionMatrix();

  // Stats HUD: just below corner gizmo (gizmo: 10px from bottom of viewport, 100px tall)
  const statsEl = document.getElementById('stats-hud');
  if (statsEl) statsEl.style.bottom = (gh + divH + 4) + 'px';
}

window.addEventListener('resize', applyLayout);
applyLayout();

dividerEl.addEventListener('mousedown', (e) => {
  if (collapsed) return;
  e.preventDefault();
  dividerEl.classList.add('dragging');
  const startY = e.clientY;
  const startGH = graphHeight;
  const onMove = (e) => {
    graphHeight = Math.max(MIN_GRAPH_H, Math.min(startGH + (startY - e.clientY), window.innerHeight - MIN_3D_H));
    applyLayout();
    resizeLG();
  };
  const onUp = () => {
    dividerEl.classList.remove('dragging');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
});

document.getElementById('btn-collapse').addEventListener('click', () => {
  collapsed = !collapsed;
  document.getElementById('btn-collapse').textContent = collapsed ? '▲' : '▼';
  applyLayout();
  if (!collapsed) resizeLG();
});

// ── Help panel toggle ────────────────────────────────────
const helpPanel = document.getElementById('help-panel');
document.getElementById('btn-help').addEventListener('click', () => {
  helpPanel.classList.toggle('open');
});
document.getElementById('help-close').addEventListener('click', () => {
  helpPanel.classList.remove('open');
});

// ── LiteGraph ─────────────────────────────────────────────
registerNodes();

// Node visibility: set all visible 3dgs nodes to filter='3dgs',
// everything else (litegraph built-ins + infrastructure) to a different filter.
// Then set graph.filter='3dgs' so only matching nodes appear in menus AND search.
const FILTER = '3dgs';
const INFRA  = new Set(['3dgs/MapGet', '3dgs/MapSet', '3dgs/Renderer']);
for (const type in LiteGraph.registered_node_types) {
  const show = type.startsWith('3dgs/') && !INFRA.has(type);
  LiteGraph.registered_node_types[type].filter = show ? FILTER : '__hidden__';
}

const graph = new LGraph();
graph.filter = FILTER;
const lgCanvasEl = document.getElementById('litegraph-canvas');
const lgCanvas = new LGraphCanvas(lgCanvasEl, graph);
lgCanvas.background_image = null;
lgCanvas.render_canvas_border = false;
lgCanvas.always_render_background = true;
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

// ── Search box: close on click outside ───────────────────
document.addEventListener('pointerdown', (e) => {
  if (!lgCanvas.search_box) return;
  if (lgCanvas.search_box.contains(e.target)) return;
  lgCanvas.search_box.close();
});

// ── Hotkey node creation (hold 1/2/3/4 + left-click) ────
const HOTKEY_MAP = {
  Digit1: '3dgs/math/Float',
  Digit2: '3dgs/math/Vec2',
  Digit3: '3dgs/math/Vec3',
  Digit4: '3dgs/math/Vec4',
};

lgCanvasEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;

  // Hotkey node creation (1/2/3/4 + click)
  for (const [code, nodeType] of Object.entries(HOTKEY_MAP)) {
    if (!keys[code]) continue;
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

  // Dot grid
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

  // Origin crosshair
  const lineLen = 60;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5 / s;
  ctx.beginPath();
  ctx.moveTo(-lineLen, 0); ctx.lineTo(lineLen, 0);
  ctx.moveTo(0, -lineLen); ctx.lineTo(0, lineLen);
  ctx.stroke();

  // Origin circle
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5 / s;
  ctx.stroke();

  // "ORIGIN" label
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px sans-serif';
  ctx.fillText('ORIGIN', 10, -8);
};

function resizeLG() {
  const h = graphEl.clientHeight - HEADER_H;
  lgCanvasEl.width  = graphEl.clientWidth;
  lgCanvasEl.height = Math.max(0, h);
  lgCanvas.resize(lgCanvasEl.width, lgCanvasEl.height);
}
window.addEventListener('resize', resizeLG);
resizeLG();

graph.start();


// ── Gizmo toggles ──────────────────────────────────────────
document.getElementById('btn-gizmos').addEventListener('click', (e) => {
  toggleGrid(); toggleAxes(); toggleCorner();
  e.currentTarget.classList.toggle('active');
});

// ── Quick load (auto-creates SplatSource node) ─────────────
document.getElementById('btn-load').addEventListener('click', () => {
  fileDropdown.classList.remove('open');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.splat,.ply,.spz';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const existing = graph._nodes.filter(n => n.type === '3dgs/SplatSource').length;
    const rowY = 60 + existing * 200;

    // Create nodes
    const nSource    = LiteGraph.createNode('3dgs/SplatSource');
    const nMapGet    = LiteGraph.createNode('3dgs/MapGet');
    const nMapSet    = LiteGraph.createNode('3dgs/MapSet');
    const nTransform = LiteGraph.createNode('3dgs/Transform');
    const nRenderer  = LiteGraph.createNode('3dgs/Renderer');

    nSource.pos    = [60,  rowY];
    nMapGet.pos    = [310, rowY];
    nMapSet.pos    = [530, rowY];
    nTransform.pos = [750, rowY];
    nRenderer.pos  = [1000, rowY];

    graph.add(nSource);
    graph.add(nMapGet);
    graph.add(nMapSet);
    graph.add(nTransform);
    graph.add(nRenderer);

    // Wire: SplatSource → MapGet
    nSource.connect(0, nMapGet, 0);

    // Wire: MapGet → MapSet (center, scales, quaternion, rgba, source)
    nMapGet.connect(0, nMapSet, 0); // center
    nMapGet.connect(1, nMapSet, 1); // scales
    nMapGet.connect(2, nMapSet, 2); // quaternion
    nMapGet.connect(3, nMapSet, 3); // rgba
    nMapGet.connect(5, nMapSet, 4); // source passthrough

    // Wire: MapSet → Transform → Renderer
    nMapSet.connect(0, nTransform, 0);
    nTransform.connect(0, nRenderer, 0);

    nSource._load(file);
  };
  input.click();
});

// ── Repair subgraph links after configure ────────────────
// litegraph's Subgraph.configure rebuilds internal graph, which can
// disrupt external input/output connections. This re-applies links
// from the saved data to fix broken connections.
function repairSubgraphLinks(graphData) {
  if (!graphData.links || !graphData.nodes) return;

  // Build set of links actually referenced by node inputs/outputs
  const usedLinks = new Set();
  for (const n of graphData.nodes) {
    if (n.inputs) n.inputs.forEach(inp => { if (inp.link != null) usedLinks.add(inp.link); });
    if (n.outputs) n.outputs.forEach(out => { if (out.links) out.links.forEach(l => usedLinks.add(l)); });
  }

  // Only try to repair links that are actually referenced
  for (const link of graphData.links) {
    if (!link) continue;
    const linkData = Array.isArray(link) ? link : [link.id, link.origin_id, link.origin_slot, link.target_id, link.target_slot, link.type];
    const [linkId, originId, originSlot, targetId, targetSlot] = linkData;
    if (!usedLinks.has(linkId)) continue; // orphan link, skip

    const originNode = graph.getNodeById(originId);
    const targetNode = graph.getNodeById(targetId);
    if (!originNode || !targetNode) continue;

    // Check if this link is fully connected on both sides
    const targetInput = targetNode.inputs?.[targetSlot];
    const originOutput = originNode.outputs?.[originSlot];
    const inputOk = targetInput && targetInput.link === linkId;
    const outputOk = originOutput && originOutput.links && originOutput.links.includes(linkId);
    if (inputOk && outputOk && graph.links[linkId]) continue; // fully connected

    // Reconnect
    originNode.connect(originSlot, targetNode, targetSlot);
  }
  lgCanvas.setDirty(true, true);
}

// ── File dropdown toggle ─────────────────────────────────
const fileDropdown = document.getElementById('file-dropdown');
document.getElementById('btn-file').addEventListener('click', () => {
  fileDropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#file-wrapper'))  fileDropdown.classList.remove('open');
});


// ── Save graph JSON ──────────────────────────────────────
document.getElementById('btn-save').addEventListener('click', () => {
  fileDropdown.classList.remove('open');
  const data = graph.serialize();
  // Clean orphan links: remove links not referenced by any node input/output
  if (data.links && data.nodes) {
    const usedLinks = new Set();
    for (const n of data.nodes) {
      if (n.inputs) n.inputs.forEach(inp => { if (inp.link != null) usedLinks.add(inp.link); });
      if (n.outputs) n.outputs.forEach(out => { if (out.links) out.links.forEach(l => usedLinks.add(l)); });
    }
    data.links = data.links.filter(l => l && usedLinks.has(l[0]));
  }
  // Record splat file names so user knows which files to reload
  const splatFiles = graph._nodes
    .filter(n => n.type === '3dgs/SplatSource' && n._fileName)
    .map(n => n._fileName);
  const save = { version: 1, splatFiles, graph: data };
  const blob = new Blob([JSON.stringify(save)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '3dgs-project.json';
  a.click();
});

// ── Open project (select folder containing JSON + splat files) ──
document.getElementById('btn-open').addEventListener('click', () => {
  fileDropdown.classList.remove('open');
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const jsonFile = files.find(f => f.name.endsWith('.json'));
    const splatFiles = files.filter(f => /\.(splat|ply|spz)$/i.test(f.name));

    if (!jsonFile) {
      alert('No .json project file found in the selected folder');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const save = JSON.parse(reader.result);
        const graphData = save.graph || save;

        // Clear all splat meshes from scene
        graph._nodes.forEach(n => {
          if (n._splatMesh) { scene.remove(n._splatMesh); n._splatMesh = null; }
        });
        graph.stop();
        graph.configure(graphData);
        repairSubgraphLinks(graphData);
        graph.start();
        lgCanvas.setDirty(true, true);

        // Match splat files to SplatSource nodes by filename
        const sources = graph._nodes.filter(n => n.type === '3dgs/SplatSource');
        const unmatched = [];
        for (const node of sources) {
          const match = splatFiles.find(f => f.name === node._fileName);
          if (match) {
            node._load(match);
          } else if (node._fileName) {
            unmatched.push(node._fileName);
          }
        }
        if (unmatched.length > 0) {
          alert('These splat files were not found in the folder:\n\n' + unmatched.join('\n') + '\n\nUse "Load File" on each node to load them manually.');
        }
      } catch (err) {
        alert('Failed to load project: ' + err.message);
      }
    };
    reader.readAsText(jsonFile);
  };
  input.click();
});

// ── Stats HUD ────────────────────────────────────────────
const statsHud = document.getElementById('stats-hud');
let lastStatsUpdate = 0;
let frameCount = 0;
let fps3d = 0;

function updateStats(now) {
  frameCount++;
  if (now - lastStatsUpdate >= 1000) {
    fps3d = frameCount;
    frameCount = 0;
    lastStatsUpdate = now;

    let totalSplats = 0;
    graph._nodes.forEach(n => {
      if (n.type === '3dgs/SplatSource' && n._splatMesh?.packedSplats?.numSplats) {
        totalSplats += n._splatMesh.packedSplats.numSplats;
      }
    });

    const splatsStr = totalSplats > 0
      ? (totalSplats >= 1e6 ? (totalSplats / 1e6).toFixed(2) + 'M' : (totalSplats / 1e3).toFixed(1) + 'K')
      : '0';

    statsHud.textContent = `${fps3d} FPS | ${splatsStr} splats`;
  }
}

// ── Loop ──────────────────────────────────────────────────
renderer.setAnimationLoop((time) => {
  applyKeyboardMovement();
  renderer.render(scene, camera);
  renderCornerGizmo(renderer, camera);
  updateStats(time);
});
