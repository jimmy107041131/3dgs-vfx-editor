import { LiteGraph } from 'litegraph.js';

function buildColorTintGraph(graph) {
  // ── Inputs ──
  const inRgba = LiteGraph.createNode('3dgs/subgraph/Input');
  graph.add(inRgba);
  inRgba.pos = [50, 200];
  inRgba.setProperty('type', 'dyno_vec4');
  inRgba.setProperty('name', 'rgba');

  const inTint = LiteGraph.createNode('3dgs/subgraph/Input');
  graph.add(inTint);
  inTint.pos = [50, 50];
  inTint.setProperty('type', 'dyno_vec3');
  inTint.setProperty('name', 'tint');

  // ── Split rgba → r,g,b,w ──
  const splitRgba = LiteGraph.createNode('3dgs/utility/SplitVec4');
  splitRgba.pos = [300, 200];
  graph.add(splitRgba);
  inRgba.connect(0, splitRgba, 0);

  // ── Split tint → tr,tg,tb ──
  const splitTint = LiteGraph.createNode('3dgs/utility/SplitVec3');
  splitTint.pos = [300, 50];
  graph.add(splitTint);
  inTint.connect(0, splitTint, 0);

  // ── Multiply: channel × tint ──
  const mulR = LiteGraph.createNode('3dgs/math/Math');
  graph.add(mulR);
  mulR.pos = [520, 60];
  mulR.properties.op = '×'; mulR.widgets[0].value = '×';
  splitRgba.connect(0, mulR, 0); // r → a
  splitTint.connect(0, mulR, 1); // tr → b

  const mulG = LiteGraph.createNode('3dgs/math/Math');
  graph.add(mulG);
  mulG.pos = [520, 220];
  mulG.properties.op = '×'; mulG.widgets[0].value = '×';
  splitRgba.connect(1, mulG, 0); // g → a
  splitTint.connect(1, mulG, 1); // tg → b

  const mulB = LiteGraph.createNode('3dgs/math/Math');
  graph.add(mulB);
  mulB.pos = [520, 380];
  mulB.properties.op = '×'; mulB.widgets[0].value = '×';
  splitRgba.connect(2, mulB, 0); // b → a
  splitTint.connect(2, mulB, 1); // tb → b

  // ── Reassemble vec4 (alpha passthrough) ──
  const make = LiteGraph.createNode('3dgs/utility/MakeVec4');
  make.pos = [740, 200];
  graph.add(make);
  mulR.connect(0, make, 0);      // r → x
  mulG.connect(0, make, 1);      // g → y
  mulB.connect(0, make, 2);      // b → z
  splitRgba.connect(3, make, 3); // w → w

  // ── Output ──
  const out = LiteGraph.createNode('3dgs/subgraph/Output');
  graph.add(out);
  out.pos = [940, 200];
  out.setProperty('type', 'dyno_vec4');
  out.setProperty('name', 'rgba');
  make.connect(0, out, 0);
}

export function registerColorTintPreset() {
  const DynoSubgraph = LiteGraph.registered_node_types['3dgs/Subgraph'];
  const Base = DynoSubgraph || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function ColorTintPreset() {
    Base.call(this);
    buildColorTintGraph(this.subgraph);
    this.title = 'Color Tint';
  }

  ColorTintPreset.prototype             = Object.create(Base.prototype);
  ColorTintPreset.prototype.constructor = ColorTintPreset;

  ColorTintPreset.title            = 'Color Tint';
  ColorTintPreset.desc             = 'Multiply rgba channels by a tint vec3';
  ColorTintPreset.input_node_type  = '3dgs/subgraph/Input';
  ColorTintPreset.output_node_type = '3dgs/subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/ColorTint', ColorTintPreset);
}
