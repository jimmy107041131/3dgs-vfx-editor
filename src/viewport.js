import * as THREE from 'three';
import { SparkRenderer } from '@sparkjsdev/spark';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { scene } from './scene.js';

// ── Renderer ──────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
let renderScale = 1.0;
container.appendChild(renderer.domElement);

// ── SparkRenderer (explicit, so we can control maxStdDev) ──
const spark = new SparkRenderer({ renderer, maxStdDev: Math.sqrt(5) });
scene.add(spark);

const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
camera.position.set(0, 3, 5);

// ── Post-processing ──────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4,   // strength
  0.5,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ── FPS Camera Controls ──────────────────────────────────
const keys = {};
let _mouseOver3D = false;

// Shared gizmo-dragging state — set by gizmo-manager via setter
let _gizmoDragging = false;

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup',   (e) => { keys[e.code] = false; });

renderer.domElement.addEventListener('mouseenter', () => { _mouseOver3D = true; });
renderer.domElement.addEventListener('mouseleave', () => { _mouseOver3D = false; isDragLook = false; isDragPan = false; });

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
  if (_gizmoDragging) return; // don't start camera drag while gizmo is active
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
  if (_gizmoDragging) return;
  camera.getWorldDirection(_forward);
  camera.position.addScaledVector(_forward, -Math.sign(e.deltaY) * SCROLL_SPEED);
}, { passive: false });

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

function applyKeyboardMovement() {
  if (!_mouseOver3D || _gizmoDragging) return;
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

// ── Reset camera ────────────────────────────────────────────
function resetCamera() {
  camera.position.set(2, 0.5, 2);
  camera.lookAt(0, 0, 0);
  _euler.setFromQuaternion(camera.quaternion, 'YXZ');
  _euler.x = 0; // remove pitch
  camera.quaternion.setFromEuler(_euler);
}

document.getElementById('btn-reset-cam').addEventListener('click', resetCamera);

export {
  renderer,
  camera,
  composer,
  bloomPass,
  spark,
  keys,
  applyKeyboardMovement,
  resetCamera,
};

export function getRenderScale() { return renderScale; }
export function setRenderScale(v) { renderScale = v; }
export function getMouseOver3D() { return _mouseOver3D; }
export function setGizmoDragging(v) { _gizmoDragging = v; }
