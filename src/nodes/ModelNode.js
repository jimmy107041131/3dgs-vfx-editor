import { LiteGraph } from 'litegraph.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene } from '../scene.js';

const gltfLoader = new GLTFLoader();

export function registerModelNode() {
  function ModelNode() {
    this.addInput('transform', 'transform');
    this.title = '3D Model';
    this.size = [200, 80];
    this.properties = { fileName: null, opacity: 1 };

    this._model = null;

    const self = this;
    this.addWidget('button', 'Load Model', null, () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.glb,.gltf';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) self._loadFile(file);
      };
      input.click();
    });

    this.addWidget('number', 'opacity', 1, (v) => {
      self.properties.opacity = Math.max(0, Math.min(1, v));
      self._applyOpacity();
    }, { step: 0.1, min: 0, max: 1 });
  }

  ModelNode.title = '3D Model';
  ModelNode.prototype.color = '#3a1a3a';
  ModelNode.prototype.bgcolor = '#3e1e3e';

  ModelNode.prototype._disposeModel = function () {
    if (!this._model) return;
    this._model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => { if (m) m.dispose(); });
      }
    });
    scene.remove(this._model);
    this._model = null;
  };

  ModelNode.prototype._loadFile = function (file) {
    const url = URL.createObjectURL(file);
    this.properties.fileName = file.name;
    this.title = '3D Model: ' + file.name;

    gltfLoader.load(
      url,
      (gltf) => {
        this._disposeModel();
        this._model = gltf.scene;
        scene.add(this._model);
        this._applyOpacity();
        URL.revokeObjectURL(url);
      },
      undefined,
      () => { URL.revokeObjectURL(url); } // error: still revoke blob URL
    );
  };

  ModelNode.prototype._applyOpacity = function () {
    if (!this._model) return;
    const opacity = this.properties.opacity;
    this._model.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (!m) return;
        m.transparent = opacity < 1;
        m.opacity = opacity;
      });
    });
  };

  ModelNode.prototype.onConfigure = function () {
    const p = this.properties;
    if (this.widgets?.[1]) this.widgets[1].value = p.opacity ?? 1;
    if (p.fileName) this.title = '3D Model: ' + p.fileName;
  };

  ModelNode.prototype.onExecute = function () {
    if (!this._model) return;
    const tf = this.getInputData(0);
    if (tf) {
      this._model.position.copy(tf.position);
      this._model.quaternion.copy(tf.quaternion);
      this._model.scale.copy(tf.scale);
    } else {
      this._model.position.set(0, 0, 0);
      this._model.quaternion.identity();
      this._model.scale.set(1, 1, 1);
    }
  };

  ModelNode.prototype.onRemoved = function () {
    this._disposeModel();
  };

  LiteGraph.registerNodeType('3dgs/3D Model', ModelNode);
}
