import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';
import * as THREE from 'three';

const { DynoFloat, DynoVec2, DynoVec3, DynoVec4 } = dyno;

/**
 * Factory for GPU constant nodes (Float, Vec2, Vec3, Vec4).
 * Handles: uniform creation, widget sync, onConfigure, onExecute, toGLSL stub.
 */

function createGpuConstNode({ name, wireType, fields, DynoClass, ThreeClass, nodeVersion = 1 }) {
  const outputName = wireType.replace('dyno_', '');
  const title = `${name} (GPU)`;
  const path = `3dgs/GPU/math/${title}`;
  const height = 35 + fields.length * 20;

  function NodeCtor() {
    this.addOutput(outputName, wireType);
    this.title = title;
    this.size = [160, height];
    this.properties = {};
    this._nodeVersion = nodeVersion;

    // Init properties with defaults
    for (const f of fields) this.properties[f.name] = f.default;

    // Create uniform
    const defaultVal = ThreeClass
      ? new ThreeClass(...fields.map(f => f.default))
      : fields[0].default;
    this._uniform = new DynoClass({ value: defaultVal });
    const u = this._uniform;
    this._builder = (_o) => u.dynoOut();

    // Widgets + sync
    const self = this;
    const update = () => {
      if (ThreeClass) {
        u.value = new ThreeClass(...fields.map(f => self.properties[f.name]));
      } else {
        u.value = self.properties[fields[0].name];
      }
    };
    for (const f of fields) {
      this.addWidget('number', f.name, f.default, (v) => {
        self.properties[f.name] = v;
        update();
      }, { step: 0.1 });
    }
  }

  NodeCtor.title = title;

  NodeCtor.prototype.onConfigure = function () {
    // Restore uniform + widgets from properties
    if (ThreeClass) {
      this._uniform.value = new ThreeClass(...fields.map(f => this.properties[f.name] ?? f.default));
    } else {
      this._uniform.value = this.properties[fields[0].name] ?? fields[0].default;
    }
    fields.forEach((f, i) => {
      if (this.widgets?.[i]) this.widgets[i].value = this.properties[f.name] ?? f.default;
    });
  };

  NodeCtor.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    this.setOutputData(0, this._builder);
  };

  // GLSL Compiler stub
  NodeCtor.prototype.toGLSL = function (inputVars) {
    const glslType = wireType.replace('dyno_', '');
    if (fields.length === 1) {
      return { type: glslType, expr: `u_${this.id}` };
    }
    return { type: glslType, expr: `u_${this.id}` };
  };

  NodeCtor.prototype.getGLSLUniforms = function () {
    const glslType = wireType.replace('dyno_', '');
    const vals = fields.map(f => this.properties[f.name] ?? f.default);
    return [{ name: `u_${this.id}`, type: glslType, value: vals }];
  };

  LiteGraph.registerNodeType(path, NodeCtor);
  return NodeCtor;
}

// ── Register all GPU const nodes ──
export function registerGpuConstNodes() {
  createGpuConstNode({
    name: 'Float', wireType: 'dyno_float',
    fields: [{ name: 'value', default: 0 }],
    DynoClass: DynoFloat, ThreeClass: null,
  });

  createGpuConstNode({
    name: 'Vec2', wireType: 'dyno_vec2',
    fields: [{ name: 'x', default: 0 }, { name: 'y', default: 0 }],
    DynoClass: DynoVec2, ThreeClass: THREE.Vector2,
  });

  createGpuConstNode({
    name: 'Vec3', wireType: 'dyno_vec3',
    fields: [{ name: 'x', default: 0 }, { name: 'y', default: 0 }, { name: 'z', default: 0 }],
    DynoClass: DynoVec3, ThreeClass: THREE.Vector3,
  });

  createGpuConstNode({
    name: 'Vec4', wireType: 'dyno_vec4',
    fields: [{ name: 'x', default: 0 }, { name: 'y', default: 0 }, { name: 'z', default: 0 }, { name: 'w', default: 1 }],
    DynoClass: DynoVec4, ThreeClass: THREE.Vector4,
  });
}
