import { LiteGraph } from 'litegraph.js';

function buildToggleGraph(graph) {
  // ── Input ──
  const inTrigger = LiteGraph.createNode('Subgraph/Input');
  graph.add(inTrigger);
  inTrigger.pos = [50, 100];
  inTrigger.setProperty('type', 'js_float');
  inTrigger.setProperty('name', 'trigger');

  // ── Rising edge detection ──
  // currentHigh = trigger > 0.5
  const half1 = LiteGraph.createNode('CPU/math/Float (CPU)');
  graph.add(half1);
  half1.pos = [50, 250];
  half1.properties.value = 0.5; half1.widgets[0].value = 0.5;

  const cmpCurrent = LiteGraph.createNode('CPU/math/Compare (CPU)');
  graph.add(cmpCurrent);
  cmpCurrent.pos = [280, 100];
  cmpCurrent.properties.op = '>'; cmpCurrent.widgets[0].value = '>';
  inTrigger.connect(0, cmpCurrent, 0);
  half1.connect(0, cmpCurrent, 1);

  // prevHigh = _prev > 0.5
  const getPrev = LiteGraph.createNode('CPU/variables/Get Float');
  graph.add(getPrev);
  getPrev.pos = [50, 400];
  getPrev.properties.name = '_prev'; getPrev.widgets[0].value = '_prev';

  const half2 = LiteGraph.createNode('CPU/math/Float (CPU)');
  graph.add(half2);
  half2.pos = [50, 550];
  half2.properties.value = 0.5; half2.widgets[0].value = 0.5;

  const cmpPrev = LiteGraph.createNode('CPU/math/Compare (CPU)');
  graph.add(cmpPrev);
  cmpPrev.pos = [280, 400];
  cmpPrev.properties.op = '>'; cmpPrev.widgets[0].value = '>';
  getPrev.connect(0, cmpPrev, 0);
  half2.connect(0, cmpPrev, 1);

  // prevLow = NOT prevHigh
  const notPrev = LiteGraph.createNode('CPU/math/Logic (CPU)');
  graph.add(notPrev);
  notPrev.pos = [480, 400];
  notPrev.properties.op = 'NOT'; notPrev.widgets[0].value = 'NOT';
  cmpPrev.connect(0, notPrev, 0);

  // edge = currentHigh AND prevLow
  const andEdge = LiteGraph.createNode('CPU/math/Logic (CPU)');
  graph.add(andEdge);
  andEdge.pos = [680, 200];
  andEdge.properties.op = 'AND'; andEdge.widgets[0].value = 'AND';
  cmpCurrent.connect(0, andEdge, 0);
  notPrev.connect(0, andEdge, 1);

  // ── Toggle: value + edge, mod 2 ──
  const getVal = LiteGraph.createNode('CPU/variables/Get Float');
  graph.add(getVal);
  getVal.pos = [680, 400];
  getVal.properties.name = '_value'; getVal.widgets[0].value = '_value';

  const addEdge = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(addEdge);
  addEdge.pos = [880, 250];
  addEdge.properties.op = '+'; addEdge.widgets[0].value = '+';
  getVal.connect(0, addEdge, 0);
  andEdge.connect(0, addEdge, 1);

  const two = LiteGraph.createNode('CPU/math/Float (CPU)');
  graph.add(two);
  two.pos = [880, 400];
  two.properties.value = 2.0; two.widgets[0].value = 2.0;

  const modTwo = LiteGraph.createNode('CPU/math/Math (CPU)');
  graph.add(modTwo);
  modTwo.pos = [1080, 250];
  modTwo.properties.op = 'mod'; modTwo.widgets[0].value = 'mod';
  addEdge.connect(0, modTwo, 0);
  two.connect(0, modTwo, 1);

  // ── Store state ──
  const setVal = LiteGraph.createNode('CPU/variables/Set Float');
  graph.add(setVal);
  setVal.pos = [1280, 300];
  setVal.properties.name = '_value'; setVal.widgets[0].value = '_value';
  modTwo.connect(0, setVal, 0);

  const setPrev = LiteGraph.createNode('CPU/variables/Set Float');
  graph.add(setPrev);
  setPrev.pos = [1280, 450];
  setPrev.properties.name = '_prev'; setPrev.widgets[0].value = '_prev';
  inTrigger.connect(0, setPrev, 0);

  // ── Output ──
  const out = LiteGraph.createNode('Subgraph/Output');
  graph.add(out);
  out.pos = [1280, 200];
  out.setProperty('type', 'js_float');
  out.setProperty('name', 'value');
  modTwo.connect(0, out, 0);
}

export function registerTogglePreset() {
  const DynoSubgraph = LiteGraph.registered_node_types['Subgraph/Subgraph'];
  const Base = DynoSubgraph || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function TogglePreset() {
    Base.call(this);
    buildToggleGraph(this.subgraph);
    this.title = 'Toggle';
    if (this.outputs?.[0]) this.outputs[0].type = 'js_float';
  }

  TogglePreset.prototype             = Object.create(Base.prototype);
  TogglePreset.prototype.constructor = TogglePreset;

  TogglePreset.title            = 'Toggle';
  TogglePreset.desc             = 'Press to toggle between 0 and 1';
  TogglePreset.input_node_type  = 'Subgraph/Input';
  TogglePreset.output_node_type = 'Subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/Toggle', TogglePreset);
}
