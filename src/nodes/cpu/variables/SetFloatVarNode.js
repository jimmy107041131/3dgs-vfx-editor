import { LiteGraph } from 'litegraph.js';

export function registerSetFloatVarNode() {
  function SetFloatVarNode() {
    this.addInput('value', 'js_float');
    this.addOutput('value', 'js_float');
    this.title = 'Set: var1';
    this.size = [180, 55];
    this.properties = { name: 'var1' };
    this.addWidget('text', 'name', 'var1', (v) => {
      this.properties.name = v;
      this.title = `Set: ${v}`;
    });
  }
  SetFloatVarNode.title = 'Set Float';
  SetFloatVarNode.prototype.color = '#3a2a1a';
  SetFloatVarNode.prototype.bgcolor = '#3e2e1e';
  SetFloatVarNode.prototype.onConfigure = function () {
    const n = this.properties.name ?? 'var1';
    if (this.widgets?.[0]) this.widgets[0].value = n;
    this.title = `Set: ${n}`;
  };
  SetFloatVarNode.prototype.onExecute = function () {
    const name = this.properties.name;
    if (!name || !this.graph) return;
    const v = this.getInputData(0) ?? 0;
    this.graph.vars[name] = v;
    if (this.isOutputConnected(0)) this.setOutputData(0, v);
  };
  SetFloatVarNode.prototype.getTitle = function () {
    return this.flags.collapsed ? `Set: ${this.properties.name}` : this.title;
  };
  LiteGraph.registerNodeType('CPU/variables/Set Float', SetFloatVarNode);
}
