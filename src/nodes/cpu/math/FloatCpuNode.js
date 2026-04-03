import { LiteGraph } from 'litegraph.js';

export function registerFloatCpuNode() {
  function FloatCpuNode() {
    this.addOutput('value', 'js_float');
    this.title = 'Float (CPU)';
    this.size = [160, 55];
    this.properties = { value: 0 };
    this.addWidget('number', 'value', 0, (v) => { this.properties.value = v; }, { step: 0.1 });
  }
  FloatCpuNode.title = 'Float (CPU)';
  FloatCpuNode.prototype.color = '#1a3a3a';
  FloatCpuNode.prototype.bgcolor = '#1e3e3e';
  FloatCpuNode.prototype.onConfigure = function () {
    const v = this.properties.value ?? 0;
    if (this.widgets?.[0]) this.widgets[0].value = v;
  };
  FloatCpuNode.prototype.onExecute = function () {
    this.setOutputData(0, this.properties.value);
  };
  LiteGraph.registerNodeType('3dgs/CPU/math/Float (CPU)', FloatCpuNode);
}
