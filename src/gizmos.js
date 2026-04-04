import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { scene } from './scene.js';
import { NO_BLOOM_LAYER } from './layers.js';

// ── Grid（XZ 平面，Y 為高度軸）────────────────────────────
const gridHelper = new THREE.GridHelper(100, 100, 0x555555, 0x333333);
scene.add(gridHelper);
gridHelper.layers.set(NO_BLOOM_LAYER);

// ── XZ 軸線（粗線，Line2）───────────────────────────────
const axisGeo = new LineSegmentsGeometry();
axisGeo.setPositions([
  -50, 0, 0, 50, 0, 0,  // X axis
  0, 0, -50, 0, 0, 50,  // Z axis
]);
axisGeo.setColors([
  1, 0.2, 0.2, 1, 0.2, 0.2,  // X: red
  0.2, 0.4, 1, 0.2, 0.4, 1,  // Z: blue
]);
const axisMat = new LineMaterial({
  vertexColors: true,
  linewidth: 3,        // screen-space pixels
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
});
const axisLines = new LineSegments2(axisGeo, axisMat);
axisLines.computeLineDistances();
scene.add(axisLines);
axisLines.layers.set(NO_BLOOM_LAYER);

// Keep resolution up to date
window.addEventListener('resize', () => {
  axisMat.resolution.set(window.innerWidth, window.innerHeight);
});

// ── 原點白點 ─────────────────────────────────────────────
const dotGeo = new THREE.SphereGeometry(0.03, 12, 12);
const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const originDot = new THREE.Mesh(dotGeo, dotMat);
originDot.position.set(0, 0, 0);
scene.add(originDot);
originDot.layers.set(NO_BLOOM_LAYER);

// ── Corner orientation gizmo ──────────────────────────────
const gizmoScene = new THREE.Scene();
const gizmoAxes = new THREE.AxesHelper(0.8);
gizmoScene.add(gizmoAxes);

const gizmoCamera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 10);
gizmoCamera.position.set(0, 0, 3);
gizmoCamera.lookAt(0, 0, 0);

// ── Visibility state ──────────────────────────────────────
export const gizmoState = { grid: true, axes: true, corner: true };

export function toggleGrid() {
  gizmoState.grid = !gizmoState.grid;
  gridHelper.visible = gizmoState.grid;
}
export function toggleAxes() {
  gizmoState.axes = !gizmoState.axes;
  axisLines.visible = gizmoState.axes;
  originDot.visible = gizmoState.axes;
}
export function toggleCorner() {
  gizmoState.corner = !gizmoState.corner;
}

// ── Corner gizmo render（每幀呼叫）───────────────────────
export function renderCornerGizmo(renderer, camera, scale = 1) {
  if (!gizmoState.corner) return;

  gizmoAxes.quaternion.copy(camera.quaternion).invert();

  const size = Math.round(100 * scale);
  const offset = Math.round(10 * scale);
  const canvas = renderer.domElement;

  renderer.setViewport(offset, offset, size, size);
  renderer.setScissor(offset, offset, size, size);
  renderer.setScissorTest(true);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(gizmoScene, gizmoCamera);
  renderer.autoClear = true;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, canvas.width, canvas.height);
}
