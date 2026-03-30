import { LiteGraph } from 'litegraph.js';
import { SplatMesh } from '@sparkjsdev/spark';

export function registerSplatSourceNode() {
  function SplatSourceNode() {
    this.addOutput('source', 'splat_source');
    this.title = 'Splat Source';
    this.size = [200, 28];
    this.properties = { fileName: '' };
    this._splatMesh = null;
    this._fileName = '';
    this._status = 'empty'; // empty | loading | ready

    this.addWidget('button', 'Load File', null, () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.splat,.ply,.spz';
      input.onchange = (e) => { if (e.target.files[0]) this._load(e.target.files[0]); };
      input.click();
    });
  }

  SplatSourceNode.title = 'Splat Source';
  SplatSourceNode.prototype.color = '#1a2a3a';
  SplatSourceNode.prototype.bgcolor = '#1e2e3e';

  SplatSourceNode.prototype._load = function (file) {
    this._fileName = file.name;
    this.properties.fileName = file.name;
    this._status = 'loading';
    this._ready = false;
    this.title = 'Loading...';
    this.color = '#3a2a10';

    const url = URL.createObjectURL(file);
    this._splatMesh = new SplatMesh({ url });
    this._splatMesh.packedSplats.initialized.then(() => {
      this._ready = true;
      this._status = 'ready';
      const name = file.name.length > 24 ? file.name.slice(0, 22) + '…' : file.name;
      this.title = name;
      this.color = '#1a3a1a';
    }).catch(() => {
      this._status = 'error';
      this.title = 'Error';
      this.color = '#3a1a1a';
    });
  };


  SplatSourceNode.prototype.onConfigure = function () {
    if (this.properties.fileName) {
      this._fileName = this.properties.fileName;
      const name = this._fileName.length > 24 ? this._fileName.slice(0, 22) + '…' : this._fileName;
      this.title = name;
    }
  };

  SplatSourceNode.prototype.onExecute = function () {
    const packed = this._splatMesh && this._splatMesh.packedSplats;
    if (!packed || !this._ready) return;
    this._status = 'ready';
    this.setOutputData(0, {
      packedSplats: packed,
      fileName: this._fileName,
    });
  };



  LiteGraph.registerNodeType('3dgs/SplatSource', SplatSourceNode);
}
