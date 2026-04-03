import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { HashFloat } = dyno;

export function registerHashFloatNode() {
  function HashFloatNode() {
    this.addInput('value', 'dyno_int');
    this.addOutput('hash',  'dyno_float');
    this.title = 'HashFloat (GPU)';
    this.size  = [140, 40];
    this._lastInput = null;
    this._cachedBuilder = null;
  }

  HashFloatNode.title = 'HashFloat (GPU)';

  HashFloatNode.prototype.onExecute = function () {
    const vB = this.getInputData(0);
    if (vB !== this._lastInput) {
      this._lastInput = vB;
      this._cachedBuilder = vB
        ? (o) => new HashFloat({ value: vB(o) }).outputs.hash
        : null;
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/HashFloat (GPU)', HashFloatNode);
}
