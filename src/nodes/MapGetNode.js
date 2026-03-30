import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec3, DynoVec4, DynoFloat, mul } = dyno;

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
    this.size = [180, 200];
    this.properties = { flipX: true, flipY: true, unitScale: 1 };

    this._unitScale = new DynoFloat({ value: 1 });

    this._centerFlip = null;
    this._quatFlip   = null;
    this._centerBuilder = null;
    this._scalesBuilder = null;
    this._quatBuilder   = null;
    this._lastKey = null;

    const self = this;
    this.addWidget('toggle', 'Flip X', true, (v) => {
      self.properties.flipX = v;
      self._lastKey = null;
    });
    this.addWidget('toggle', 'Flip Y', true, (v) => {
      self.properties.flipY = v;
      self._lastKey = null;
    });
    this.addWidget('number', 'Unit Scale', 1, (v) => {
      self.properties.unitScale = v;
      self._unitScale.value = v;
      self._lastKey = null; // force rebuild
    }, { step: 0.01, min: 0.001 });
  }

  MapGetNode.title = 'Map Get';
  MapGetNode.prototype.color   = '#2a1a4a';
  MapGetNode.prototype.bgcolor = '#2e1e4e';

  MapGetNode.prototype.onConfigure = function () {
    const p = this.properties;
    if (this.widgets?.[0]) this.widgets[0].value = p.flipX ?? true;
    if (this.widgets?.[1]) this.widgets[1].value = p.flipY ?? true;
    if (this.widgets?.[2]) this.widgets[2].value = p.unitScale ?? 1;
    this._unitScale.value = p.unitScale ?? 1;
    this._lastKey = null;
  };

  const _rgbaBuilder   = (o) => o.rgba;
  const _indexBuilder  = (o) => o.index;

  MapGetNode.prototype.onExecute = function () {
    const source = this.getInputData(0);
    if (!source) return;

    const key = (this.properties.flipX ? 'X' : '') + (this.properties.flipY ? 'Y' : '') + '_' + this.properties.unitScale;

    if (key !== this._lastKey) {
      const fx = this.properties.flipX;
      const fy = this.properties.flipY;
      const us = this._unitScale;

      if (!fx && !fy) {
        this._centerBuilder = (o) => mul(o.center, us.dynoOut());
        this._scalesBuilder = (o) => mul(o.scales, us.dynoOut());
        this._quatBuilder   = (o) => o.quaternion;
      } else {
        const cx = fx ? -1 : 1;
        const cy = fy ? -1 : 1;
        this._centerFlip = new DynoVec3({ value: new THREE.Vector3(cx, cy, 1) });

        let qqx = 1, qqy = 1, qqz = 1;
        if (fy) { qqx *= -1; qqz *= -1; }
        if (fx) { qqy *= -1; qqz *= -1; }
        this._quatFlip = new DynoVec4({ value: new THREE.Vector4(qqx, qqy, qqz, 1) });

        const cf = this._centerFlip;
        const qf = this._quatFlip;
        this._centerBuilder = (o) => mul(mul(o.center, cf.dynoOut()), us.dynoOut());
        this._scalesBuilder = (o) => mul(o.scales, us.dynoOut());
        this._quatBuilder   = (o) => mul(o.quaternion, qf.dynoOut());
      }

      this._lastKey = key;
    }

    this.setOutputData(0, this._centerBuilder);
    this.setOutputData(1, this._scalesBuilder);
    this.setOutputData(2, this._quatBuilder);
    this.setOutputData(3, _rgbaBuilder);
    this.setOutputData(4, _indexBuilder);
    this.setOutputData(5, source);
  };

  LiteGraph.registerNodeType('3dgs/MapGet', MapGetNode);
}
