import { LiteGraph } from 'litegraph.js';
import { dyno } from '@sparkjsdev/spark';

const { Gsplat, dynoBlock, splitGsplat, combineGsplat } = dyno;

export function registerMapSetNode() {
  function MapSetNode() {
    this.addInput('center',     'dyno_vec3');
    this.addInput('scales',     'dyno_vec3');
    this.addInput('quaternion', 'dyno_vec4');
    this.addInput('rgba',       'dyno_vec4');
    this.addInput('source',     'splat_source');
    this.addOutput('emitter',   'splat_emitter');
    this.title = 'Map Set';
    this.size = [160, 130];

    this._lastInputs  = [null, null, null, null, null];
    this._lastEmitter = null;
  }

  MapSetNode.title = 'Map Set';
  MapSetNode.prototype.color = '#3a1a2a';
  MapSetNode.prototype.bgcolor = '#3e1e2e';

  MapSetNode.prototype.onExecute = function () {
    if (!this.isOutputConnected(0)) return;
    const centerB     = this.getInputData(0);
    const scalesB     = this.getInputData(1);
    const quaternionB = this.getInputData(2);
    const rgbaB       = this.getInputData(3);
    const source      = this.getInputData(4);

    if (!source?.packedSplats) return;

    const inputs  = [centerB, scalesB, quaternionB, rgbaB, source];
    const changed = inputs.some((v, i) => v !== this._lastInputs[i]);

    if (changed || !this._lastEmitter) {
      this._lastInputs = [...inputs];

      const buildFn = (gsplat) => {
        const outputs  = splitGsplat(gsplat).outputs;
        const overrides = { gsplat };
        if (centerB)     overrides.center     = centerB(outputs);
        if (scalesB)     overrides.scales     = scalesB(outputs);
        if (quaternionB) overrides.quaternion = quaternionB(outputs);
        if (rgbaB)       overrides.rgba       = rgbaB(outputs);
        return combineGsplat(overrides);
      };

      const modifier = dynoBlock(
        { gsplat: Gsplat },
        { gsplat: Gsplat },
        ({ gsplat }) => ({ gsplat: buildFn(gsplat) })
      );

      this._lastEmitter = { packedSplats: source.packedSplats, modifier, buildFn };
    }

    this.setOutputData(0, this._lastEmitter);
  };

  LiteGraph.registerNodeType('3dgs/MapSet', MapSetNode);
}
