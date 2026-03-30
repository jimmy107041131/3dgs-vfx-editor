import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Split } = dyno;

export function registerSplitVec2Node() {
  function SplitVec2Node() {
    this.addInput('vec2', 'dyno_vec2');
    this.addOutput('x',   'dyno_float');
    this.addOutput('y',   'dyno_float');
    this.title = 'Split Vec2';
    this.size  = [140, 60];
    this._lastInput = null;
    this._xB = null; this._yB = null;
  }

  SplitVec2Node.title = 'Split Vec2';

  SplitVec2Node.prototype.onExecute = function () {
    const inputB = this.getInputData(0);
    if (inputB !== this._lastInput) {
      this._lastInput = inputB;
      if (!inputB) { this._xB = this._yB = null; return; }
      this._xB = (o) => new Split({ vector: inputB(o) }).outputs.x;
      this._yB = (o) => new Split({ vector: inputB(o) }).outputs.y;
    }
    this.setOutputData(0, this._xB);
    this.setOutputData(1, this._yB);
  };

  LiteGraph.registerNodeType('3dgs/utility/SplitVec2', SplitVec2Node);
}
