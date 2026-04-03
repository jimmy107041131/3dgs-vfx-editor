import { LiteGraph } from 'litegraph.js';

// center + offset (vec3 + vec3 → vec3)
// Internal: split both → add each component → reassemble
function buildPositionOffsetGraph(graph) {
  // ── Inputs ──
  const inCenter = LiteGraph.createNode('Subgraph/Input');
  graph.add(inCenter);
  inCenter.pos = [50, 200];
  inCenter.setProperty('type', 'dyno_vec3');
  inCenter.setProperty('name', 'center');

  const inOffset = LiteGraph.createNode('Subgraph/Input');
  graph.add(inOffset);
  inOffset.pos = [50, 50];
  inOffset.setProperty('type', 'dyno_vec3');
  inOffset.setProperty('name', 'offset');

  // ── Split center ──
  const splitC = LiteGraph.createNode('3dgs/GPU/utility/BreakVec3 (GPU)');
  splitC.pos = [300, 200];
  graph.add(splitC);
  inCenter.connect(0, splitC, 0);

  // ── Split offset ──
  const splitO = LiteGraph.createNode('3dgs/GPU/utility/BreakVec3 (GPU)');
  splitO.pos = [300, 50];
  graph.add(splitO);
  inOffset.connect(0, splitO, 0);

  // ── Add components ──
  const addX = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  graph.add(addX);
  addX.pos = [520, 50];
  splitC.connect(0, addX, 0);
  splitO.connect(0, addX, 1);

  const addY = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  graph.add(addY);
  addY.pos = [520, 200];
  splitC.connect(1, addY, 0);
  splitO.connect(1, addY, 1);

  const addZ = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  graph.add(addZ);
  addZ.pos = [520, 350];
  splitC.connect(2, addZ, 0);
  splitO.connect(2, addZ, 1);

  // ── Reassemble ──
  const make = LiteGraph.createNode('3dgs/GPU/utility/MakeVec3 (GPU)');
  make.pos = [740, 170];
  graph.add(make);
  addX.connect(0, make, 0);
  addY.connect(0, make, 1);
  addZ.connect(0, make, 2);

  // ── Output ──
  const out = LiteGraph.createNode('Subgraph/Output');
  graph.add(out);
  out.pos = [940, 170];
  out.setProperty('type', 'dyno_vec3');
  out.setProperty('name', 'center');
  make.connect(0, out, 0);
}

export function registerPositionOffsetPreset() {
  const Base = LiteGraph.registered_node_types['Subgraph/Subgraph']
            || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function PositionOffsetPreset() {
    Base.call(this);
    buildPositionOffsetGraph(this.subgraph);
    this.title = 'Position Offset';
  }

  PositionOffsetPreset.prototype             = Object.create(Base.prototype);
  PositionOffsetPreset.prototype.constructor = PositionOffsetPreset;
  PositionOffsetPreset.title                 = 'Position Offset';
  PositionOffsetPreset.desc                  = 'Add offset vec3 to center';
  PositionOffsetPreset.input_node_type       = 'Subgraph/Input';
  PositionOffsetPreset.output_node_type      = 'Subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/PositionOffset', PositionOffsetPreset);
}
