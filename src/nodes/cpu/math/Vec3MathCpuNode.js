import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';

const OPS = {
  'v+v': (a,b) => a.clone().add(b),
  'v-v': (a,b) => a.clone().sub(b),
  'v×v': (a,b) => a.clone().multiply(b),
  'v×f': null, // handled separately
  'v+f': null,
};

export function registerVec3MathCpuNode() {
  function Vec3MathCpuNode() {
    this.addInput('a', 'js_vec3');
    this.addInput('b', 'js_vec3');
    this.addOutput('result', 'js_vec3');
    this.title = 'Vec3Math (CPU)';
    this.size = [180, 55];
    this.properties = { op: 'v+v' };
    this.addWidget('combo', 'op', 'v+v', (v) => {
      this.properties.op = v;
      // Switch input type for scalar ops
      const isScalar = v === 'v×f' || v === 'v+f';
      this.inputs[1].type = isScalar ? 'js_float' : 'js_vec3';
      this.inputs[1].name = isScalar ? 'f' : 'b';
    }, { values: ['v+v', 'v-v', 'v×v', 'v×f', 'v+f'] });
  }
  Vec3MathCpuNode.title = 'Vec3Math (CPU)';
  Vec3MathCpuNode.prototype.color = '#1a3a3a';
  Vec3MathCpuNode.prototype.bgcolor = '#1e3e3e';
  Vec3MathCpuNode.prototype.onConfigure = function () {
    const op = this.properties.op ?? 'v+v';
    if (this.widgets?.[0]) this.widgets[0].value = op;
    const isScalar = op === 'v×f' || op === 'v+f';
    this.inputs[1].type = isScalar ? 'js_float' : 'js_vec3';
    this.inputs[1].name = isScalar ? 'f' : 'b';
  };
  Vec3MathCpuNode.prototype.onExecute = function () {
    const a = this.getInputData(0) ?? new THREE.Vector3();
    const b = this.getInputData(1);
    const op = this.properties.op;
    let result;
    switch (op) {
      case 'v+v': result = a.clone().add(b ?? new THREE.Vector3()); break;
      case 'v-v': result = a.clone().sub(b ?? new THREE.Vector3()); break;
      case 'v×v': result = a.clone().multiply(b ?? new THREE.Vector3(1,1,1)); break;
      case 'v×f': result = a.clone().multiplyScalar(b ?? 1); break;
      case 'v+f': { const s = b ?? 0; result = new THREE.Vector3(a.x+s, a.y+s, a.z+s); break; }
      default: result = a.clone();
    }
    this.setOutputData(0, result);
  };
  LiteGraph.registerNodeType('3dgs/CPU/math/Vec3Math (CPU)', Vec3MathCpuNode);
}
