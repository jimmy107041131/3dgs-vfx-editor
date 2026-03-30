import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Combine, DynoFloat } = dyno;
const _zero = new DynoFloat({ value: 0 });

export function registerMakeVec3Node() {
  function MakeVec3Node() {
    this.addInput('x', 'dyno_float');
    this.addInput('y', 'dyno_float');
    this.addInput('z', 'dyno_float');
    this.addOutput('vec3', 'dyno_vec3');
    this.title = 'Make Vec3';
    this.size  = [140, 80];
    this._lastX = undefined; this._lastY = undefined; this._lastZ = undefined;
    this._cachedBuilder = null;
  }

  MakeVec3Node.title = 'Make Vec3';

  MakeVec3Node.prototype.onExecute = function () {
    const xB = this.getInputData(0);
    const yB = this.getInputData(1);
    const zB = this.getInputData(2);
    if (xB !== this._lastX || yB !== this._lastY || zB !== this._lastZ) {
      this._lastX = xB; this._lastY = yB; this._lastZ = zB;
      this._cachedBuilder = (o) => {
        return new Combine({
          vectorType: 'vec3',
          x: xB ? xB(o) : _zero.dynoOut(),
          y: yB ? yB(o) : _zero.dynoOut(),
          z: zB ? zB(o) : _zero.dynoOut(),
        }).outputs.vector;
      };
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/utility/MakeVec3', MakeVec3Node);
}
