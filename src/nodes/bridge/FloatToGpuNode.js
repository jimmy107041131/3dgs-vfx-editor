import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { DynoFloat } = dyno;

export function registerFloatToGpuNode() {
  function FloatToGpuNode() {
    this.addInput('value', 'js_float');
    this.addOutput('value', 'dyno_float');
    this.title = 'FloatToGPU';
    this.size = [150, 30];
    this._uniform = new DynoFloat({ value: 0 });
    this._builder = () => this._uniform.dynoOut();
  }
  FloatToGpuNode.title = 'FloatToGPU';
  FloatToGpuNode.prototype.color = '#2a3a2a';
  FloatToGpuNode.prototype.bgcolor = '#2e3e2e';
  FloatToGpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const v = this.getInputData(0) ?? 0;
    this._uniform.value = v;
    this.setOutputData(0, this._builder);
  };
  LiteGraph.registerNodeType('Bridge/FloatToGPU', FloatToGpuNode);
}
