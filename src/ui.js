import { toggleGrid, toggleAxes, toggleCorner } from './gizmos.js';

// Dependencies injected via init
let _renderer = null;
let _camera = null;
let _getRenderScale = null;
let _setRenderScale = null;
let _spark = null;
let _composer = null;
let _bloomPass = null;
let _resizeLG = null;

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

  const renderScale = _getRenderScale();
  _renderer.setSize(window.innerWidth * renderScale, viewH * renderScale, false);
  _renderer.domElement.style.width  = window.innerWidth + 'px';
  _renderer.domElement.style.height = viewH + 'px';
  _camera.aspect = window.innerWidth / viewH;
  _camera.updateProjectionMatrix();

  if (_composer) _composer.setSize(window.innerWidth * renderScale, viewH * renderScale);

  // Stats HUD: just below corner gizmo
  const statsEl = document.getElementById('stats-hud');
  if (statsEl) statsEl.style.bottom = (gh + divH + 4) + 'px';

  // Reset camera button: 3D viewport bottom-right
  const resetBtn = document.getElementById('btn-reset-cam');
  if (resetBtn) resetBtn.style.bottom = (gh + divH + 12) + 'px';
}

dividerEl.addEventListener('mousedown', (e) => {
  if (collapsed) return;
  e.preventDefault();
  dividerEl.classList.add('dragging');
  const startY = e.clientY;
  const startGH = graphHeight;
  const onMove = (e) => {
    graphHeight = Math.max(MIN_GRAPH_H, Math.min(startGH + (startY - e.clientY), window.innerHeight - MIN_3D_H));
    applyLayout();
    if (_resizeLG) _resizeLG();
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
  if (!collapsed && _resizeLG) _resizeLG();
});

// ── Settings panel ───────────────────────────────────────
const settingsPanel = document.getElementById('settings-panel');
const helpPanel = document.getElementById('help-panel');

export function initUI(renderer, camera, { getRenderScale, setRenderScale, spark, composer, bloomPass, resizeLG }) {
  _renderer = renderer;
  _camera = camera;
  _getRenderScale = getRenderScale;
  _setRenderScale = setRenderScale;
  _spark = spark;
  _composer = composer;
  _bloomPass = bloomPass;
  _resizeLG = resizeLG;

  const sliderPR = document.getElementById('slider-pr');
  const sliderSD = document.getElementById('slider-sd');
  const prVal = document.getElementById('pr-val');
  const sdVal = document.getElementById('sd-val');

  sliderPR.max = devicePixelRatio;
  sliderPR.addEventListener('input', () => {
    const v = parseFloat(sliderPR.value);
    _setRenderScale(v);
    prVal.textContent = v.toFixed(2);
    applyLayout();
  });

  sliderSD.addEventListener('input', () => {
    const v = parseFloat(sliderSD.value);
    sdVal.textContent = v.toFixed(2);
    _spark.maxStdDev = v;
  });

  // Bloom sliders
  const sliderBStr = document.getElementById('slider-bloom-str');
  const sliderBRad = document.getElementById('slider-bloom-rad');
  const sliderBThr = document.getElementById('slider-bloom-thr');
  const bStrVal = document.getElementById('bloom-str-val');
  const bRadVal = document.getElementById('bloom-rad-val');
  const bThrVal = document.getElementById('bloom-thr-val');

  sliderBStr.addEventListener('input', () => {
    const v = parseFloat(sliderBStr.value);
    bStrVal.textContent = v.toFixed(2);
    if (_bloomPass) _bloomPass.strength = v;
  });
  sliderBRad.addEventListener('input', () => {
    const v = parseFloat(sliderBRad.value);
    bRadVal.textContent = v.toFixed(2);
    if (_bloomPass) _bloomPass.radius = v;
  });
  sliderBThr.addEventListener('input', () => {
    const v = parseFloat(sliderBThr.value);
    bThrVal.textContent = v.toFixed(2);
    if (_bloomPass) _bloomPass.threshold = v;
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
    helpPanel.classList.remove('open');
  });
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsPanel.classList.remove('open');
  });

  // ── Help panel toggle ────────────────────────────────────
  document.getElementById('btn-help').addEventListener('click', () => {
    helpPanel.classList.toggle('open');
    settingsPanel.classList.remove('open');
  });
  document.getElementById('help-close').addEventListener('click', () => {
    helpPanel.classList.remove('open');
  });

  // ── Gizmo toggles ──────────────────────────────────────────
  document.getElementById('btn-gizmos').addEventListener('click', (e) => {
    toggleGrid(); toggleAxes(); toggleCorner();
    e.currentTarget.classList.toggle('active');
  });

  // Apply initial layout + resize handler
  window.addEventListener('resize', () => {
    applyLayout();
    if (_resizeLG) _resizeLG();
  });
  applyLayout();
  if (_resizeLG) _resizeLG();
}
