import { LiteGraph } from 'litegraph.js';

const FUNCS = [
  { name: 'Sin',  fn: Math.sin },
  { name: 'Cos',  fn: Math.cos },
];

function makeCpuFuncNode({ name, fn }) {
  function Node() {
    this.addInput('x', 'js_float');
    this.addOutput('result', 'js_float');
    this.title = name + ' (CPU)';
    this.size  = [120, 40];
  }
  Node.title = name + ' (CPU)';
  Node.prototype.color = '#1a3a3a';
  Node.prototype.bgcolor = '#1e3e3e';
  Node.prototype.onExecute = function () {
    const x = this.getInputData(0) ?? 0;
    this.setOutputData(0, fn(x));
  };
  LiteGraph.registerNodeType('CPU/math/' + name + ' (CPU)', Node);
}

export function registerFloatFuncCpuNode() {
  FUNCS.forEach(makeCpuFuncNode);
}
