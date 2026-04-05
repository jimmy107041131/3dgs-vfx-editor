import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Sin, Cos, Abs, Fract, Floor, Ceil, Sqrt, Neg } = dyno;

const FUNCS = [
  { name: 'Sin',   fn: (x) => new Sin({ radians: x }).outputs.sin },
  { name: 'Cos',   fn: (x) => new Cos({ radians: x }).outputs.cos },
  { name: 'Abs',   fn: (x) => new Abs({ a: x }).outputs.abs },
  { name: 'Fract', fn: (x) => new Fract({ a: x }).outputs.fract },
  { name: 'Floor', fn: (x) => new Floor({ a: x }).outputs.floor },
  { name: 'Ceil',  fn: (x) => new Ceil({ a: x }).outputs.ceil },
  { name: 'Sqrt',  fn: (x) => new Sqrt({ a: x }).outputs.sqrt },
  { name: 'Neg',   fn: (x) => new Neg({ a: x }).outputs.neg },
];

function makeFloatFuncNode({ name, fn }) {
  function Node() {
    this.addInput('x',      'dyno_float');
    this.addOutput('result', 'dyno_float');
    this.title = name + ' (GPU)';
    this.size  = [120, 40];
    this._lastInput = null;
    this._cachedBuilder = null;
  }

  Node.title = name + ' (GPU)';

  Node.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const xB = this.getInputData(0);
    if (xB !== this._lastInput) {
      this._lastInput = xB;
      this._cachedBuilder = xB ? (o) => fn(xB(o)) : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/' + name + ' (GPU)', Node);
}

export function registerFloatFuncNode() {
  FUNCS.forEach(makeFloatFuncNode);
}
