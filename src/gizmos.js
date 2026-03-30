import * as THREE from 'three';
import { scene } from './scene.js';

// ── Grid（XZ 平面，Y 為高度軸）────────────────────────────
// Three.js 預設 Y-up，GridHelper 預設就在 XZ 平面，不需旋轉
const gridHelper = new THREE.GridHelper(100, 100, 0x555555, 0x333333);
scene.add(gridHelper);

// ── XZ 軸線畫在網格上（Y=0 平面）────────────────────────
// X 軸（紅）和 Z 軸（藍），Y 為高度軸不畫
const axisPoints = new Float32Array([
  -50, 0,   0,   50, 0,   0,  // X axis
    0, 0, -50,    0, 0,  50,  // Z axis
]);
const axisColors = new Float32Array([
  1, 0.2, 0.2,  1, 0.2, 0.2,  // X: red
  0.2, 0.4, 1,  0.2, 0.4, 1,  // Z: blue
]);
const axisGeo = new THREE.BufferGeometry();
axisGeo.setAttribute('position', new THREE.BufferAttribute(axisPoints, 3));
axisGeo.setAttribute('color',    new THREE.BufferAttribute(axisColors, 3));

const axisMat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
const axisLines = new THREE.LineSegments(axisGeo, axisMat);
scene.add(axisLines);

// ── Corner orientation gizmo ──────────────────────────────
const gizmoScene = new THREE.Scene();
const gizmoAxes  = new THREE.AxesHelper(0.8); // 角落 gizmo 保留完整三軸
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
}
export function toggleCorner() {
  gizmoState.corner = !gizmoState.corner;
}

// ── Corner gizmo render（每幀呼叫）───────────────────────
export function renderCornerGizmo(renderer, camera) {
  if (!gizmoState.corner) return;

  gizmoAxes.quaternion.copy(camera.quaternion).invert();

  const size   = 100;
  const canvas = renderer.domElement;

  renderer.setViewport(10, 10, size, size);
  renderer.setScissor(10, 10, size, size);
  renderer.setScissorTest(true);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(gizmoScene, gizmoCamera);
  renderer.autoClear = true;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, canvas.width, canvas.height);
}
