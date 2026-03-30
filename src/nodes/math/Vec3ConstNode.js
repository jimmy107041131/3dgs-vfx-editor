import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec3 } = dyno;

export function registerVec3ConstNode() {
  function Vec3ConstNode() {
    this.addOutput('vec3', 'dyno_vec3');
    this.title = 'Vec3';
    this.size  = [160, 90];
    this.properties = { x: 0, y: 0, z: 0 };

    this._uniform = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });
    const u = this._uniform;
    this._builder = (_o) => u.dynoOut();

    const update = () => {
      u.value = new THREE.Vector3(this.properties.x, this.properties.y, this.properties.z);
    };
    this.addWidget('number', 'x', 0, (v) => { this.properties.x = v; update(); }, { step: 0.01 });
    this.addWidget('number', 'y', 0, (v) => { this.properties.y = v; update(); }, { step: 0.01 });
    this.addWidget('number', 'z', 0, (v) => { this.properties.z = v; update(); }, { step: 0.01 });
  }

  Vec3ConstNode.title = 'Vec3';

  Vec3ConstNode.prototype.onConfigure = function () {
    const { x = 0, y = 0, z = 0 } = this.properties;
    this._uniform.value = new THREE.Vector3(x, y, z);
    if (this.widgets?.[0]) this.widgets[0].value = x;
    if (this.widgets?.[1]) this.widgets[1].value = y;
    if (this.widgets?.[2]) this.widgets[2].value = z;
  };

  Vec3ConstNode.prototype.onExecute = function () {
    this.setOutputData(0, this._builder);
  };

  LiteGraph.registerNodeType('3dgs/math/Vec3', Vec3ConstNode);
}
