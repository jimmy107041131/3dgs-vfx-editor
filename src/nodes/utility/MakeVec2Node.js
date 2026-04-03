import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Combine, DynoFloat } = dyno;
const _zero = new DynoFloat({ value: 0 });

export function registerMakeVec2Node() {
  function MakeVec2Node() {
    this.addInput('x', 'dyno_float');
    this.addInput('y', 'dyno_float');
    this.addOutput('vec2', 'dyno_vec2');
    this.title = 'MakeVec2 (GPU)';
    this.size  = [140, 60];
    this._lastX = undefined; this._lastY = undefined;
    this._cachedBuilder = null;
  }

  MakeVec2Node.title = 'MakeVec2 (GPU)';

  MakeVec2Node.prototype.onExecute = function () {
    const xB = this.getInputData(0);
    const yB = this.getInputData(1);
    if (xB !== this._lastX || yB !== this._lastY) {
      this._lastX = xB; this._lastY = yB;
      this._cachedBuilder = (o) => {
        return new Combine({
          vectorType: 'vec2',
          x: xB ? xB(o) : _zero.dynoOut(),
          y: yB ? yB(o) : _zero.dynoOut(),
        }).outputs.vector;
      };
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/utility/MakeVec2 (GPU)', MakeVec2Node);
}
