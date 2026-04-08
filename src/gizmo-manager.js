import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { NO_BLOOM_LAYER } from './layers.js';

let tControls;
let _activeTransformNode = null;
let _gizmoDragging = false;

// Dependencies injected via init
let _pushUndo = null;
let _getMouseOver3D = null;
let _setGizmoDragging = null;

export function initGizmo(camera, domElement, scene, { pushUndo, getMouseOver3D, setGizmoDragging }) {
  _pushUndo = pushUndo;
  _getMouseOver3D = getMouseOver3D;
  _setGizmoDragging = setGizmoDragging;

  tControls = new TransformControls(camera, domElement);
  tControls.visible = false;
  tControls.enabled = false;
  scene.add(tControls.getHelper());
  tControls.getHelper().traverse(c => c.layers.set(NO_BLOOM_LAYER));
  tControls.getRaycaster().layers.enable(NO_BLOOM_LAYER);

  tControls.addEventListener('dragging-changed', (e) => {
    if (e.value && !_gizmoDragging) _pushUndo(); // snapshot before gizmo drag starts
    _gizmoDragging = e.value;
    _setGizmoDragging(e.value); // sync to viewport
  });

  tControls.addEventListener('change', () => {
    if (!_activeTransformNode || !_gizmoDragging) return;
    const obj = tControls.object;
    if (!obj) return;
    _activeTransformNode.setFromGizmo(obj.position, obj.quaternion, obj.scale);
  });

  // 1/2/3 gizmo mode switch (only when hovering viewport)
  window.addEventListener('keydown', (e) => {
    if (!_getMouseOver3D() || !_activeTransformNode) return;
    if (e.code === 'Digit1') { tControls.setMode('translate'); e.stopPropagation(); }
    if (e.code === 'Digit2') { tControls.setMode('rotate');    e.stopPropagation(); }
    if (e.code === 'Digit3') { tControls.setMode('scale');     e.stopPropagation(); }
  });
}

export function attachGizmo(transformNode) {
  if (_activeTransformNode === transformNode) return;
  detachGizmo();
  if (!transformNode?._helper) return;
  _activeTransformNode = transformNode;
  tControls.attach(transformNode._helper);
  tControls.getHelper().traverse(c => c.layers.set(NO_BLOOM_LAYER));
  tControls.visible = true;
  tControls.enabled = true;
}

export function detachGizmo() {
  if (_activeTransformNode) {
    tControls.detach();
    tControls.visible = false;
    tControls.enabled = false;
    _activeTransformNode = null;
  }
  // Always clear drag state on detach (e.g. undo during drag)
  _gizmoDragging = false;
  if (_setGizmoDragging) _setGizmoDragging(false);
}

export function getActiveTransformNode() { return _activeTransformNode; }
