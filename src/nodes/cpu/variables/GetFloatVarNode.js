import { LiteGraph } from 'litegraph.js';

export function registerGetFloatVarNode() {
  function GetFloatVarNode() {
    this.addOutput('value', 'js_float');
    this.title = 'Get: var1';
    this.size = [180, 55];
    this.properties = { name: 'var1' };
    this.addWidget('text', 'name', 'var1', (v) => {
      this.properties.name = v;
      this.title = `Get: ${v}`;
    });
  }
  GetFloatVarNode.title = 'Get Float';
  GetFloatVarNode.prototype.color = '#3a2a1a';
  GetFloatVarNode.prototype.bgcolor = '#3e2e1e';
  GetFloatVarNode.prototype.onConfigure = function () {
    const n = this.properties.name ?? 'var1';
    if (this.widgets?.[0]) this.widgets[0].value = n;
    this.title = `Get: ${n}`;
  };
  GetFloatVarNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const name = this.properties.name;
    this.setOutputData(0, this.graph?.vars?.[name] ?? 0);
  };
  GetFloatVarNode.prototype.getTitle = function () {
    return this.flags.collapsed ? `Get: ${this.properties.name}` : this.title;
  };
  LiteGraph.registerNodeType('CPU/variables/Get Float', GetFloatVarNode);
}
