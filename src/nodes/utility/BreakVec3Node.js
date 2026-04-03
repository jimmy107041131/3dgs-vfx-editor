import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Split } = dyno;

export function registerBreakVec3Node() {
  function SplitVec3Node() {
    this.addInput('vec3', 'dyno_vec3');
    this.addOutput('x',   'dyno_float');
    this.addOutput('y',   'dyno_float');
    this.addOutput('z',   'dyno_float');
    this.title = 'BreakVec3 (GPU)';
    this.size  = [140, 80];
    this._lastInput = null;
    this._xB = null; this._yB = null; this._zB = null;
  }

  SplitVec3Node.title = 'BreakVec3 (GPU)';

  SplitVec3Node.prototype.onExecute = function () {
    const inputB = this.getInputData(0);
    if (inputB !== this._lastInput) {
      this._lastInput = inputB;
      if (!inputB) { this._xB = this._yB = this._zB = null; return; }
      this._xB = (o) => new Split({ vector: inputB(o) }).outputs.x;
      this._yB = (o) => new Split({ vector: inputB(o) }).outputs.y;
      this._zB = (o) => new Split({ vector: inputB(o) }).outputs.z;
    }
    this.setOutputData(0, this._xB);
    this.setOutputData(1, this._yB);
    this.setOutputData(2, this._zB);
  };

  LiteGraph.registerNodeType('3dgs/GPU/utility/BreakVec3 (GPU)', SplitVec3Node);
}
