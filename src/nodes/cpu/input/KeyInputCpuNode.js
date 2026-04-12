import { LiteGraph } from 'litegraph.js';
import { keys } from '../../../viewport.js';

const KEY_CODES = [
  'KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP',
  'KeyR','KeyT','KeyU','KeyV','KeyX','KeyY','KeyZ',
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
  'Space',
  'Numpad0','Numpad1','Numpad2','Numpad3','Numpad4',
  'Numpad5','Numpad6','Numpad7','Numpad8','Numpad9',
];

export function registerKeyInputCpuNode() {
  function KeyInputCpuNode() {
    this.addOutput('pressed', 'js_float');
    this.title = 'Key Input (CPU)';
    this.size = [180, 55];
    this.properties = { key: 'KeyJ' };
    this.addWidget('combo', 'key', 'KeyJ', (v) => {
      this.properties.key = v;
    }, { values: KEY_CODES });
  }
  KeyInputCpuNode.title = 'Key Input (CPU)';
  KeyInputCpuNode.prototype.color = '#1a3a3a';
  KeyInputCpuNode.prototype.bgcolor = '#1e3e3e';
  KeyInputCpuNode.prototype.onConfigure = function () {
    if (this.widgets?.[0]) this.widgets[0].value = this.properties.key ?? 'KeyJ';
  };
  KeyInputCpuNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    this.setOutputData(0, keys[this.properties.key] ? 1.0 : 0.0);
  };
  LiteGraph.registerNodeType('CPU/input/Key Input (CPU)', KeyInputCpuNode);
}
