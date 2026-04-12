import { LiteGraph } from 'litegraph.js';

const OPS = {
  '>':  (a, b) => a > b  ? 1.0 : 0.0,
  '<':  (a, b) => a < b  ? 1.0 : 0.0,
  '≥':  (a, b) => a >= b ? 1.0 : 0.0,
  '≤':  (a, b) => a <= b ? 1.0 : 0.0,
  '=':  (a, b) => Math.abs(a - b) < 1e-6 ? 1.0 : 0.0,
  '≠':  (a, b) => Math.abs(a - b) >= 1e-6 ? 1.0 : 0.0,
};

export function registerCompareCpuNode() {
  function CompareCpuNode() {
    this.addInput('a', 'js_float');
    this.addInput('b', 'js_float');
    this.addOutput('result', 'js_float');
    this.title = 'Compare (CPU)';
    this.size = [160, 55];
    this.properties = { op: '>' };
    this.addWidget('combo', 'op', '>', (v) => { this.properties.op = v; }, { values: Object.keys(OPS) });
  }
  CompareCpuNode.title = 'Compare (CPU)';
  CompareCpuNode.prototype.color = '#1a3a3a';
  CompareCpuNode.prototype.bgcolor = '#1e3e3e';
  CompareCpuNode.prototype.onConfigure = function () {
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.op ?? '>';
  };
  CompareCpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const a = this.getInputData(0) ?? 0;
    const b = this.getInputData(1) ?? 0;
    const fn = OPS[this.properties.op] || OPS['>'];
    this.setOutputData(0, fn(a, b));
  };
  LiteGraph.registerNodeType('CPU/math/Compare (CPU)', CompareCpuNode);
}
