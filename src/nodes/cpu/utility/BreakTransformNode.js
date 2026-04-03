import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';

export function registerBreakTransformNode() {
  function BreakTransformNode() {
    this.addInput('transform', 'transform');
    this.addOutput('position', 'js_vec3');
    this.addOutput('rotation', 'js_vec3');
    this.addOutput('scale',    'js_vec3');
    this.title = 'BreakTransform (CPU)';
    this.size = [180, 80];
  }

  BreakTransformNode.title = 'BreakTransform (CPU)';
  BreakTransformNode.prototype.color = '#3a2a1a';
  BreakTransformNode.prototype.bgcolor = '#3e2e1e';

  BreakTransformNode.prototype.onExecute = function () {
    const tf = this.getInputData(0);
    if (!tf) return;

    this.setOutputData(0, tf.position.clone());

    const euler = new THREE.Euler().setFromQuaternion(tf.quaternion, 'YXZ');
    this.setOutputData(1, new THREE.Vector3(
      euler.x * 180 / Math.PI,
      euler.y * 180 / Math.PI,
      euler.z * 180 / Math.PI
    ));

    this.setOutputData(2, tf.scale.clone());
  };

  LiteGraph.registerNodeType('CPU/utility/BreakTransform (CPU)', BreakTransformNode);
}
