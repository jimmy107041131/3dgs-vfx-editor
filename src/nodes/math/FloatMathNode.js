import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Add, Sub, Mul, Div, Pow, Min, Max, Mod, DynoFloat } = dyno;

const _zero = new DynoFloat({ value: 0 });
const _one  = new DynoFloat({ value: 1 });

const DEFAULTS = { '+': _zero, '-': _zero, '×': _one, '÷': _one, 'pow': _one, 'min': _one, 'max': _zero, 'mod': _one };
const OPS = {
  '+':   (a, b) => new Add({ a, b }).outputs.sum,
  '-':   (a, b) => new Sub({ a, b }).outputs.difference,
  '×':   (a, b) => new Mul({ a, b }).outputs.product,
  '÷':   (a, b) => new Div({ a, b }).outputs.quotient,
  'pow': (a, b) => new Pow({ a, b }).outputs.power,
  'min': (a, b) => new Min({ a, b }).outputs.min,
  'max': (a, b) => new Max({ a, b }).outputs.max,
  'mod': (a, b) => new Mod({ a, b }).outputs.remainder,
};

export function registerFloatMathNode() {
  function FloatMathNode() {
    this.addInput('a',  'dyno_float');
    this.addInput('b',  'dyno_float');
    this.addOutput('result', 'dyno_float');
    this.title = 'Math (GPU)';
    this.size  = [150, 80];
    this.properties = { op: '+' };
    this._lastA  = null; this._lastB = null; this._lastOp = null;
    this._cachedBuilder = null;
    this.addWidget('combo', 'op', '+', (v) => {
      this.properties.op = v;
      this._lastOp = null;
    }, { values: ['+', '-', '×', '÷', 'pow', 'min', 'max', 'mod'] });
  }

  FloatMathNode.title = 'Math (GPU)';

  FloatMathNode.prototype.onConfigure = function () {
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.op ?? '+';
    this._lastOp = null;
  };

  FloatMathNode.prototype.onExecute = function () {
    const aB = this.getInputData(0);
    const bB = this.getInputData(1);
    const op = this.properties.op;
    if (aB !== this._lastA || bB !== this._lastB || op !== this._lastOp) {
      this._lastA = aB; this._lastB = bB; this._lastOp = op;
      const fn  = OPS[op];
      const def = DEFAULTS[op];
      this._cachedBuilder = (o) => {
        const a = aB ? aB(o) : _zero.dynoOut();
        const b = bB ? bB(o) : def.dynoOut();
        return fn(a, b);
      };
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/Math (GPU)', FloatMathNode);
}
