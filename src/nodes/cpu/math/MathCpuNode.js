import { LiteGraph } from 'litegraph.js';

const OPS = { '+': (a,b)=>a+b, '-': (a,b)=>a-b, '×': (a,b)=>a*b, '÷': (a,b)=>b!==0?a/b:0 };

export function registerMathCpuNode() {
  function MathCpuNode() {
    this.addInput('a', 'js_float');
    this.addInput('b', 'js_float');
    this.addOutput('result', 'js_float');
    this.title = 'Math (CPU)';
    this.size = [160, 55];
    this.properties = { op: '+' };
    this.addWidget('combo', 'op', '+', (v) => { this.properties.op = v; }, { values: Object.keys(OPS) });
  }
  MathCpuNode.title = 'Math (CPU)';
  MathCpuNode.prototype.color = '#1a3a3a';
  MathCpuNode.prototype.bgcolor = '#1e3e3e';
  MathCpuNode.prototype.onConfigure = function () {
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.op ?? '+';
  };
  MathCpuNode.prototype.onExecute = function () {
    const a = this.getInputData(0) ?? 0;
    const b = this.getInputData(1) ?? 0;
    const fn = OPS[this.properties.op] || OPS['+'];
    this.setOutputData(0, fn(a, b));
  };
  LiteGraph.registerNodeType('3dgs/CPU/math/Math (CPU)', MathCpuNode);
}
