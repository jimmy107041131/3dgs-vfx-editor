import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';

export function registerRotateVec3CpuNode() {
  function RotateVec3CpuNode() {
    this.addInput('position', 'js_vec3');
    this.addInput('euler', 'js_vec3');
    this.addOutput('result', 'js_vec3');
    this.title = 'RotateVec3 (CPU)';
    this.size = [190, 50];
  }
  RotateVec3CpuNode.title = 'RotateVec3 (CPU)';
  RotateVec3CpuNode.prototype.color = '#1a3a3a';
  RotateVec3CpuNode.prototype.bgcolor = '#1e3e3e';
  RotateVec3CpuNode.prototype.onExecute = function () {
    const pos = this.getInputData(0) ?? new THREE.Vector3();
    const eul = this.getInputData(1) ?? new THREE.Vector3();
    const euler = new THREE.Euler(
      eul.x * Math.PI / 180,
      eul.y * Math.PI / 180,
      eul.z * Math.PI / 180,
      'YXZ'
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);
    this.setOutputData(0, pos.clone().applyQuaternion(quat));
  };
  LiteGraph.registerNodeType('CPU/math/RotateVec3 (CPU)', RotateVec3CpuNode);
}
