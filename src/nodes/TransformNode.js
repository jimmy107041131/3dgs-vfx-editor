import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';
import { scene } from '../scene.js';

export function registerTransformNode() {
  function TransformNode() {
    this.addInput('parent', 'transform');
    this.addOutput('transform', 'transform');
    this.title = 'Transform';
    this.size = [200, 290];
    this.properties = {
      px: 0, py: 0, pz: 0,
      rx: 0, ry: 0, rz: 0,
      sx: 1, sy: 1, sz: 1,
    };

    // 3D helper (axes in viewport, only visible when selected)
    this._helper = new THREE.AxesHelper(0.5);
    this._helper.visible = false;
    this._helper.userData.transformNode = this;
    this._selected = false;
    scene.add(this._helper);

    // Local transform state
    this._position   = new THREE.Vector3();
    this._quaternion  = new THREE.Quaternion();
    this._scale       = new THREE.Vector3(1, 1, 1);
    this._worldOutput = null;

    const self = this;
    const update = () => { self._dirty = true; };
    this._dirty = true;

    // Position
    this.addWidget('number', 'pos X', 0, (v) => { self.properties.px = v; update(); }, { step: 0.1 });
    this.addWidget('number', 'pos Y', 0, (v) => { self.properties.py = v; update(); }, { step: 0.1 });
    this.addWidget('number', 'pos Z', 0, (v) => { self.properties.pz = v; update(); }, { step: 0.1 });
    // Rotation (euler degrees)
    this.addWidget('number', 'rot X', 0, (v) => { self.properties.rx = v; update(); }, { step: 1 });
    this.addWidget('number', 'rot Y', 0, (v) => { self.properties.ry = v; update(); }, { step: 1 });
    this.addWidget('number', 'rot Z', 0, (v) => { self.properties.rz = v; update(); }, { step: 1 });
    // Scale (per-axis)
    this.addWidget('number', 'scale X', 1, (v) => { self.properties.sx = v; update(); }, { step: 0.1, min: 0.01 });
    this.addWidget('number', 'scale Y', 1, (v) => { self.properties.sy = v; update(); }, { step: 0.1, min: 0.01 });
    this.addWidget('number', 'scale Z', 1, (v) => { self.properties.sz = v; update(); }, { step: 0.1, min: 0.01 });
  }

  TransformNode.title = 'Transform';
  TransformNode.prototype.color = '#3a2a1a';
  TransformNode.prototype.bgcolor = '#3e2e1e';

  TransformNode.prototype.onConfigure = function () {
    const p = this.properties;
    const vals = [p.px, p.py, p.pz, p.rx, p.ry, p.rz, p.sx, p.sy, p.sz];
    vals.forEach((v, i) => { if (this.widgets?.[i]) this.widgets[i].value = v ?? (i >= 6 ? 1 : 0); });
    this._dirty = true;
  };

  TransformNode.prototype.onExecute = function () {
    // Skip recomputation if nothing changed (no parent = static)
    const parent = this.getInputData(0);
    if (!this._dirty && !parent && this._worldOutput) {
      this._helper.visible = this._selected;
      this.setOutputData(0, this._worldOutput);
      return;
    }
    this._dirty = false;

    const p = this.properties;
    this._position.set(p.px, p.py, p.pz);
    this._quaternion.setFromEuler(new THREE.Euler(
      p.rx * Math.PI / 180,
      p.ry * Math.PI / 180,
      p.rz * Math.PI / 180,
      'YXZ'
    ));
    this._scale.set(p.sx, p.sy, p.sz);

    let worldPos, worldQuat, worldScale;
    if (parent) {
      worldScale = parent.scale.clone().multiply(this._scale);
      worldQuat  = parent.quaternion.clone().multiply(this._quaternion);
      worldPos   = this._position.clone().multiply(parent.scale);
      worldPos.applyQuaternion(parent.quaternion);
      worldPos.add(parent.position);
    } else {
      worldPos   = this._position.clone();
      worldQuat  = this._quaternion.clone();
      worldScale = this._scale.clone();
    }

    this._worldOutput = {
      position:   worldPos,
      quaternion: worldQuat,
      scale:      worldScale,
    };

    this._helper.position.copy(worldPos);
    this._helper.quaternion.copy(worldQuat);
    this._helper.scale.copy(worldScale);
    this._helper.visible = this._selected;

    this.setOutputData(0, this._worldOutput);
  };

  TransformNode.prototype.onRemoved = function () {
    if (this._helper) {
      scene.remove(this._helper);
      this._helper.dispose();
      this._helper = null;
    }
  };

  // Called from gizmo system to write back values (world → local conversion)
  TransformNode.prototype.setFromGizmo = function (worldPos, worldQuat, worldScale) {
    const parent = this.getInputData(0);
    let localPos, localQuat, localScale;

    if (parent) {
      // Invert parent transform to get local space
      const parentQuatInv = parent.quaternion.clone().invert();
      const parentScaleInv = new THREE.Vector3(1 / parent.scale.x, 1 / parent.scale.y, 1 / parent.scale.z);

      localPos = worldPos.clone().sub(parent.position).applyQuaternion(parentQuatInv).multiply(parentScaleInv);
      localQuat = parentQuatInv.clone().multiply(worldQuat);
      localScale = worldScale.clone().multiply(parentScaleInv);
    } else {
      localPos = worldPos;
      localQuat = worldQuat;
      localScale = worldScale;
    }

    const p = this.properties;
    p.px = localPos.x; p.py = localPos.y; p.pz = localPos.z;

    const euler = new THREE.Euler().setFromQuaternion(localQuat, 'YXZ');
    p.rx = euler.x * 180 / Math.PI;
    p.ry = euler.y * 180 / Math.PI;
    p.rz = euler.z * 180 / Math.PI;

    p.sx = localScale.x; p.sy = localScale.y; p.sz = localScale.z;

    // Sync widgets
    const vals = [p.px, p.py, p.pz, p.rx, p.ry, p.rz, p.sx, p.sy, p.sz];
    vals.forEach((v, i) => { if (this.widgets?.[i]) this.widgets[i].value = v; });
    this._dirty = true;
  };

  LiteGraph.registerNodeType('3dgs/Transform', TransformNode);
}
