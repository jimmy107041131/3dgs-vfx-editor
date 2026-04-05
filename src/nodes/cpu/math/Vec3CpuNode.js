import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';

export function registerVec3CpuNode() {
  function Vec3CpuNode() {
    this.addOutput('vec3', 'js_vec3');
    this.title = 'Vec3 (CPU)';
    this.size = [160, 90];
    this.properties = { x: 0, y: 0, z: 0 };
    const update = () => {};
    this.addWidget('number', 'x', 0, (v) => { this.properties.x = v; }, { step: 0.1 });
    this.addWidget('number', 'y', 0, (v) => { this.properties.y = v; }, { step: 0.1 });
    this.addWidget('number', 'z', 0, (v) => { this.properties.z = v; }, { step: 0.1 });
  }
  Vec3CpuNode.title = 'Vec3 (CPU)';
  Vec3CpuNode.prototype.color = '#1a3a3a';
  Vec3CpuNode.prototype.bgcolor = '#1e3e3e';
  Vec3CpuNode.prototype.onConfigure = function () {
    const { x = 0, y = 0, z = 0 } = this.properties;
    if (this.widgets?.[0]) this.widgets[0].value = x;
    if (this.widgets?.[1]) this.widgets[1].value = y;
    if (this.widgets?.[2]) this.widgets[2].value = z;
  };
  Vec3CpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    this.setOutputData(0, new THREE.Vector3(this.properties.x, this.properties.y, this.properties.z));
  };
  LiteGraph.registerNodeType('CPU/math/Vec3 (CPU)', Vec3CpuNode);
}
