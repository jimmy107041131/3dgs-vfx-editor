import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Combine, DynoFloat } = dyno;
const _zero = new DynoFloat({ value: 0 });
const _one  = new DynoFloat({ value: 1 });

export function registerMakeVec4Node() {
  function MakeVec4Node() {
    this.addInput('x', 'dyno_float');
    this.addInput('y', 'dyno_float');
    this.addInput('z', 'dyno_float');
    this.addInput('w', 'dyno_float');
    this.addOutput('vec4', 'dyno_vec4');
    this.title = 'MakeVec4 (GPU)';
    this.size  = [140, 110];
    this._lastX = undefined; this._lastY = undefined;
    this._lastZ = undefined; this._lastW = undefined;
    this._cachedBuilder = null;
  }

  MakeVec4Node.title = 'MakeVec4 (GPU)';

  MakeVec4Node.prototype.onExecute = function () {
    const xB = this.getInputData(0);
    const yB = this.getInputData(1);
    const zB = this.getInputData(2);
    const wB = this.getInputData(3);
    if (xB !== this._lastX || yB !== this._lastY || zB !== this._lastZ || wB !== this._lastW) {
      this._lastX = xB; this._lastY = yB; this._lastZ = zB; this._lastW = wB;
      this._cachedBuilder = (o) => {
        return new Combine({
          vectorType: 'vec4',
          x: xB ? xB(o) : _zero.dynoOut(),
          y: yB ? yB(o) : _zero.dynoOut(),
          z: zB ? zB(o) : _zero.dynoOut(),
          w: wB ? wB(o) : _one.dynoOut(),
        }).outputs.vector;
      };
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/utility/MakeVec4 (GPU)', MakeVec4Node);
}
