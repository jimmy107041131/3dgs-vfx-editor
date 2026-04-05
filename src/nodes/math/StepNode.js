import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Step, DynoFloat } = dyno;

const _zero = new DynoFloat({ value: 0 });

export function registerStepNode() {
  function StepNode() {
    this.addInput('edge', 'dyno_float');
    this.addInput('x',    'dyno_float');
    this.addOutput('result', 'dyno_float');
    this.title = 'Step (GPU)';
    this.size  = [130, 60];
    this._lastEdge = null; this._lastX = null;
    this._cachedBuilder = null;
  }

  StepNode.title = 'Step (GPU)';

  StepNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const edgeB = this.getInputData(0);
    const xB    = this.getInputData(1);
    if (edgeB !== this._lastEdge || xB !== this._lastX) {
      this._lastEdge = edgeB; this._lastX = xB;
      if (!xB) { this._cachedBuilder = null; }
      else {
        this._cachedBuilder = (o) => {
          const edge = edgeB ? edgeB(o) : _zero.dynoOut();
          const x    = xB(o);
          return new Step({ edge, x }).outputs.step;
        };
      }
    }
    this.setOutputData(0, this._cachedBuilder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/Step (GPU)', StepNode);
}
