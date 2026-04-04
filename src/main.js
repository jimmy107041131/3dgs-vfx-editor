import { scene } from './scene.js';
import { renderCornerGizmo } from './gizmos.js';
import { renderer, camera, spark, keys, applyKeyboardMovement, getRenderScale, setRenderScale, getMouseOver3D, setGizmoDragging } from './viewport.js';
import { initGizmo, attachGizmo, detachGizmo, getActiveTransformNode } from './gizmo-manager.js';
import { graph, lgCanvas, pushUndo, resizeLG, initGraphManager, startGraph, repairSubgraphLinks } from './graph-manager.js';
import { initProjectIO } from './project-io.js';
import { initUI } from './ui.js';
import { initBloom, renderWithBloom, resizeBloom,
         setBloomStrength, setBloomRadius, setBloomThreshold, setBloomEnabled,
         setLensflareEnabled, setLensflareIntensity, setLensflareStreakLength,
         setLensflareGhostStrength, setLensflareHaloStrength } from './bloom.js';

initGizmo(camera, renderer.domElement, scene, {
  pushUndo,
  getMouseOver3D,
  setGizmoDragging,
});

initGraphManager({
  attachGizmo,
  detachGizmo,
  getActiveTransformNode,
  keys,
});

startGraph();
initProjectIO(graph, lgCanvas, { repairSubgraphLinks });

// ── Bloom / Lensflare init ──────────────────────────────────
const initScale = getRenderScale();
initBloom(renderer, scene, camera,
  Math.round(window.innerWidth * initScale),
  Math.round(window.innerHeight * initScale));

initUI(renderer, camera, {
  getRenderScale,
  setRenderScale,
  spark,
  resizeLG,
  setBloomStrength, setBloomRadius, setBloomThreshold, setBloomEnabled,
  setLensflareEnabled, setLensflareIntensity, setLensflareStreakLength,
  setLensflareGhostStrength, setLensflareHaloStrength, resizeBloom,
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

    const p = camera.position;
    statsHud.textContent = `${fps3d} FPS | ${splatsStr} splats\nXYZ: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`;
  }
}

// ── Render Loop ──────────────────────────────────────────
renderer.setAnimationLoop((time) => {
  graph.runStep(1);
  applyKeyboardMovement();
  renderWithBloom();
  renderCornerGizmo(renderer, camera, getRenderScale());
  updateStats(time);
});
