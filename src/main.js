import { scene } from './scene.js';
import { renderCornerGizmo } from './gizmos.js';
import { renderer, camera, composer, bloomPass, spark, keys, applyKeyboardMovement, getRenderScale, setRenderScale, getMouseOver3D, setGizmoDragging } from './viewport.js';
import { initGizmo, attachGizmo, detachGizmo, getActiveTransformNode } from './gizmo-manager.js';
import { graph, lgCanvas, pushUndo, resizeLG, initGraphManager, startGraph, repairSubgraphLinks } from './graph-manager.js';
import { initProjectIO } from './project-io.js';
import { initUI } from './ui.js';

// ── Wire modules together ────────────────────────────────

// 1. Gizmo needs: camera, domElement, scene, pushUndo, mouseOver3D, viewport dragging sync
initGizmo(camera, renderer.domElement, scene, {
  pushUndo,
  getMouseOver3D,
  setGizmoDragging,
});

// 2. Graph manager needs: gizmo attach/detach, keys for hotkey creation
initGraphManager({
  attachGizmo,
  detachGizmo,
  getActiveTransformNode,
  keys,
});

// 3. Start graph + resize listeners
startGraph();

// 4. Project IO needs: graph, lgCanvas, repairSubgraphLinks
initProjectIO(graph, lgCanvas, { repairSubgraphLinks });

// 5. UI needs: renderer, camera, renderScale accessors, spark, resizeLG
initUI(renderer, camera, {
  getRenderScale,
  setRenderScale,
  spark,
  composer,
  bloomPass,
  resizeLG,
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
  composer.render();
  renderCornerGizmo(renderer, camera, getRenderScale());
  updateStats(time);
});
