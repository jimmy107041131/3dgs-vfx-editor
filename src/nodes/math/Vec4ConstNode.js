import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec4 } = dyno;

export function registerVec4ConstNode() {
  function Vec4ConstNode() {
    this.addOutput('vec4', 'dyno_vec4');
    this.title = 'Vec4';
    this.size  = [160, 110];
    this.properties = { x: 0, y: 0, z: 0, w: 1 };

    this._uniform = new DynoVec4({ value: new THREE.Vector4(0, 0, 0, 1) });
    const u = this._uniform;
    this._builder = (_o) => u.dynoOut();

    const update = () => {
      u.value = new THREE.Vector4(this.properties.x, this.properties.y, this.properties.z, this.properties.w);
    };
    this.addWidget('number', 'x', 0, (v) => { this.properties.x = v; update(); }, { step: 0.01 });
    this.addWidget('number', 'y', 0, (v) => { this.properties.y = v; update(); }, { step: 0.01 });
    this.addWidget('number', 'z', 0, (v) => { this.properties.z = v; update(); }, { step: 0.01 });
    this.addWidget('number', 'w', 1, (v) => { this.properties.w = v; update(); }, { step: 0.01 });
  }

  Vec4ConstNode.title = 'Vec4';

  Vec4ConstNode.prototype.onExecute = function () {
    this.setOutputData(0, this._builder);
  };

  LiteGraph.registerNodeType('3dgs/math/Vec4', Vec4ConstNode);
}
