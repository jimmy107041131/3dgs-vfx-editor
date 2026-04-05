import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec3 } = dyno;

export function registerVec3ToGpuNode() {
  function Vec3ToGpuNode() {
    this.addInput('vec3', 'js_vec3');
    this.addOutput('vec3', 'dyno_vec3');
    this.title = 'Vec3ToGPU';
    this.size = [150, 30];
    this._uniform = new DynoVec3({ value: new THREE.Vector3() });
    this._builder = () => this._uniform.dynoOut();
  }
  Vec3ToGpuNode.title = 'Vec3ToGPU';
  Vec3ToGpuNode.prototype.color = '#2a3a2a';
  Vec3ToGpuNode.prototype.bgcolor = '#2e3e2e';
  Vec3ToGpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const v = this.getInputData(0);
    if (v) {
      this._uniform.value.copy(v);
    } else {
      this._uniform.value.set(0, 0, 0);
    }
    this.setOutputData(0, this._builder);
  };
  LiteGraph.registerNodeType('Bridge/Vec3ToGPU', Vec3ToGpuNode);
}
