import { LiteGraph } from 'litegraph.js';

// Helpers
function addFloat(g, x, y, val, title) {
  const n = LiteGraph.createNode('3dgs/GPU/math/Float (GPU)');
  g.add(n); n.pos = [x, y];
  n.properties.value = val; n._uniform.value = val; n.widgets[0].value = val;
  if (title) n.title = title;
  return n;
}
function addMath(g, x, y, op) {
  const n = LiteGraph.createNode('3dgs/GPU/math/Math (GPU)');
  g.add(n); n.pos = [x, y];
  n.properties.op = op; n.widgets[0].value = op;
  return n;
}
function addSin(g, x, y) {
  const n = LiteGraph.createNode('3dgs/GPU/math/Sin (GPU)');
  g.add(n); n.pos = [x, y];
  return n;
}
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

function buildWaveNoiseGraph(g) {
  const C = 200; // column spacing

  // ── Inputs & Parameters ──
  const inCenter    = addSubIn(g, 0, 200, 'dyno_vec3', 'center');
  const time        = addSubIn(g, 0, 350, 'dyno_float', 'time');
  const pScale      = addSubIn(g, 0, 0,   'dyno_float', 'WaveScale');
  const pSpeed      = addSubIn(g, 0, 70,  'dyno_float', 'WaveSpeed');
  const pHeight     = addSubIn(g, 0, 490, 'dyno_float', 'WaveHeight');
  const pXY         = addSubIn(g, 0, 560, 'dyno_float', 'XZStrength');

  // Shared constants
  const c6_28  = addFloat(g, C*4, 0,   6.28,  '6.28');
  const c3_14  = addFloat(g, C*4, 70,  3.14,  '3.14');
  const c9_42  = addFloat(g, C*4, 490, 9.42,  '9.42');
  const c1_5   = addFloat(g, C*5, 280, 1.5,   '1.5');
  const c2_1   = addFloat(g, C*5, 490, 2.1,   '2.1');
  const c0_5   = addFloat(g, C*6, 0,   0.5,   '0.5');
  const c0_3   = addFloat(g, C*6, 70,  0.3,   '0.3');
  const c0_2   = addFloat(g, C*6, 140, 0.2,   '0.2');
  const c5_0   = addFloat(g, C*4, 630, 5.0,   '5.0');
  const c0_7   = addFloat(g, C*2, 420, 0.7,   '0.7');
  const c0_4   = addFloat(g, C*5, 770, 0.4,   '0.4');

  // ── Split center → x, z (XZ ground plane) ──
  const splitC = LiteGraph.createNode('3dgs/GPU/utility/BreakVec3 (GPU)');
  g.add(splitC); splitC.pos = [C*1, 200];
  inCenter.connect(0, splitC, 0);

  // ── baseCoord.x = center.x * WaveScale ──
  const mulCX = addMath(g, C*2, 200, '×');
  splitC.connect(0, mulCX, 0);   // x
  pScale.connect(0, mulCX, 1);

  // ── baseCoord.z = center.z * WaveScale ──
  const mulCZ = addMath(g, C*2, 300, '×');
  splitC.connect(2, mulCZ, 0);   // z (XZ plane)
  pScale.connect(0, mulCZ, 1);

  // ── t * WaveSpeed ──
  const mulTS = addMath(g, C*2, 350, '×');
  time.connect(0, mulTS, 0);
  pSpeed.connect(0, mulTS, 1);

  // ── noiseCoord.x = baseCoord.x + t * WaveSpeed ──
  const addNCX = addMath(g, C*3, 140, '+');
  mulCX.connect(0, addNCX, 0);
  mulTS.connect(0, addNCX, 1);

  // ── noiseCoord.z = baseCoord.z + t * WaveSpeed * 0.7 ──
  const mulTS07 = addMath(g, C*3, 420, '×');
  mulTS.connect(0, mulTS07, 0);
  c0_7.connect(0, mulTS07, 1);
  const addNCY = addMath(g, C*3, 350, '+');
  mulCZ.connect(0, addNCY, 0);
  mulTS07.connect(0, addNCY, 1);

  // ── n1 = sin(ncx * 6.28 + ncy * 3.14) ──
  const mulN1a = addMath(g, C*5, 70, '×');
  addNCX.connect(0, mulN1a, 0);
  c6_28.connect(0, mulN1a, 1);
  const mulN1b = addMath(g, C*5, 140, '×');
  addNCY.connect(0, mulN1b, 0);
  c3_14.connect(0, mulN1b, 1);
  const addN1 = addMath(g, C*6, 70, '+');
  mulN1a.connect(0, addN1, 0);
  mulN1b.connect(0, addN1, 1);
  const sinN1 = addSin(g, C*7, 70);
  addN1.connect(0, sinN1, 0);

  // ── n2 = sin(ncx * 3.14 - ncy * 6.28 + 1.5) ──
  const mulN2a = addMath(g, C*5, 210, '×');
  addNCX.connect(0, mulN2a, 0);
  c3_14.connect(0, mulN2a, 1);
  const mulN2b = addMath(g, C*5, 280, '×');
  addNCY.connect(0, mulN2b, 0);
  c6_28.connect(0, mulN2b, 1);
  const subN2 = addMath(g, C*6, 210, '-');
  mulN2a.connect(0, subN2, 0);
  mulN2b.connect(0, subN2, 1);
  const addN2 = addMath(g, C*6, 280, '+');
  subN2.connect(0, addN2, 0);
  c1_5.connect(0, addN2, 1);
  const sinN2 = addSin(g, C*7, 210);
  addN2.connect(0, sinN2, 0);

  // ── n3 = sin((ncx + ncy) * 9.42 + 2.1) ──
  const addNC = addMath(g, C*4, 420, '+');
  addNCX.connect(0, addNC, 0);
  addNCY.connect(0, addNC, 1);
  const mulN3 = addMath(g, C*5, 420, '×');
  addNC.connect(0, mulN3, 0);
  c9_42.connect(0, mulN3, 1);
  const addN3 = addMath(g, C*6, 420, '+');
  mulN3.connect(0, addN3, 0);
  c2_1.connect(0, addN3, 1);
  const sinN3 = addSin(g, C*7, 420);
  addN3.connect(0, sinN3, 0);

  // ── noiseZ = n1*0.5 + n2*0.3 + n3*0.2 ──
  const mulZ1 = addMath(g, C*8, 70, '×');
  sinN1.connect(0, mulZ1, 0);
  c0_5.connect(0, mulZ1, 1);
  const mulZ2 = addMath(g, C*8, 210, '×');
  sinN2.connect(0, mulZ2, 0);
  c0_3.connect(0, mulZ2, 1);
  const mulZ3 = addMath(g, C*8, 420, '×');
  sinN3.connect(0, mulZ3, 0);
  c0_2.connect(0, mulZ3, 1);
  const addZ12 = addMath(g, C*9, 140, '+');
  mulZ1.connect(0, addZ12, 0);
  mulZ2.connect(0, addZ12, 1);
  const addZ123 = addMath(g, C*9, 280, '+');
  addZ12.connect(0, addZ123, 0);
  mulZ3.connect(0, addZ123, 1);

  // ── noiseX = sin(ncy * 5.0 + t * 0.3) * 0.5 ──
  const mulNXa = addMath(g, C*5, 560, '×');
  addNCY.connect(0, mulNXa, 0);
  c5_0.connect(0, mulNXa, 1);
  const mulNXb = addMath(g, C*5, 630, '×');
  time.connect(0, mulNXb, 0);
  c0_3.connect(0, mulNXb, 1);
  const addNX = addMath(g, C*6, 560, '+');
  mulNXa.connect(0, addNX, 0);
  mulNXb.connect(0, addNX, 1);
  const sinNX = addSin(g, C*7, 560);
  addNX.connect(0, sinNX, 0);
  const mulNX = addMath(g, C*8, 560, '×');
  sinNX.connect(0, mulNX, 0);
  c0_5.connect(0, mulNX, 1);

  // ── noiseY = sin(ncx * 5.0 - t * 0.4) * 0.5 ──
  const mulNYa = addMath(g, C*5, 700, '×');
  addNCX.connect(0, mulNYa, 0);
  c5_0.connect(0, mulNYa, 1);
  const mulNYb = addMath(g, C*5, 770, '×');
  time.connect(0, mulNYb, 0);
  c0_4.connect(0, mulNYb, 1);
  const subNY = addMath(g, C*6, 700, '-');
  mulNYa.connect(0, subNY, 0);
  mulNYb.connect(0, subNY, 1);
  const sinNY = addSin(g, C*7, 700);
  subNY.connect(0, sinNY, 0);
  const mulNY = addMath(g, C*8, 700, '×');
  sinNY.connect(0, mulNY, 0);
  c0_5.connect(0, mulNY, 1);

  // ── targetOffset.x = noiseX * WaveHeight * XYStrength ──
  const mulOX1 = addMath(g, C*9, 560, '×');
  mulNX.connect(0, mulOX1, 0);
  pHeight.connect(0, mulOX1, 1);
  const mulOX2 = addMath(g, C*10, 560, '×');
  mulOX1.connect(0, mulOX2, 0);
  pXY.connect(0, mulOX2, 1);

  // ── targetOffset.y = noiseY * WaveHeight * XYStrength ──
  const mulOY1 = addMath(g, C*9, 700, '×');
  mulNY.connect(0, mulOY1, 0);
  pHeight.connect(0, mulOY1, 1);
  const mulOY2 = addMath(g, C*10, 700, '×');
  mulOY1.connect(0, mulOY2, 0);
  pXY.connect(0, mulOY2, 1);

  // ── targetOffset.z = noiseZ * WaveHeight ──
  const mulOZ = addMath(g, C*10, 280, '×');
  addZ123.connect(0, mulOZ, 0);
  pHeight.connect(0, mulOZ, 1);

  // ── MakeVec3(offsetX, height, offsetZ) — Y is main wave height ──
  const makeOff = LiteGraph.createNode('3dgs/GPU/utility/MakeVec3 (GPU)');
  g.add(makeOff); makeOff.pos = [C*11, 490];
  mulOX2.connect(0, makeOff, 0);   // x (secondary, XZStrength)
  mulOZ.connect(0, makeOff, 1);    // y = main wave height (was noiseZ)
  mulOY2.connect(0, makeOff, 2);   // z (secondary, XZStrength)

  // ── pos = initPos + targetOffset ──
  const addPos = LiteGraph.createNode('3dgs/GPU/math/Vec3Math (GPU)');
  g.add(addPos); addPos.pos = [C*12, 350];
  // default op is 'vec3 × float', change to 'vec3 + vec3'
  addPos.properties.op = 'vec3 + vec3';
  addPos.widgets[0].value = 'vec3 + vec3';
  addPos.inputs[1].type = 'dyno_vec3';
  inCenter.connect(0, addPos, 0);
  makeOff.connect(0, addPos, 1);

  // ── Output ──
  const out = addSubOut(g, C*13, 350, 'dyno_vec3', 'center');
  addPos.connect(0, out, 0);
}

export function registerWaveNoisePreset() {
  const Base = LiteGraph.registered_node_types['3dgs/Subgraph']
            || LiteGraph.registered_node_types['graph/subgraph'];
  if (!Base) return;

  function WaveNoisePreset() {
    Base.call(this);
    buildWaveNoiseGraph(this.subgraph);
    this.title = 'Wave Noise';
  }

  WaveNoisePreset.prototype             = Object.create(Base.prototype);
  WaveNoisePreset.prototype.constructor = WaveNoisePreset;
  WaveNoisePreset.title                 = 'Wave Noise';
  WaveNoisePreset.desc                  = 'Multi-octave sine wave displacement using per-splat position as seed';
  WaveNoisePreset.input_node_type       = '3dgs/subgraph/Input';
  WaveNoisePreset.output_node_type      = '3dgs/subgraph/Output';

  LiteGraph.registerNodeType('3dgs/presets/WaveNoise', WaveNoisePreset);
}
