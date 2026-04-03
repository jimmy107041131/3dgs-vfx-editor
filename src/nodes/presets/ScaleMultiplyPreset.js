import { LiteGraph } from 'litegraph.js';

// scales × factor (vec3 × vec3 → vec3, per-axis)
// Internal: split both → multiply each axis → reassemble
function buildScaleMultiplyGraph(graph) {
  // ── Inputs ──
  const inScales = LiteGraph.createNode('3dgs/subgraph/Input');
  graph.add(inScales);
  inScales.pos = [50, 200];
  inScales.setProperty('type', 'dyno_vec3');
  inScales.setProperty('name', 'scales');

  const inFactor = LiteGraph.createNode('3dgs/subgraph/Input');
  graph.add(inFactor);
  inFactor.pos = [50, 50];
  inFactor.setProperty('type', 'dyno_vec3');
  inFactor.setProperty('name', 'factor');

  // ── Split scales ──
  const splitS = LiteGraph.createNode('3dgs/GPU/utility/BreakVec3 (GPU)');
  splitS.pos = [300, 200];
  graph.add(splitS);
  inScales.connect(0, splitS, 0);

  // ── Split factor ──
  const splitF = LiteGraph.createNode('3dgs/GPU/utility/BreakVec3 (GPU)');
  splitF.pos = [300, 50];
  graph.add(splitF);
  inFactor.connect(0, splitF, 0);

  // ── Multiply each axis ──
  const mulX = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  graph.add(mulX);
  mulX.pos = [520, 50];
  mulX.properties.op = '×'; mulX.widgets[0].value = '×';
  splitS.connect(0, mulX, 0);
  splitF.connect(0, mulX, 1);

  const mulY = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  graph.add(mulY);
  mulY.pos = [520, 200];
  mulY.properties.op = '×'; mulY.widgets[0].value = '×';
  splitS.connect(1, mulY, 0);
  splitF.connect(1, mulY, 1);

  const mulZ = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  graph.add(mulZ);
  mulZ.pos = [520, 350];
  mulZ.properties.op = '×'; mulZ.widgets[0].value = '×';
  splitS.connect(2, mulZ, 0);
  splitF.connect(2, mulZ, 1);

  // ── Reassemble ──
  const make = LiteGraph.createNode('3dgs/GPU/utility/MakeVec3 (GPU)');
  make.pos = [740, 170];
  graph.add(make);
  mulX.connect(0, make, 0);
  mulY.connect(0, make, 1);
  mulZ.connect(0, make, 2);

  // ── Output ──
  const out = LiteGraph.createNode('3dgs/subgraph/Output');
  graph.add(out);
  out.pos = [940, 170];
  out.setProperty('type', 'dyno_vec3');
  out.setProperty('name', 'scales');
  make.connect(0, out, 0);
}

export function registerScaleMultiplyPreset() {
  const Base = LiteGraph.registered_node_types['3dgs/Subgraph']
            || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function ScaleMultiplyPreset() {
    Base.call(this);
    buildScaleMultiplyGraph(this.subgraph);
    this.title = 'Scale Multiply';
  }

  ScaleMultiplyPreset.prototype             = Object.create(Base.prototype);
  ScaleMultiplyPreset.prototype.constructor = ScaleMultiplyPreset;
  ScaleMultiplyPreset.title                 = 'Scale Multiply';
  ScaleMultiplyPreset.desc                  = 'Multiply scales per-axis by a factor vec3';
  ScaleMultiplyPreset.input_node_type       = '3dgs/subgraph/Input';
  ScaleMultiplyPreset.output_node_type      = '3dgs/subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/ScaleMultiply', ScaleMultiplyPreset);
}
