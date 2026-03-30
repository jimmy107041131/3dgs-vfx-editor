import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { DynoFloat } = dyno;

export function registerAnimatedFloatNode() {
  function AnimatedFloatNode() {
    this.addOutput('value', 'dyno_float');
    this.title = 'Animated Float';
    this.size = [210, 120];
    this.properties = { amplitude: 1.0, frequency: 1.0, offset: 0.0 };

    this._uniform    = new DynoFloat({ value: 0 });
    this._startTime  = performance.now();
    this._builder    = null;

    this.addWidget('number', 'amplitude', 1.0,
      (v) => { this.properties.amplitude = v; },
      { min: -20, max: 20, step: 0.1 });
    this.addWidget('number', 'frequency', 1.0,
      (v) => { this.properties.frequency = v; },
      { min: 0.01, max: 20, step: 0.01 });
    this.addWidget('number', 'offset', 0.0,
      (v) => { this.properties.offset = v; },
      { min: -20, max: 20, step: 0.1 });
  }

  AnimatedFloatNode.title = 'Animated Float';
  AnimatedFloatNode.prototype.color   = '#3a2a1a';
  AnimatedFloatNode.prototype.bgcolor = '#4a3a2a';

  AnimatedFloatNode.prototype.onExecute = function () {
    const t = (performance.now() - this._startTime) / 1000;
    const { amplitude, frequency, offset } = this.properties;
    // Update the GPU uniform value each frame — no shader recompile needed
    this._uniform.value = amplitude * Math.sin(2 * Math.PI * frequency * t) + offset;

    // Stable builder reference — only created once
    if (!this._builder) {
      const u = this._uniform;
      this._builder = (_outputs) => u.dynoOut();
    }
    this.setOutputData(0, this._builder);
  };

  LiteGraph.registerNodeType('3dgs/utility/AnimatedFloat', AnimatedFloatNode);
}
