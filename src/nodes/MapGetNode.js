import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoVec3, DynoVec4, DynoFloat, mul } = dyno;

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
    this.size = [180, 260];
    this.properties = { rotX: 0, rotY: 0, rotZ: 0, unitScale: 1 };

    this._unitScale = new DynoFloat({ value: 1 });

    this._centerFlip = null;
    this._quatFlip   = null;
    this._centerBuilder = null;
    this._scalesBuilder = null;
    this._quatBuilder   = null;
    this._lastKey = null;

    const self = this;
    this.addWidget('number', 'Rot X', 0, (v) => {
      self.properties.rotX = v;
      self._lastKey = null;
    }, { step: 1 });
    this.addWidget('number', 'Rot Y', 0, (v) => {
      self.properties.rotY = v;
      self._lastKey = null;
    }, { step: 1 });
    this.addWidget('number', 'Rot Z', 0, (v) => {
      self.properties.rotZ = v;
      self._lastKey = null;
    }, { step: 1 });
    this.addWidget('number', 'Unit Scale', 1, (v) => {
      self.properties.unitScale = v;
      self._unitScale.value = v;
      self._lastKey = null;
    }, { step: 0.1, min: 0.01 });
  }

  MapGetNode.title = 'Map Get';
  MapGetNode.prototype.color   = '#2a1a4a';
  MapGetNode.prototype.bgcolor = '#2e1e4e';

  MapGetNode.prototype.onConfigure = function () {
    const p = this.properties;
    // Migrate old flipX/flipY saves to rotation
    if ('flipX' in p || 'flipY' in p) {
      p.rotX = p.flipX ? 180 : 0;
      p.rotY = p.flipY ? 180 : 0;
      p.rotZ = 0;
      delete p.flipX;
      delete p.flipY;
    }
    if (this.widgets?.[0]) this.widgets[0].value = p.rotX ?? 0;
    if (this.widgets?.[1]) this.widgets[1].value = p.rotY ?? 0;
    if (this.widgets?.[2]) this.widgets[2].value = p.rotZ ?? 0;
    if (this.widgets?.[3]) this.widgets[3].value = p.unitScale ?? 1;
    this._unitScale.value = p.unitScale ?? 1;
    this._lastKey = null;
    // Force size for old saves that had smaller dimensions
    this.size[1] = Math.max(this.size[1], 260);
  };

  const _rgbaBuilder   = (o) => o.rgba;
  const _indexBuilder  = (o) => o.index;

  MapGetNode.prototype.onExecute = function () {
    if (!this.outputs.some((_, i) => this.isOutputConnected(i))) return;
    const source = this.getInputData(0);
    if (!source) return;

    const rx = this.properties.rotX;
    const ry = this.properties.rotY;
    const rz = this.properties.rotZ;
    const key = `${rx}_${ry}_${rz}_${this.properties.unitScale}`;

    if (key !== this._lastKey) {
      const us = this._unitScale;

      if (rx === 0 && ry === 0 && rz === 0) {
        // No rotation — pass through with scale only
        this._centerBuilder = (o) => mul(o.center, us.dynoOut());
        this._scalesBuilder = (o) => mul(o.scales, us.dynoOut());
        this._quatBuilder   = (o) => o.quaternion;
      } else {
        // Build quaternion from Euler angles (degrees → radians)
        const euler = new THREE.Euler(
          rx * Math.PI / 180,
          ry * Math.PI / 180,
          rz * Math.PI / 180,
          'YXZ'
        );
        const q = new THREE.Quaternion().setFromEuler(euler);

        // Rotate center position
        const rotMat = new THREE.Matrix3().setFromMatrix4(
          new THREE.Matrix4().makeRotationFromQuaternion(q)
        );
        const col0 = new THREE.Vector3(rotMat.elements[0], rotMat.elements[1], rotMat.elements[2]);
        const col1 = new THREE.Vector3(rotMat.elements[3], rotMat.elements[4], rotMat.elements[5]);
        const col2 = new THREE.Vector3(rotMat.elements[6], rotMat.elements[7], rotMat.elements[8]);
        const r0 = new DynoVec3({ value: col0 });
        const r1 = new DynoVec3({ value: col1 });
        const r2 = new DynoVec3({ value: col2 });

        // Quaternion multiplier for splat orientation
        this._quatFlip = new DynoVec4({ value: new THREE.Vector4(q.x, q.y, q.z, q.w) });
        const qf = this._quatFlip;

        this._centerBuilder = (o) => {
          // Manual matrix × vec3: result = col0*x + col1*y + col2*z
          const { DynoFloat: DF } = dyno;
          const cx = o.center;
          // Use component-wise extraction via DynoVec3 dot products
          // Simpler: apply scale first, then use the vec3 mul approach
          return mul(o.center, us.dynoOut());
        };

        // For center rotation, use per-component quaternion flip approach
        // Quaternion rotation of position: q * p * q^-1
        // But Spark dyno doesn't have quat rotation ops, so use flip vector approach
        // Compute what the Euler rotation does to axes and create a flip/scale vector
        const rotatedX = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
        const rotatedY = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const rotatedZ = new THREE.Vector3(0, 0, 1).applyQuaternion(q);

        // For axis-aligned rotations (90° multiples), the flip vector captures the transform
        // For the general case, we approximate with the sign pattern
        const cf = new DynoVec3({ value: new THREE.Vector3(
          Math.sign(rotatedX.x) || 1,
          Math.sign(rotatedY.y) || 1,
          Math.sign(rotatedZ.z) || 1,
        )});

        this._centerFlip = cf;

        this._centerBuilder = (o) => mul(mul(o.center, cf.dynoOut()), us.dynoOut());
        this._scalesBuilder = (o) => mul(o.scales, us.dynoOut());

        // Quaternion: multiply per-component (same approach as original flip)
        this._quatBuilder = (o) => mul(o.quaternion, qf.dynoOut());
      }

      this._lastKey = key;
    }

    this.setOutputData(0, this._centerBuilder);
    this.setOutputData(1, this._scalesBuilder ?? ((o) => mul(o.scales, this._unitScale.dynoOut())));
    this.setOutputData(2, this._quatBuilder);
    this.setOutputData(3, _rgbaBuilder);
    this.setOutputData(4, _indexBuilder);
    this.setOutputData(5, source);
  };

  LiteGraph.registerNodeType('3dgs/MapGet', MapGetNode);
}
