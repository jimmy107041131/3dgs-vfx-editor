import { LiteGraph } from 'litegraph.js';

function buildAccumulateGraph(graph) {
  // ── Inputs ──
  const inPlus = LiteGraph.createNode('Subgraph/Input');
  graph.add(inPlus);
  inPlus.pos = [50, 50];
  inPlus.setProperty('type', 'js_float');
  inPlus.setProperty('name', 'key+');

  const inMinus = LiteGraph.createNode('Subgraph/Input');
  graph.add(inMinus);
  inMinus.pos = [50, 200];
  inMinus.setProperty('type', 'js_float');
  inMinus.setProperty('name', 'key-');

  const inSpeed = LiteGraph.createNode('Subgraph/Input');
  graph.add(inSpeed);
  inSpeed.pos = [50, 350];
  inSpeed.setProperty('type', 'js_float');
  inSpeed.setProperty('name', 'speed');

  // ── Math: key+ - key- → drive (-1, 0, 1) ──
  const sub = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(sub);
  sub.pos = [280, 100];
  sub.properties.op = '-'; sub.widgets[0].value = '-';
  inPlus.connect(0, sub, 0);
  inMinus.connect(0, sub, 1);

  // ── Math: drive × speed → ratePerSec ──
  const mulSpeed = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(mulSpeed);
  mulSpeed.pos = [480, 150];
  mulSpeed.properties.op = '×'; mulSpeed.widgets[0].value = '×';
  sub.connect(0, mulSpeed, 0);
  inSpeed.connect(0, mulSpeed, 1);

  // ── DeltaTime → dt ──
  const dt = LiteGraph.createNode('CPU/math/DeltaTime (CPU)');
  graph.add(dt);
  dt.pos = [280, 350];

  // ── Math: ratePerSec × dt → delta ──
  const mulDt = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(mulDt);
  mulDt.pos = [680, 200];
  mulDt.properties.op = '×'; mulDt.widgets[0].value = '×';
  mulSpeed.connect(0, mulDt, 0);
  dt.connect(0, mulDt, 1);

  // ── Get Float: _value (previous frame) ──
  const getVal = LiteGraph.createNode('CPU/variables/Get Float');
  graph.add(getVal);
  getVal.pos = [480, 350];
  getVal.properties.name = '_value'; getVal.widgets[0].value = '_value';

  // ── Math: _value + delta → newValue ──
  const add = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(add);
  add.pos = [880, 250];
  add.properties.op = '+'; add.widgets[0].value = '+';
  getVal.connect(0, add, 0);
  mulDt.connect(0, add, 1);

  // ── Clamp: max(0, newValue) ──
  const clampMin = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(clampMin);
  clampMin.pos = [1080, 250];
  clampMin.properties.op = 'max'; clampMin.widgets[0].value = 'max';
  add.connect(0, clampMin, 0);
  // b defaults to 0 (unconnected → 0)

  // ── Clamp: min(1, result) ──
  const one = LiteGraph.createNode('CPU/math/Float (CPU)');
  graph.add(one);
  one.pos = [1080, 400];
  one.properties.value = 1.0; one.widgets[0].value = 1.0;

  const clampMax = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(clampMax);
  clampMax.pos = [1280, 250];
  clampMax.properties.op = 'min'; clampMax.widgets[0].value = 'min';
  clampMin.connect(0, clampMax, 0);
  one.connect(0, clampMax, 1);

  // ── Set Float: _value (store for next frame) ──
  const setVal = LiteGraph.createNode('CPU/variables/Set Float');
  graph.add(setVal);
  setVal.pos = [1480, 350];
  setVal.properties.name = '_value'; setVal.widgets[0].value = '_value';
  clampMax.connect(0, setVal, 0);

  // ── Output ──
  const out = LiteGraph.createNode('Subgraph/Output');
  graph.add(out);
  out.pos = [1480, 250];
  out.setProperty('type', 'js_float');
  out.setProperty('name', 'value');
  clampMax.connect(0, out, 0);
}

export function registerAccumulatePreset() {
  const DynoSubgraph = LiteGraph.registered_node_types['Subgraph/Subgraph'];
  const Base = DynoSubgraph || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function AccumulatePreset() {
    Base.call(this);
    buildAccumulateGraph(this.subgraph);
    this.title = 'Accumulate';
    if (this.outputs?.[0]) this.outputs[0].type = 'js_float';
  }

  AccumulatePreset.prototype             = Object.create(Base.prototype);
  AccumulatePreset.prototype.constructor = AccumulatePreset;

  AccumulatePreset.title            = 'Accumulate';
  AccumulatePreset.desc             = 'Dual-key accumulator: key+ increases, key- decreases, output [0,1]';
  AccumulatePreset.input_node_type  = 'Subgraph/Input';
  AccumulatePreset.output_node_type = 'Subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/Accumulate', AccumulatePreset);
}
