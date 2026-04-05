import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';

export function registerMakeTransformNode() {
  function MakeTransformNode() {
    this.addInput('position', 'js_vec3');
    this.addInput('rotation', 'js_vec3');
    this.addInput('scale',    'js_vec3');
    this.addOutput('transform', 'transform');
    this.title = 'MakeTransform (CPU)';
    this.size = [180, 80];
  }

  MakeTransformNode.title = 'MakeTransform (CPU)';
  MakeTransformNode.prototype.color = '#3a2a1a';
  MakeTransformNode.prototype.bgcolor = '#3e2e1e';

  MakeTransformNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const pos = this.getInputData(0) ?? new THREE.Vector3();
    const rot = this.getInputData(1) ?? new THREE.Vector3();
    const sca = this.getInputData(2) ?? new THREE.Vector3(1, 1, 1);

    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      rot.x * Math.PI / 180,
      rot.y * Math.PI / 180,
      rot.z * Math.PI / 180,
      'YXZ'
    ));

    this.setOutputData(0, {
      position: pos.clone(),
      quaternion,
      scale: sca.clone(),
    });
  };

  LiteGraph.registerNodeType('CPU/utility/MakeTransform (CPU)', MakeTransformNode);
}
