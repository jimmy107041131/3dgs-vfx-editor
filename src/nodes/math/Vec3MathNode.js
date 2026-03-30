import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Add, Sub, Mul, DynoFloat, DynoVec3 } = dyno;
import * as THREE from 'three';

const _zeroF = new DynoFloat({ value: 0 });
const _oneF  = new DynoFloat({ value: 1 });
const _zeroV = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });

const OPS = {
  'vec3 + vec3': (a, b) => new Add({ a, b }).outputs.sum,
  'vec3 - vec3': (a, b) => new Sub({ a, b }).outputs.difference,
  'vec3 × vec3': (a, b) => new Mul({ a, b }).outputs.product,
  'vec3 × float': (a, b) => new Mul({ a, b }).outputs.product,
  'vec3 + float': (a, b) => new Add({ a, b }).outputs.sum,
};

const A_DEFAULTS = { 'vec3 + vec3': _zeroV, 'vec3 - vec3': _zeroV, 'vec3 × vec3': _zeroV, 'vec3 × float': _zeroV, 'vec3 + float': _zeroV };
const B_TYPE     = { 'vec3 + vec3': 'dyno_vec3', 'vec3 - vec3': 'dyno_vec3', 'vec3 × vec3': 'dyno_vec3', 'vec3 × float': 'dyno_float', 'vec3 + float': 'dyno_float' };
const B_DEFAULTS = { 'vec3 + vec3': _zeroV, 'vec3 - vec3': _zeroV, 'vec3 × vec3': _oneF, 'vec3 × float': _oneF, 'vec3 + float': _zeroF };

const OP_LIST = Object.keys(OPS);

export function registerVec3MathNode() {
  function Vec3MathNode() {
    this.addInput('a', 'dyno_vec3');
    this.addInput('b', 'dyno_float');
    this.addOutput('result', 'dyno_vec3');
    this.title = 'Vec3 Math';
    this.size  = [180, 80];
    this.properties = { op: 'vec3 × float' };
    this._lastA = null; this._lastB = null; this._lastOp = null;
    this._cachedBuilder = null;

    this.addWidget('combo', 'op', 'vec3 × float', (v) => {
      this.properties.op = v;
      this._lastOp = null;
      // Update input B type based on operation
      this.inputs[1].type = B_TYPE[v];
    }, { values: OP_LIST });
  }

  Vec3MathNode.title = 'Vec3 Math';

  Vec3MathNode.prototype.onExecute = function () {
    const aB = this.getInputData(0);
    const bB = this.getInputData(1);
    const op = this.properties.op;

    if (aB !== this._lastA || bB !== this._lastB || op !== this._lastOp) {
      this._lastA = aB; this._lastB = bB; this._lastOp = op;
      const fn   = OPS[op];
      const defA = A_DEFAULTS[op];
      const defB = B_DEFAULTS[op];

      this._cachedBuilder = (o) => {
        const a = aB ? aB(o) : defA.dynoOut();
        const b = bB ? bB(o) : defB.dynoOut();
        return fn(a, b);
      };
    }

    this.setOutputData(0, this._cachedBuilder);
  };

  Vec3MathNode.prototype.onConfigure = function () {
    this.inputs[1].type = B_TYPE[this.properties.op] || 'dyno_float';
  };

  LiteGraph.registerNodeType('3dgs/math/Vec3Math', Vec3MathNode);
}
