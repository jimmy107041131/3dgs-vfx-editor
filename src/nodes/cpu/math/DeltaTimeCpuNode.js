import { LiteGraph } from 'litegraph.js';

export function registerDeltaTimeCpuNode() {
  function DeltaTimeCpuNode() {
    this.addOutput('dt', 'js_float');
    this.title = 'DeltaTime (CPU)';
    this.size = [160, 30];
    this._lastTime = null;
  }
  DeltaTimeCpuNode.title = 'DeltaTime (CPU)';
  DeltaTimeCpuNode.prototype.color = '#1a3a3a';
  DeltaTimeCpuNode.prototype.bgcolor = '#1e3e3e';
  DeltaTimeCpuNode.prototype.onConfigure = function () {
    this._lastTime = null;
  };
  DeltaTimeCpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const now = performance.now();
    let dt = 0;
    if (this._lastTime !== null) {
      dt = (now - this._lastTime) / 1000;
    }
    this._lastTime = now;
    this.setOutputData(0, dt);
  };
  LiteGraph.registerNodeType('CPU/math/DeltaTime (CPU)', DeltaTimeCpuNode);
}
