import { LiteGraph } from 'litegraph.js';
import { SplatMesh } from '@sparkjsdev/spark';
import { scene } from '../scene.js';

export function registerRendererNode() {
  function RendererNode() {
    this.addInput('emitter', 'splat_emitter');
    this.title = 'Renderer';
    this.size = [160, 50];
    this.properties = { enabled: true };

    this._splatMesh    = null;
    this._lastPacked   = null;
    this._lastModifier = null;

    this.addWidget('toggle', 'Enabled', true, (v) => {
      this.properties.enabled = v;
      if (!v) this._clearMesh();
    });
  }

  RendererNode.title = 'Renderer';
  RendererNode.prototype.onConfigure = function () {
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.enabled ?? true;
  };

  RendererNode.prototype.color   = '#1a3a1a';
  RendererNode.prototype.bgcolor = '#1e3e1e';

  RendererNode.prototype._clearMesh = function () {
    if (this._splatMesh) {
      scene.remove(this._splatMesh);
      if (this._splatMesh.dispose) this._splatMesh.dispose();
      this._splatMesh = null;
      this._lastPacked = null;
      this._lastModifier = null;
    }
  };

  RendererNode.prototype.onExecute = function () {
    if (!this.properties.enabled) return;

    const emitter = this.getInputData(0);
    if (!emitter?.packedSplats) {
      this._clearMesh(); // clean up on disconnect
      return;
    }

    const { packedSplats, modifier } = emitter;
    const changed = packedSplats !== this._lastPacked || modifier !== this._lastModifier;

    if (changed || !this._splatMesh) {
      this._clearMesh();

      this._splatMesh = modifier
        ? new SplatMesh({ packedSplats, objectModifier: modifier })
        : new SplatMesh({ packedSplats });

      scene.add(this._splatMesh);
      this._lastPacked   = packedSplats;
      this._lastModifier = modifier;
    }
  };

  RendererNode.prototype.onRemoved = function () {
    this._clearMesh();
  };

  LiteGraph.registerNodeType('3dgs/Renderer', RendererNode);
}
