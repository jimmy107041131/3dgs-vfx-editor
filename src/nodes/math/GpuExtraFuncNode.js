import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Clamp, Mix, Distance, Dot, Normalize, Smoothstep, DynoFloat, DynoVec3 } = dyno;
import * as THREE from 'three';

const _zero = new DynoFloat({ value: 0 });
const _one  = new DynoFloat({ value: 1 });
const _half = new DynoFloat({ value: 0.5 });

// ── Clamp (GPU) ─────────────────────────────────────────
export function registerClampNode() {
  function ClampNode() {
    this.addInput('x',   'dyno_float');
    this.addInput('min', 'dyno_float');
    this.addInput('max', 'dyno_float');
    this.addOutput('result', 'dyno_float');
    this.title = 'Clamp (GPU)';
    this.size  = [150, 80];
    this._lastX = null; this._lastMin = null; this._lastMax = null;
    this._cachedBuilder = null;
  }
  ClampNode.title = 'Clamp (GPU)';
  ClampNode.prototype.onExecute = function () {
    const xB = this.getInputData(0);
    const mnB = this.getInputData(1);
    const mxB = this.getInputData(2);
    if (xB !== this._lastX || mnB !== this._lastMin || mxB !== this._lastMax) {
      this._lastX = xB; this._lastMin = mnB; this._lastMax = mxB;
      this._cachedBuilder = xB ? (o) => {
        const x   = xB(o);
        const mn  = mnB ? mnB(o) : _zero.dynoOut();
        const mx  = mxB ? mxB(o) : _one.dynoOut();
        return new Clamp({ a: x, min: mn, max: mx }).outputs.clamp;
      } : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };
  LiteGraph.registerNodeType('3dgs/GPU/math/Clamp (GPU)', ClampNode);
}

// ── Lerp (GPU) ──────────────────────────────────────────
export function registerLerpNode() {
  function LerpNode() {
    this.addInput('a', 'dyno_float');
    this.addInput('b', 'dyno_float');
    this.addInput('t', 'dyno_float');
    this.addOutput('result', 'dyno_float');
    this.title = 'Lerp (GPU)';
    this.size  = [150, 80];
    this._lastA = null; this._lastB = null; this._lastT = null;
    this._cachedBuilder = null;
  }
  LerpNode.title = 'Lerp (GPU)';
  LerpNode.prototype.onExecute = function () {
    const aB = this.getInputData(0);
    const bB = this.getInputData(1);
    const tB = this.getInputData(2);
    if (aB !== this._lastA || bB !== this._lastB || tB !== this._lastT) {
      this._lastA = aB; this._lastB = bB; this._lastT = tB;
      this._cachedBuilder = (o) => {
        const a = aB ? aB(o) : _zero.dynoOut();
        const b = bB ? bB(o) : _one.dynoOut();
        const t = tB ? tB(o) : _half.dynoOut();
        return new Mix({ a, b, t }).outputs.mix;
      };
    }
    this.setOutputData(0, this._cachedBuilder);
  };
  LiteGraph.registerNodeType('3dgs/GPU/math/Lerp (GPU)', LerpNode);
}

// ── Distance (GPU) ──────────────────────────────────────
export function registerDistanceNode() {
  function DistanceNode() {
    this.addInput('a', 'dyno_vec3');
    this.addInput('b', 'dyno_vec3');
    this.addOutput('distance', 'dyno_float');
    this.title = 'Distance (GPU)';
    this.size  = [160, 55];
    this._lastA = null; this._lastB = null;
    this._cachedBuilder = null;
  }
  DistanceNode.title = 'Distance (GPU)';
  const _zeroV = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });
  DistanceNode.prototype.onExecute = function () {
    const aB = this.getInputData(0);
    const bB = this.getInputData(1);
    if (aB !== this._lastA || bB !== this._lastB) {
      this._lastA = aB; this._lastB = bB;
      this._cachedBuilder = (aB || bB) ? (o) => {
        const a = aB ? aB(o) : _zeroV.dynoOut();
        const b = bB ? bB(o) : _zeroV.dynoOut();
        return new Distance({ a, b }).outputs.distance;
      } : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };
  LiteGraph.registerNodeType('3dgs/GPU/math/Distance (GPU)', DistanceNode);
}

// ── Dot (GPU) ───────────────────────────────────────────
export function registerDotNode() {
  function DotNode() {
    this.addInput('a', 'dyno_vec3');
    this.addInput('b', 'dyno_vec3');
    this.addOutput('dot', 'dyno_float');
    this.title = 'Dot (GPU)';
    this.size  = [140, 55];
    this._lastA = null; this._lastB = null;
    this._cachedBuilder = null;
  }
  DotNode.title = 'Dot (GPU)';
  const _zeroV2 = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });
  DotNode.prototype.onExecute = function () {
    const aB = this.getInputData(0);
    const bB = this.getInputData(1);
    if (aB !== this._lastA || bB !== this._lastB) {
      this._lastA = aB; this._lastB = bB;
      this._cachedBuilder = (aB || bB) ? (o) => {
        const a = aB ? aB(o) : _zeroV2.dynoOut();
        const b = bB ? bB(o) : _zeroV2.dynoOut();
        return new Dot({ a, b }).outputs.dot;
      } : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };
  LiteGraph.registerNodeType('3dgs/GPU/math/Dot (GPU)', DotNode);
}

// ── Normalize (GPU) ─────────────────────────────────────
export function registerNormalizeNode() {
  function NormalizeNode() {
    this.addInput('vec3', 'dyno_vec3');
    this.addOutput('result', 'dyno_vec3');
    this.title = 'Normalize (GPU)';
    this.size  = [160, 40];
    this._lastInput = null;
    this._cachedBuilder = null;
  }
  NormalizeNode.title = 'Normalize (GPU)';
  NormalizeNode.prototype.onExecute = function () {
    const inputB = this.getInputData(0);
    if (inputB !== this._lastInput) {
      this._lastInput = inputB;
      this._cachedBuilder = inputB ? (o) => new Normalize({ a: inputB(o) }).outputs.normalize : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };
  LiteGraph.registerNodeType('3dgs/GPU/math/Normalize (GPU)', NormalizeNode);
}

// ── Smoothstep (GPU) ────────────────────────────────────
export function registerSmoothstepNode() {
  function SmoothstepNode() {
    this.addInput('edge0', 'dyno_float');
    this.addInput('edge1', 'dyno_float');
    this.addInput('x',     'dyno_float');
    this.addOutput('result', 'dyno_float');
    this.title = 'Smoothstep (GPU)';
    this.size  = [170, 80];
    this._lastE0 = null; this._lastE1 = null; this._lastX = null;
    this._cachedBuilder = null;
  }
  SmoothstepNode.title = 'Smoothstep (GPU)';
  SmoothstepNode.prototype.onExecute = function () {
    const e0B = this.getInputData(0);
    const e1B = this.getInputData(1);
    const xB  = this.getInputData(2);
    if (e0B !== this._lastE0 || e1B !== this._lastE1 || xB !== this._lastX) {
      this._lastE0 = e0B; this._lastE1 = e1B; this._lastX = xB;
      this._cachedBuilder = xB ? (o) => {
        const edge0 = e0B ? e0B(o) : _zero.dynoOut();
        const edge1 = e1B ? e1B(o) : _one.dynoOut();
        const x     = xB(o);
        return new Smoothstep({ edge0, edge1, x }).outputs.smoothstep;
      } : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };
  LiteGraph.registerNodeType('3dgs/GPU/math/Smoothstep (GPU)', SmoothstepNode);
}
