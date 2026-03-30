import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { DynoFloat } = dyno;

export function registerTimeNode() {
  function TimeNode() {
    this.addOutput('time', 'dyno_float');
    this.title = 'Time';
    this.size  = [130, 40];

    this._uniform = new DynoFloat({ value: 0 });
    this._startTime = performance.now();

    const u = this._uniform;
    this._builder = (_o) => u.dynoOut();
  }

  TimeNode.title = 'Time';

  TimeNode.prototype.onExecute = function () {
    this._uniform.value = (performance.now() - this._startTime) / 1000;
    this.setOutputData(0, this._builder);
  };

  LiteGraph.registerNodeType('3dgs/math/Time', TimeNode);
}
