import { LiteGraph } from 'litegraph.js';

export function registerTimeCpuNode() {
  let _startTime = null;

  function TimeCpuNode() {
    this.addOutput('seconds', 'js_float');
    this.title = 'Time (CPU)';
    this.size = [140, 30];
  }
  TimeCpuNode.title = 'Time (CPU)';
  TimeCpuNode.prototype.color = '#1a3a3a';
  TimeCpuNode.prototype.bgcolor = '#1e3e3e';
  TimeCpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    if (_startTime === null) _startTime = performance.now();
    this.setOutputData(0, (performance.now() - _startTime) / 1000);
  };
  LiteGraph.registerNodeType('CPU/math/Time (CPU)', TimeCpuNode);
}
