import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec3, DynoVec4, mul } = dyno;

// Flip vectors — combine at rebuild time based on toggle state
// Flip Y: (1,-1,1) center, (-1,1,-1,1) quat  — Y-down → Y-up
// Flip X: (-1,1,1) center, (1,-1,-1,1) quat  — mirror across YZ plane

export function registerMapGetNode() {
  function MapGetNode() {
    this.addInput('source',      'splat_source');
    this.addOutput('center',     'dyno_vec3');
    this.addOutput('scales',     'dyno_vec3');
    this.addOutput('quaternion', 'dyno_vec4');
    this.addOutput('rgba',       'dyno_vec4');
    this.addOutput('index',      'dyno_int');
    this.addOutput('source',     'splat_source');
    this.title = 'Map Get';
    this.size = [180, 180];
    this.properties = { flipX: true, flipY: true };

    this._centerFlip = null;
    this._quatFlip   = null;
    this._centerBuilder = null;
    this._quatBuilder   = null;
    this._lastKey = null;

    this.addWidget('toggle', 'Flip X', true, (v) => {
      this.properties.flipX = v;
      this._lastKey = null;
    });
    this.addWidget('toggle', 'Flip Y', true, (v) => {
      this.properties.flipY = v;
      this._lastKey = null;
    });
  }

  MapGetNode.title = 'Map Get';
  MapGetNode.prototype.color   = '#2a1a4a';
  MapGetNode.prototype.bgcolor = '#2e1e4e';

  const _scalesBuilder = (o) => o.scales;
  const _rgbaBuilder   = (o) => o.rgba;
  const _indexBuilder  = (o) => o.index;

  MapGetNode.prototype.onExecute = function () {
    const source = this.getInputData(0);
    if (!source) return;

    const key = (this.properties.flipX ? 'X' : '') + (this.properties.flipY ? 'Y' : '');

    if (key !== this._lastKey) {
      const fx = this.properties.flipX;
      const fy = this.properties.flipY;

      if (!fx && !fy) {
        this._centerBuilder = (o) => o.center;
        this._quatBuilder   = (o) => o.quaternion;
      } else {
        const cx = fx ? -1 : 1;
        const cy = fy ? -1 : 1;
        this._centerFlip = new DynoVec3({ value: new THREE.Vector3(cx, cy, 1) });
        // quat flip: flipY negates qx,qz; flipX negates qy,qz
        const qx = fy ? -1 : 1;
        const qy = fx ? -1 : 1;
        const qz = (fx !== fy) ? -1 : (fx && fy) ? 1 : 1;
        // both flip: qx=-1, qy=-1, qz=1, qw=1
        // only flipY: qx=-1, qy=1, qz=-1, qw=1
        // only flipX: qx=1, qy=-1, qz=-1, qw=1
        this._quatFlip = new DynoVec4({ value: new THREE.Vector4(qx, qy, (fx && fy) ? 1 : -1, 1) });

        // Recalculate qz properly
        // flipY only: negate qx, qz → (-1,1,-1,1)
        // flipX only: negate qy, qz → (1,-1,-1,1)
        // both: negate qx,qy → (-1,-1,1,1)
        let qqx = 1, qqy = 1, qqz = 1;
        if (fy) { qqx *= -1; qqz *= -1; }
        if (fx) { qqy *= -1; qqz *= -1; }
        this._quatFlip = new DynoVec4({ value: new THREE.Vector4(qqx, qqy, qqz, 1) });

        const cf = this._centerFlip;
        const qf = this._quatFlip;
        this._centerBuilder = (o) => mul(o.center,     cf.dynoOut());
        this._quatBuilder   = (o) => mul(o.quaternion, qf.dynoOut());
      }

      this._lastKey = key;
    }

    this.setOutputData(0, this._centerBuilder);
    this.setOutputData(1, _scalesBuilder);
    this.setOutputData(2, this._quatBuilder);
    this.setOutputData(3, _rgbaBuilder);
    this.setOutputData(4, _indexBuilder);
    this.setOutputData(5, source);
  };

  LiteGraph.registerNodeType('3dgs/MapGet', MapGetNode);
}
