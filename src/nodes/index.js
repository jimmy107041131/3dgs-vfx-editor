import { registerSplatSourceNode } from './SplatSourceNode.js';
import { registerMapGetNode } from './MapGetNode.js';
import { registerMapSetNode } from './MapSetNode.js';
import { registerRendererNode } from './RendererNode.js';
import { registerAnimatedFloatNode } from './utility/AnimatedFloatNode.js';
import { registerSplitVec3Node } from './utility/SplitVec3Node.js';
import { registerSplitVec4Node } from './utility/SplitVec4Node.js';
import { registerTimeNode } from './math/TimeNode.js';
import { registerFloatConstNode } from './math/FloatConstNode.js';
import { registerFloatMathNode } from './math/FloatMathNode.js';
import { registerFloatFuncNode } from './math/FloatFuncNode.js';
import { registerRemapNode } from './math/RemapNode.js';
import { registerHashFloatNode } from './math/HashFloatNode.js';
import { registerStepNode } from './math/StepNode.js';
import { registerVec3MathNode } from './math/Vec3MathNode.js';
import { registerVec4MathNode } from './math/Vec4MathNode.js';
import { registerVec3ConstNode } from './math/Vec3ConstNode.js';
import { registerVec4ConstNode } from './math/Vec4ConstNode.js';
import { registerTransformNode } from './TransformNode.js';
import { registerSubgraphNode } from './SubgraphNode.js';
import { registerSplitVec2Node } from './utility/SplitVec2Node.js';
import { registerMakeVec2Node } from './utility/MakeVec2Node.js';
import { registerMakeVec3Node } from './utility/MakeVec3Node.js';
import { registerMakeVec4Node } from './utility/MakeVec4Node.js';
import { registerVec2ConstNode } from './math/Vec2ConstNode.js';
import { registerColorTintPreset } from './presets/ColorTintPreset.js';
import { registerPositionOffsetPreset } from './presets/PositionOffsetPreset.js';
import { registerScaleMultiplyPreset } from './presets/ScaleMultiplyPreset.js';
import { registerParticleSamplePreset } from './presets/ParticleSamplePreset.js';
import { registerWaveNoisePreset } from './presets/WaveNoisePreset.js';

export function registerNodes() {
  // infrastructure
  registerSplatSourceNode();
  registerMapGetNode();
  registerMapSetNode();
  registerRendererNode();
  // utility
  registerAnimatedFloatNode();
  registerSplitVec2Node();
  registerSplitVec3Node();
  registerSplitVec4Node();
  registerMakeVec2Node();
  registerMakeVec3Node();
  registerMakeVec4Node();
  // math
  registerTimeNode();
  registerFloatConstNode();
  registerFloatMathNode();
  registerFloatFuncNode();
  registerRemapNode();
  registerHashFloatNode();
  registerStepNode();
  registerVec2ConstNode();
  registerVec3MathNode();
  registerVec4MathNode();
  registerVec3ConstNode();
  registerVec4ConstNode();
  registerTransformNode();
  // subgraph (must come after utility + math — presets use them)
  registerSubgraphNode();
  // presets (must come after subgraph)
  registerParticleSamplePreset();
  registerColorTintPreset();
  registerPositionOffsetPreset();
  registerScaleMultiplyPreset();
  registerWaveNoisePreset();
}
