import { LiteGraph } from 'litegraph.js';

export function registerLerpCpuNode() {
  function LerpCpuNode() {
    this.addInput('a', 'js_float');
    this.addInput('b', 'js_float');
    this.addInput('t', 'js_float');
    this.addOutput('result', 'js_float');
    this.title = 'Lerp (CPU)';
    this.size = [140, 80];
  }
  LerpCpuNode.title = 'Lerp (CPU)';
  LerpCpuNode.prototype.color = '#1a3a3a';
  LerpCpuNode.prototype.bgcolor = '#1e3e3e';
  LerpCpuNode.prototype.onExecute = function () {
    const a = this.getInputData(0) ?? 0;
    const b = this.getInputData(1) ?? 1;
    const t = this.getInputData(2) ?? 0.5;
    this.setOutputData(0, a + (b - a) * t);
  };
  LiteGraph.registerNodeType('3dgs/CPU/math/Lerp (CPU)', LerpCpuNode);
}
