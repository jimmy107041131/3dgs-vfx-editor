import { LiteGraph } from 'litegraph.js';
import { SplatMesh } from '@sparkjsdev/spark';
import { scene } from '../scene.js';

export function registerRendererNode() {
  function RendererNode() {
    this.addInput('emitter', 'splat_emitter');
    this.title = 'Renderer';
    this.size = [160, 50];

    this._splatMesh    = null;
    this._lastPacked   = null;
    this._lastModifier = null;
  }

  RendererNode.title = 'Renderer';
  RendererNode.prototype.color   = '#1a3a1a';
  RendererNode.prototype.bgcolor = '#1e3e1e';

  RendererNode.prototype.onExecute = function () {
    const emitter = this.getInputData(0);
    if (!emitter?.packedSplats) return;

    const { packedSplats, modifier } = emitter;
    const changed = packedSplats !== this._lastPacked || modifier !== this._lastModifier;

    if (changed || !this._splatMesh) {
      if (this._splatMesh) scene.remove(this._splatMesh);

      this._splatMesh = modifier
        ? new SplatMesh({ packedSplats, objectModifier: modifier })
        : new SplatMesh({ packedSplats });

      scene.add(this._splatMesh);
      this._lastPacked   = packedSplats;
      this._lastModifier = modifier;
    }
  };

  RendererNode.prototype.onRemoved = function () {
    if (this._splatMesh) {
      scene.remove(this._splatMesh);
      this._splatMesh = null;
    }
  };


  LiteGraph.registerNodeType('3dgs/Renderer', RendererNode);
}
