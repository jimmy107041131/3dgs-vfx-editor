import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { Gsplat, dynoBlock, TransformGsplat, DynoVec3, DynoVec4, DynoFloat } = dyno;

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
    this.size = [200, 230];
    this.properties = {
      px: 0, py: 0, pz: 0,
      rx: 0, ry: 0, rz: 0,
      scale: 1,
    };

    this._translateU = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });
    this._rotateU    = new DynoVec4({ value: new THREE.Vector4(0, 0, 0, 1) });
    this._scaleU     = new DynoFloat({ value: 1 });

    this._lastInput   = null;
    this._lastEmitter = null;

    const self = this;
    const updateT = () => {
      self._translateU.value = new THREE.Vector3(self.properties.px, self.properties.py, self.properties.pz);
      self._lastInput = null; // force rebuild
    };
    const updateR = () => {
      self._rotateU.value = eulerToQuat(self.properties.rx, self.properties.ry, self.properties.rz);
      self._lastInput = null;
    };
    const updateS = () => {
      self._scaleU.value = self.properties.scale;
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
    // Scale
    this.addWidget('number', 'scale', 1, (v) => { self.properties.scale = v; updateS(); }, { step: 0.01, min: 0.01 });
  }

  TransformNode.title = 'Transform';
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
        const modified = upstreamBuildFn ? upstreamBuildFn(gsplat) : gsplat;
        return new TransformGsplat({
          gsplat:    modified,
          scale:     scaleU.dynoOut(),
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
