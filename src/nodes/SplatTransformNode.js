import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { Gsplat, dynoBlock, splitGsplat, combineGsplat, TransformGsplat,
        DynoVec3, DynoVec4, DynoFloat, mul } = dyno;

export function registerSplatTransformNode() {
  function SplatTransformNode() {
    this.addInput('emitter',   'splat_emitter');
    this.addInput('transform', 'transform');
    this.addOutput('emitter',  'splat_emitter');
    this.title = 'SplatTransform';
    this.size = [180, 50];

    this._translateU = new DynoVec3({ value: new THREE.Vector3(0, 0, 0) });
    this._rotateU    = new DynoVec4({ value: new THREE.Vector4(0, 0, 0, 1) });
    this._scaleU     = new DynoVec3({ value: new THREE.Vector3(1, 1, 1) });
    this._oneU       = new DynoFloat({ value: 1 });

    this._lastInput     = null;
    this._lastTransform = null;
    this._lastEmitter   = null;
  }

  SplatTransformNode.title = 'SplatTransform';
  SplatTransformNode.prototype.color = '#1a2a3a';
  SplatTransformNode.prototype.bgcolor = '#1e2e3e';

  SplatTransformNode.prototype.onExecute = function () {
    const emitter = this.getInputData(0);
    if (!emitter?.packedSplats) return;

    const tf = this.getInputData(1); // optional transform

    // Update uniform values every frame (cheap — GPU reads new value, no rebuild)
    if (tf) {
      this._translateU.value.copy(tf.position);
      this._rotateU.value.set(tf.quaternion.x, tf.quaternion.y, tf.quaternion.z, tf.quaternion.w);
      this._scaleU.value.copy(tf.scale);
    } else {
      this._translateU.value.set(0, 0, 0);
      this._rotateU.value.set(0, 0, 0, 1);
      this._scaleU.value.set(1, 1, 1);
    }

    // Only rebuild dynoBlock when emitter source changes (expensive)
    const emitterChanged = emitter !== this._lastInput;

    if (emitterChanged || !this._lastEmitter) {
      this._lastInput = emitter;

      const upstreamBuildFn = emitter.buildFn;
      const translateU = this._translateU;
      const rotateU    = this._rotateU;
      const scaleU     = this._scaleU;
      const oneU       = this._oneU;

      const buildFn = (gsplat) => {
        let modified = upstreamBuildFn ? upstreamBuildFn(gsplat) : gsplat;

        // Per-axis scale
        const outputs = splitGsplat(modified).outputs;
        modified = combineGsplat({
          gsplat: modified,
          center: mul(outputs.center, scaleU.dynoOut()),
          scales: mul(outputs.scales, scaleU.dynoOut()),
        });

        // Rotate + translate
        return new TransformGsplat({
          gsplat:    modified,
          scale:     oneU.dynoOut(),
          rotate:    rotateU.dynoOut(),
          translate: translateU.dynoOut(),
        }).dynoOut();
      };

      const modifier = dynoBlock(
        { gsplat: Gsplat },
        { gsplat: Gsplat },
        ({ gsplat }) => ({ gsplat: buildFn(gsplat) })
      );

      this._lastEmitter = { packedSplats: emitter.packedSplats, modifier, buildFn };
    }

    this.setOutputData(0, this._lastEmitter);
  };

  LiteGraph.registerNodeType('3dgs/SplatTransform', SplatTransformNode);
}
