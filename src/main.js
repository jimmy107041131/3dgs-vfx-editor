import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.15;

// ── Keyboard movement ──────────────────────────────────────
const keys = {};
let mouseOver3D = false;

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup',   (e) => { keys[e.code] = false; });

// Only move when mouse is hovering the 3D viewport
renderer.domElement.addEventListener('mouseenter', () => { mouseOver3D = true; });
renderer.domElement.addEventListener('mouseleave', () => { mouseOver3D = false; });

const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();
const _up      = new THREE.Vector3(0, 1, 0); // Y-up

function applyKeyboardMovement() {
  if (!mouseOver3D) return;
  // Skip if user is typing in any input element
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

  const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 0.08 : 0.02;
  camera.getWorldDirection(_forward);
  _forward.y = 0;   // flatten to XZ ground plane (Y-up)
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
    controls.target.add(delta);
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

// ── Debug load ───────────────────────────────────────────
document.getElementById('btn-sample').addEventListener('click', async () => {
  const DEMO_URL = 'https://github.com/jimmy107041131/3dgs-vfx-editor/releases/download/v0.1.0/demo.spz';
  const res = await fetch(DEMO_URL);
  if (!res.ok) { alert('Failed to load demo — use "載入 3DGS" to load your own file'); return; }
  const blob = await res.blob();
  const file = new File([blob], 'demo.spz');

  const existing = graph._nodes.filter(n => n.type === '3dgs/SplatSource').length;
  const rowY = 60 + existing * 200;

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

  nSource.connect(0, nMapGet, 0);
  nMapGet.connect(0, nMapSet, 0);
  nMapGet.connect(1, nMapSet, 1);
  nMapGet.connect(2, nMapSet, 2);
  nMapGet.connect(3, nMapSet, 3);
  nMapGet.connect(5, nMapSet, 4);
  nMapSet.connect(0, nTransform, 0);
  nTransform.connect(0, nRenderer, 0);

  nSource._load(file);
});

// ── Save graph JSON ──────────────────────────────────────
document.getElementById('btn-save').addEventListener('click', () => {
  const data = graph.serialize();
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

// ── Loop ──────────────────────────────────────────────────
renderer.setAnimationLoop(() => {
  applyKeyboardMovement();
  controls.update();
  renderer.render(scene, camera);
  renderCornerGizmo(renderer, camera);
});
