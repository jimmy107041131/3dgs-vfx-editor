import { LiteGraph } from 'litegraph.js';

export function registerLogicCpuNode() {
  function LogicCpuNode() {
    this.addInput('a', 'js_float');
    this.addInput('b', 'js_float');
    this.addOutput('result', 'js_float');
    this.title = 'Logic (CPU)';
    this.size = [160, 55];
    this.properties = { op: 'AND' };
    this.addWidget('combo', 'op', 'AND', (v) => { this.properties.op = v; }, { values: ['AND', 'OR', 'NOT'] });
  }
  LogicCpuNode.title = 'Logic (CPU)';
  LogicCpuNode.prototype.color = '#1a3a3a';
  LogicCpuNode.prototype.bgcolor = '#1e3e3e';
  LogicCpuNode.prototype.onConfigure = function () {
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.op ?? 'AND';
  };
  LogicCpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const a = (this.getInputData(0) ?? 0) > 0.5;
    const b = (this.getInputData(1) ?? 0) > 0.5;
    let result;
    switch (this.properties.op) {
      case 'AND': result = a && b; break;
      case 'OR':  result = a || b; break;
      case 'NOT': result = !a; break;
      default:    result = false;
    }
    this.setOutputData(0, result ? 1.0 : 0.0);
  };
  LiteGraph.registerNodeType('CPU/math/Logic (CPU)', LogicCpuNode);
}
