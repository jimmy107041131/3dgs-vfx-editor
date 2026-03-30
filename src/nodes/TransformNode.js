import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { Gsplat, dynoBlock, splitGsplat, combineGsplat, TransformGsplat,
        DynoVec3, DynoVec4, DynoFloat, mul } = dyno;

function eulerToQuat(rx, ry, rz) {
  const e = new THREE.Euler(
    rx * Math.PI / 180,
    ry * Math.PI / 180,
    rz * Math.PI / 180, 'YXZ'
  );
  const q = new THREE.Quaternion().setFromEuler(e);
  return new THREE.Vector4(q.x, q.y, q.z, q.w);
}

export function registerTransformNode() {
  function TransformNode() {
    this.addInput('emitter',  'splat_emitter');
    this.addOutput('emitter', 'splat_emitter');
    this.title = 'Transform';
    this.size = [200, 290];
    this.properties = {
      px: 0, py: 0, pz: 0,
      rx: 0, ry: 0, rz: 0,
      sx: 1, sy: 1, sz: 1,
    };

    this._translateU = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });
    this._rotateU    = new DynoVec4({ value: new THREE.Vector4(0, 0, 0, 1) });
    this._scaleU     = new DynoVec3({ value: new THREE.Vector3(1, 1, 1) });

    this._lastInput   = null;
    this._lastEmitter = null;

    const self = this;
    const updateT = () => {
      self._translateU.value = new THREE.Vector3(self.properties.px, self.properties.py, self.properties.pz);
      self._lastInput = null;
    };
    const updateR = () => {
      self._rotateU.value = eulerToQuat(self.properties.rx, self.properties.ry, self.properties.rz);
      self._lastInput = null;
    };
    const updateS = () => {
      self._scaleU.value = new THREE.Vector3(self.properties.sx, self.properties.sy, self.properties.sz);
      self._lastInput = null;
    };

    // Position
    this.addWidget('number', 'pos X', 0, (v) => { self.properties.px = v; updateT(); }, { step: 0.1 });
    this.addWidget('number', 'pos Y', 0, (v) => { self.properties.py = v; updateT(); }, { step: 0.1 });
    this.addWidget('number', 'pos Z', 0, (v) => { self.properties.pz = v; updateT(); }, { step: 0.1 });
    // Rotation (euler degrees)
    this.addWidget('number', 'rot X', 0, (v) => { self.properties.rx = v; updateR(); }, { step: 1 });
    this.addWidget('number', 'rot Y', 0, (v) => { self.properties.ry = v; updateR(); }, { step: 1 });
    this.addWidget('number', 'rot Z', 0, (v) => { self.properties.rz = v; updateR(); }, { step: 1 });
    // Scale (per-axis)
    this.addWidget('number', 'scale X', 1, (v) => { self.properties.sx = v; updateS(); }, { step: 0.01, min: 0.001 });
    this.addWidget('number', 'scale Y', 1, (v) => { self.properties.sy = v; updateS(); }, { step: 0.01, min: 0.001 });
    this.addWidget('number', 'scale Z', 1, (v) => { self.properties.sz = v; updateS(); }, { step: 0.01, min: 0.001 });
  }

  TransformNode.title = 'Transform';
  TransformNode.prototype.onConfigure = function () {
    const p = this.properties;
    this._translateU.value = new THREE.Vector3(p.px ?? 0, p.py ?? 0, p.pz ?? 0);
    this._rotateU.value = eulerToQuat(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    this._scaleU.value = new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
    const vals = [p.px, p.py, p.pz, p.rx, p.ry, p.rz, p.sx, p.sy, p.sz];
    vals.forEach((v, i) => { if (this.widgets?.[i]) this.widgets[i].value = v ?? (i >= 6 ? 1 : 0); });
    this._lastInput = null;
  };

  TransformNode.prototype.color = '#1a2a3a';
  TransformNode.prototype.bgcolor = '#1e2e3e';

  TransformNode.prototype.onExecute = function () {
    const emitter = this.getInputData(0);
    if (!emitter?.packedSplats) return;

    const changed = emitter !== this._lastInput;

    if (changed || !this._lastEmitter) {
      this._lastInput = emitter;

      const upstreamBuildFn = emitter.buildFn;
      const translateU = this._translateU;
      const rotateU    = this._rotateU;
      const scaleU     = this._scaleU;

      const buildFn = (gsplat) => {
        let modified = upstreamBuildFn ? upstreamBuildFn(gsplat) : gsplat;

        // Per-axis scale: multiply center and scales by vec3
        const outputs = splitGsplat(modified).outputs;
        modified = combineGsplat({
          gsplat: modified,
          center: mul(outputs.center, scaleU.dynoOut()),
          scales: mul(outputs.scales, scaleU.dynoOut()),
        });

        // Then apply rotate + translate (scale=1 since already applied)
        return new TransformGsplat({
          gsplat:    modified,
          scale:     new DynoFloat({ value: 1 }).dynoOut(),
          rotate:    rotateU.dynoOut(),
          translate: translateU.dynoOut(),
        }).dynoOut();
      };

      const modifier = dynoBlock(
        { gsplat: Gsplat },
        { gsplat: Gsplat },
        ({ gsplat }) => ({ gsplat: buildFn(gsplat) })
      );

      this._lastEmitter = { packedSplats: emitter.packedSplats, modifier, buildFn };
    }

    this.setOutputData(0, this._lastEmitter);
  };

  LiteGraph.registerNodeType('3dgs/Transform', TransformNode);
}
