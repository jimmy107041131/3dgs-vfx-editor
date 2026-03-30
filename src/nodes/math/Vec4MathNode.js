import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { Add, Sub, Mul, DynoFloat, DynoVec4 } = dyno;

const _zeroF = new DynoFloat({ value: 0 });
const _oneF  = new DynoFloat({ value: 1 });
const _zeroV = new DynoVec4({ value: new THREE.Vector4(0, 0, 0, 0) });

const OPS = {
  'vec4 + vec4': (a, b) => new Add({ a, b }).outputs.sum,
  'vec4 - vec4': (a, b) => new Sub({ a, b }).outputs.difference,
  'vec4 × vec4': (a, b) => new Mul({ a, b }).outputs.product,
  'vec4 × float': (a, b) => new Mul({ a, b }).outputs.product,
  'vec4 + float': (a, b) => new Add({ a, b }).outputs.sum,
};

const B_TYPE     = { 'vec4 + vec4': 'dyno_vec4', 'vec4 - vec4': 'dyno_vec4', 'vec4 × vec4': 'dyno_vec4', 'vec4 × float': 'dyno_float', 'vec4 + float': 'dyno_float' };
const A_DEFAULTS = { 'vec4 + vec4': _zeroV, 'vec4 - vec4': _zeroV, 'vec4 × vec4': _zeroV, 'vec4 × float': _zeroV, 'vec4 + float': _zeroV };
const B_DEFAULTS = { 'vec4 + vec4': _zeroV, 'vec4 - vec4': _zeroV, 'vec4 × vec4': _oneF, 'vec4 × float': _oneF, 'vec4 + float': _zeroF };

const OP_LIST = Object.keys(OPS);

export function registerVec4MathNode() {
  function Vec4MathNode() {
    this.addInput('a', 'dyno_vec4');
    this.addInput('b', 'dyno_float');
    this.addOutput('result', 'dyno_vec4');
    this.title = 'Vec4 Math';
    this.size  = [180, 80];
    this.properties = { op: 'vec4 × float' };
    this._lastA = null; this._lastB = null; this._lastOp = null;
    this._cachedBuilder = null;

    this.addWidget('combo', 'op', 'vec4 × float', (v) => {
      this.properties.op = v;
      this._lastOp = null;
      this.inputs[1].type = B_TYPE[v];
    }, { values: OP_LIST });
  }

  Vec4MathNode.title = 'Vec4 Math';

  Vec4MathNode.prototype.onExecute = function () {
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

  Vec4MathNode.prototype.onConfigure = function () {
    this.inputs[1].type = B_TYPE[this.properties.op] || 'dyno_float';
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.op ?? 'vec4 × float';
    this._lastOp = null;
  };

  LiteGraph.registerNodeType('3dgs/math/Vec4Math', Vec4MathNode);
}
