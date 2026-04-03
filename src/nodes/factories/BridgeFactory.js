import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoFloat, DynoVec2, DynoVec3, DynoVec4 } = dyno;

/**
 * Factory for CPU→GPU bridge nodes.
 * Wraps a JS value into a Dyno uniform each frame.
 */
function createBridgeNode({ name, jsType, dynoType, DynoClass, defaultValue, copyFn }) {
  const title = name;
  const path = `3dgs/bridge/${name}`;

  function NodeCtor() {
    this.addInput('value', jsType);
    this.addOutput('value', dynoType);
    this.title = title;
    this.size = [150, 30];
    this._uniform = new DynoClass({ value: defaultValue() });
    this._builder = () => this._uniform.dynoOut();
  }

  NodeCtor.title = title;
  NodeCtor.prototype.color = '#2a3a2a';
  NodeCtor.prototype.bgcolor = '#2e3e2e';

  NodeCtor.prototype.onExecute = function () {
    const v = this.getInputData(0);
    copyFn(this._uniform, v);
    this.setOutputData(0, this._builder);
  };

  // GLSL stub — bridge nodes become uniform declarations
  NodeCtor.prototype.toGLSL = function () {
    const glslType = dynoType.replace('dyno_', '');
    return { type: glslType, expr: `u_bridge_${this.id}` };
  };

  LiteGraph.registerNodeType(path, NodeCtor);
  return NodeCtor;
}

export function registerBridgeNodes() {
  createBridgeNode({
    name: 'FloatToGPU', jsType: 'js_float', dynoType: 'dyno_float',
    DynoClass: DynoFloat,
    defaultValue: () => 0,
    copyFn: (uniform, v) => { uniform.value = v ?? 0; },
  });

  createBridgeNode({
    name: 'Vec3ToGPU', jsType: 'js_vec3', dynoType: 'dyno_vec3',
    DynoClass: DynoVec3,
    defaultValue: () => new THREE.Vector3(),
    copyFn: (uniform, v) => { v ? uniform.value.copy(v) : uniform.value.set(0, 0, 0); },
  });
}
