import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Split } = dyno;

export function registerSplitVec4Node() {
  function SplitVec4Node() {
    this.addInput('vec4', 'dyno_vec4');
    this.addOutput('x',   'dyno_float');
    this.addOutput('y',   'dyno_float');
    this.addOutput('z',   'dyno_float');
    this.addOutput('w',   'dyno_float');
    this.title = 'BreakVec4 (GPU)';
    this.size  = [140, 100];
    this._lastInput = null;
    this._xB = null; this._yB = null; this._zB = null; this._wB = null;
  }

  SplitVec4Node.title = 'BreakVec4 (GPU)';

  SplitVec4Node.prototype.onExecute = function () {
    const inputB = this.getInputData(0);
    if (inputB !== this._lastInput) {
      this._lastInput = inputB;
      if (!inputB) { this._xB = this._yB = this._zB = this._wB = null; return; }
      this._xB = (o) => new Split({ vector: inputB(o) }).outputs.x;
      this._yB = (o) => new Split({ vector: inputB(o) }).outputs.y;
      this._zB = (o) => new Split({ vector: inputB(o) }).outputs.z;
      this._wB = (o) => new Split({ vector: inputB(o) }).outputs.w;
    }
    this.setOutputData(0, this._xB);
    this.setOutputData(1, this._yB);
    this.setOutputData(2, this._zB);
    this.setOutputData(3, this._wB);
  };

  LiteGraph.registerNodeType('3dgs/GPU/utility/BreakVec4 (GPU)', SplitVec4Node);
}
