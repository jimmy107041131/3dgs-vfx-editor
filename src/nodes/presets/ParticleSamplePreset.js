import { LiteGraph } from 'litegraph.js';

function addSubIn(g, x, y, type, name) {
  const n = LiteGraph.createNode('3dgs/subgraph/Input');
  g.add(n); n.pos = [x, y];
  n.setProperty('type', type);
  n.setProperty('name', name);
  return n;
}

function addSubOut(g, x, y, type, name) {
  const n = LiteGraph.createNode('3dgs/subgraph/Output');
  g.add(n); n.pos = [x, y];
  n.setProperty('type', type);
  n.setProperty('name', name);
  return n;
}

// index → HashFloat → Step(1-density) → mask (0 or 1)
// density=1 → edge=0 → all hash>=0 → all 1 (selected)
// density=0 → edge=1 → no hash>=1  → all 0
function buildParticleMaskGraph(g) {
  const inIndex   = addSubIn(g, 50, 100, 'dyno_int',   'index');
  const inDensity = addSubIn(g, 50, 250, 'dyno_float', 'density');

  // HashFloat: index → random [0,1]
  const hash = LiteGraph.createNode('3dgs/math/HashFloat');
  g.add(hash); hash.pos = [300, 100];
  inIndex.connect(0, hash, 0);

  // 1 - density (invert so density=1 means all selected)
  const one = LiteGraph.createNode('3dgs/math/Float');
  g.add(one); one.pos = [300, 300];
  one.properties.value = 1; one._uniform.value = 1; one.widgets[0].value = 1;
  one.title = '1';

  const sub = LiteGraph.createNode('3dgs/math/Math');
  g.add(sub); sub.pos = [500, 250];
  sub.properties.op = '-'; sub.widgets[0].value = '-';
  one.connect(0, sub, 0);         // 1
  inDensity.connect(0, sub, 1);   // - density

  // Step: hash >= (1-density) → 1, else → 0
  const step = LiteGraph.createNode('3dgs/math/Step');
  g.add(step); step.pos = [700, 150];
  sub.connect(0, step, 0);    // edge = 1-density
  hash.connect(0, step, 1);   // x = hash

  // Output: mask (0 or 1)
  const out = addSubOut(g, 900, 150, 'dyno_float', 'mask');
  step.connect(0, out, 0);
}

export function registerParticleSamplePreset() {
  const Base = LiteGraph.registered_node_types['3dgs/Subgraph']
            || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function RandomMaskPreset() {
    Base.call(this);
    buildParticleMaskGraph(this.subgraph);
    this.title = 'Random Mask';
  }

  RandomMaskPreset.prototype             = Object.create(Base.prototype);
  RandomMaskPreset.prototype.constructor = RandomMaskPreset;
  RandomMaskPreset.title                 = 'Random Mask';
  RandomMaskPreset.desc                  = 'Per-splat random binary mask (0/1) controlled by density';
  RandomMaskPreset.input_node_type       = '3dgs/subgraph/Input';
  RandomMaskPreset.output_node_type      = '3dgs/subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/RandomMask', RandomMaskPreset);
}
