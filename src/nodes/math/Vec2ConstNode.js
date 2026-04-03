import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec2 } = dyno;

export function registerVec2ConstNode() {
  function Vec2ConstNode() {
    this.addOutput('vec2', 'dyno_vec2');
    this.title = 'Vec2 (GPU)';
    this.size  = [160, 70];
    this.properties = { x: 0, y: 0 };

    this._uniform = new DynoVec2({ value: new THREE.Vector2(0, 0) });
    const u = this._uniform;
    this._builder = (_o) => u.dynoOut();

    const update = () => {
      u.value = new THREE.Vector2(this.properties.x, this.properties.y);
    };
    this.addWidget('number', 'x', 0, (v) => { this.properties.x = v; update(); }, { step: 0.1 });
    this.addWidget('number', 'y', 0, (v) => { this.properties.y = v; update(); }, { step: 0.1 });
  }

  Vec2ConstNode.title = 'Vec2 (GPU)';

  Vec2ConstNode.prototype.onConfigure = function () {
    const { x = 0, y = 0 } = this.properties;
    this._uniform.value = new THREE.Vector2(x, y);
    if (this.widgets?.[0]) this.widgets[0].value = x;
    if (this.widgets?.[1]) this.widgets[1].value = y;
  };

  Vec2ConstNode.prototype.onExecute = function () {
    this.setOutputData(0, this._builder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/Vec2 (GPU)', Vec2ConstNode);
}
