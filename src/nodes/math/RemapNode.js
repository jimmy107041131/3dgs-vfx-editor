import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Add, Sub, Mul, Div, DynoFloat } = dyno;

// outMin + (x - inMin) / (inMax - inMin) * (outMax - outMin)

export function registerRemapNode() {
  function RemapNode() {
    this.addInput('x',      'dyno_float');
    this.addOutput('result','dyno_float');
    this.title = 'Remap (GPU)';
    this.size  = [175, 130];
    this.properties = { inMin: 0, inMax: 1, outMin: 0, outMax: 1 };

    this._uInMin  = new DynoFloat({ value: 0 });
    this._uInMax  = new DynoFloat({ value: 1 });
    this._uOutMin = new DynoFloat({ value: 0 });
    this._uOutMax = new DynoFloat({ value: 1 });
    this._lastInput = null;
    this._cachedBuilder = null;

    const self = this;
    const mk = (key, uKey) => (v) => { self.properties[key] = v; self[uKey].value = v; };
    this.addWidget('number', 'inMin',  0, mk('inMin',  '_uInMin'),  { step: 0.1 });
    this.addWidget('number', 'inMax',  1, mk('inMax',  '_uInMax'),  { step: 0.1 });
    this.addWidget('number', 'outMin', 0, mk('outMin', '_uOutMin'), { step: 0.1 });
    this.addWidget('number', 'outMax', 1, mk('outMax', '_uOutMax'), { step: 0.1 });
  }

  RemapNode.title = 'Remap (GPU)';

  RemapNode.prototype.onConfigure = function () {
    const p = this.properties;
    this._uInMin.value  = p.inMin  ?? 0;
    this._uInMax.value  = p.inMax  ?? 1;
    this._uOutMin.value = p.outMin ?? 0;
    this._uOutMax.value = p.outMax ?? 1;
    if (this.widgets?.[0]) this.widgets[0].value = p.inMin  ?? 0;
    if (this.widgets?.[1]) this.widgets[1].value = p.inMax  ?? 1;
    if (this.widgets?.[2]) this.widgets[2].value = p.outMin ?? 0;
    if (this.widgets?.[3]) this.widgets[3].value = p.outMax ?? 1;
  };

  RemapNode.prototype.onExecute = function () {
    const xB = this.getInputData(0);
    if (xB !== this._lastInput) {
      this._lastInput = xB;
      if (!xB) { this._cachedBuilder = null; }
      else {
        const { _uInMin, _uInMax, _uOutMin, _uOutMax } = this;
        this._cachedBuilder = (o) => {
          const x      = xB(o);
          const inMin  = _uInMin.dynoOut();
          const inMax  = _uInMax.dynoOut();
          const outMin = _uOutMin.dynoOut();
          const outMax = _uOutMax.dynoOut();
          const t = new Div({
            a: new Sub({ a: x, b: inMin }).outputs.difference,
            b: new Sub({ a: inMax, b: inMin }).outputs.difference,
          }).outputs.quotient;
          return new Add({
            a: new Mul({
              a: t,
              b: new Sub({ a: outMax, b: outMin }).outputs.difference,
            }).outputs.product,
            b: outMin,
          }).outputs.sum;
        };
      }
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/Remap (GPU)', RemapNode);
}
