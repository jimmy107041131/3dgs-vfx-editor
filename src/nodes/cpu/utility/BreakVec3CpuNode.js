import { LiteGraph } from 'litegraph.js';

export function registerBreakVec3CpuNode() {
  function BreakVec3CpuNode() {
    this.addInput('vec3', 'js_vec3');
    this.addOutput('x', 'js_float');
    this.addOutput('y', 'js_float');
    this.addOutput('z', 'js_float');
    this.title = 'BreakVec3 (CPU)';
    this.size = [160, 70];
  }
  BreakVec3CpuNode.title = 'BreakVec3 (CPU)';
  BreakVec3CpuNode.prototype.color = '#1a3a3a';
  BreakVec3CpuNode.prototype.bgcolor = '#1e3e3e';
  BreakVec3CpuNode.prototype.onExecute = function () {
    if (!this.outputs.some((_, i) => this.isOutputConnected(i))) return;
    const v = this.getInputData(0);
    if (!v) return;
    this.setOutputData(0, v.x);
    this.setOutputData(1, v.y);
    this.setOutputData(2, v.z);
  };
  LiteGraph.registerNodeType('CPU/utility/BreakVec3 (CPU)', BreakVec3CpuNode);
}
