import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { DynoFloat } = dyno;

export function registerFloatConstNode() {
  function FloatConstNode() {
    this.addOutput('value', 'dyno_float');
    this.title = 'Float (GPU)';
    this.size  = [160, 55];
    this.properties = { value: 0 };

    this._uniform = new DynoFloat({ value: 0 });

    const u = this._uniform;
    this._builder = (_o) => u.dynoOut();

    this.addWidget('number', 'value', 0, (v) => {
      this.properties.value = v;
      this._uniform.value = v;
    }, { step: 0.1 });
  }

  FloatConstNode.title = 'Float (GPU)';

  FloatConstNode.prototype.onConfigure = function () {
    const v = this.properties.value ?? 0;
    this._uniform.value = v;
    if (this.widgets?.[0]) this.widgets[0].value = v;
  };

  FloatConstNode.prototype.onExecute = function () {
    this.setOutputData(0, this._builder);
  };

  LiteGraph.registerNodeType('3dgs/GPU/math/Float (GPU)', FloatConstNode);
}
