import { toggleGrid, toggleAxes, toggleCorner } from './gizmos.js';
import { directional } from './scene.js';

let _renderer = null;
let _camera = null;
let _getRenderScale = null;
let _setRenderScale = null;
let _spark = null;
let _resizeLG = null;
let _resizeBloom = null;

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
  const bufW = Math.round(window.innerWidth * renderScale);
  const bufH = Math.round(viewH * renderScale);
  _renderer.setSize(bufW, bufH, false);
  _renderer.domElement.style.width  = window.innerWidth + 'px';
  _renderer.domElement.style.height = viewH + 'px';
  _camera.aspect = window.innerWidth / viewH;
  _camera.updateProjectionMatrix();
  // Bloom composers: pass buffer dimensions directly, bypass pixelRatio
  if (_resizeBloom) _resizeBloom(bufW, bufH);

  const statsEl = document.getElementById('stats-hud');
  if (statsEl) statsEl.style.bottom = (gh + divH + 4) + 'px';

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

export function initUI(renderer, camera, { getRenderScale, setRenderScale, spark, resizeLG,
  setBloomStrength, setBloomRadius, setBloomThreshold, setBloomEnabled,
  setLensflareEnabled, setLensflareIntensity, setLensflareStreakLength,
  setLensflareGhostStrength, setLensflareHaloStrength, resizeBloom }) {
  _renderer = renderer;
  _camera = camera;
  _getRenderScale = getRenderScale;
  _setRenderScale = setRenderScale;
  _spark = spark;
  _resizeLG = resizeLG;
  _resizeBloom = resizeBloom;

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

  // ── Bloom sliders ──────────────────────────────────────────
  const bloomStrSlider = document.getElementById('slider-bloom-str');
  const bloomRadSlider = document.getElementById('slider-bloom-rad');
  const bloomThrSlider = document.getElementById('slider-bloom-thr');
  const bloomStrVal = document.getElementById('bloom-str-val');
  const bloomRadVal = document.getElementById('bloom-rad-val');
  const bloomThrVal = document.getElementById('bloom-thr-val');

  bloomStrSlider.addEventListener('input', () => {
    const v = parseFloat(bloomStrSlider.value);
    bloomStrVal.textContent = v.toFixed(2);
    setBloomStrength(v);
  });
  bloomRadSlider.addEventListener('input', () => {
    const v = parseFloat(bloomRadSlider.value);
    bloomRadVal.textContent = v.toFixed(2);
    setBloomRadius(v);
  });
  bloomThrSlider.addEventListener('input', () => {
    const v = parseFloat(bloomThrSlider.value);
    bloomThrVal.textContent = v.toFixed(2);
    setBloomThreshold(v);
  });
  document.getElementById('chk-bloom').addEventListener('change', (e) => {
    setBloomEnabled(e.target.checked);
  });

  // ── Lens Flare controls ─────────────────────────────────────
  document.getElementById('chk-lensflare').addEventListener('change', (e) => {
    setLensflareEnabled(e.target.checked);
  });

  const lfIntSlider = document.getElementById('slider-lf-intensity');
  const lfIntVal = document.getElementById('lf-intensity-val');
  lfIntSlider.addEventListener('input', () => {
    const v = parseFloat(lfIntSlider.value);
    lfIntVal.textContent = v.toFixed(2);
    setLensflareIntensity(v);
  });

  const lfStreakSlider = document.getElementById('slider-lf-streak');
  const lfStreakVal = document.getElementById('lf-streak-val');
  lfStreakSlider.addEventListener('input', () => {
    const v = parseFloat(lfStreakSlider.value);
    lfStreakVal.textContent = v.toFixed(2);
    setLensflareStreakLength(v);
  });

  const lfGhostSlider = document.getElementById('slider-lf-ghost');
  const lfGhostVal = document.getElementById('lf-ghost-val');
  lfGhostSlider.addEventListener('input', () => {
    const v = parseFloat(lfGhostSlider.value);
    lfGhostVal.textContent = v.toFixed(2);
    setLensflareGhostStrength(v);
  });

  const lfHaloSlider = document.getElementById('slider-lf-halo');
  const lfHaloVal = document.getElementById('lf-halo-val');
  lfHaloSlider.addEventListener('input', () => {
    const v = parseFloat(lfHaloSlider.value);
    lfHaloVal.textContent = v.toFixed(2);
    setLensflareHaloStrength(v);
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
    helpPanel.classList.remove('open');
  });
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsPanel.classList.remove('open');
  });

  document.getElementById('btn-help').addEventListener('click', () => {
    helpPanel.classList.toggle('open');
    settingsPanel.classList.remove('open');
  });
  document.getElementById('help-close').addEventListener('click', () => {
    helpPanel.classList.remove('open');
  });

  // ── Sun controls ────────────────────────────────────────────
  function updateSunPosition() {
    const azi = parseFloat(document.getElementById('slider-sun-azi').value) * Math.PI / 180;
    const elev = parseFloat(document.getElementById('slider-sun-elev').value) * Math.PI / 180;
    const r = 10;
    directional.position.set(
      r * Math.cos(elev) * Math.sin(azi),
      r * Math.sin(elev),
      r * Math.cos(elev) * Math.cos(azi),
    );
  }

  document.getElementById('chk-sun').addEventListener('change', (e) => {
    directional.visible = e.target.checked;
  });

  document.getElementById('slider-sun-int').addEventListener('input', () => {
    const v = parseFloat(document.getElementById('slider-sun-int').value);
    document.getElementById('sun-int-val').textContent = v.toFixed(2);
    directional.intensity = v;
  });

  document.getElementById('slider-sun-azi').addEventListener('input', () => {
    document.getElementById('sun-azi-val').textContent = document.getElementById('slider-sun-azi').value;
    updateSunPosition();
  });

  document.getElementById('slider-sun-elev').addEventListener('input', () => {
    document.getElementById('sun-elev-val').textContent = document.getElementById('slider-sun-elev').value;
    updateSunPosition();
  });

  document.getElementById('btn-gizmos').addEventListener('click', (e) => {
    toggleGrid(); toggleAxes(); toggleCorner();
    e.currentTarget.classList.toggle('active');
  });

  window.addEventListener('resize', () => {
    applyLayout();
    if (_resizeLG) _resizeLG();
  });
  applyLayout();
  if (_resizeLG) _resizeLG();
}
