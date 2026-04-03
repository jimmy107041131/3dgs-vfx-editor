import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';

export function registerMakeVec3CpuNode() {
  function MakeVec3CpuNode() {
    this.addInput('x', 'js_float');
    this.addInput('y', 'js_float');
    this.addInput('z', 'js_float');
    this.addOutput('vec3', 'js_vec3');
    this.title = 'MakeVec3 (CPU)';
    this.size = [160, 70];
  }
  MakeVec3CpuNode.title = 'MakeVec3 (CPU)';
  MakeVec3CpuNode.prototype.color = '#1a3a3a';
  MakeVec3CpuNode.prototype.bgcolor = '#1e3e3e';
  MakeVec3CpuNode.prototype.onExecute = function () {
    const x = this.getInputData(0) ?? 0;
    const y = this.getInputData(1) ?? 0;
    const z = this.getInputData(2) ?? 0;
    this.setOutputData(0, new THREE.Vector3(x, y, z));
  };
  LiteGraph.registerNodeType('CPU/utility/MakeVec3 (CPU)', MakeVec3CpuNode);
}
