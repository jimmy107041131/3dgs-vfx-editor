import { registerModelNode } from './ModelNode.js';
import { registerSplatSourceNode } from './SplatSourceNode.js';
import { registerMapGetNode } from './MapGetNode.js';
import { registerMapSetNode } from './MapSetNode.js';
import { registerRendererNode } from './RendererNode.js';
import { registerSplitVec3Node } from './utility/SplitVec3Node.js';
import { registerSplitVec4Node } from './utility/SplitVec4Node.js';
import { registerTimeNode } from './math/TimeNode.js';
import { registerFloatMathNode } from './math/FloatMathNode.js';
import { registerFloatFuncNode } from './math/FloatFuncNode.js';
import { registerRemapNode } from './math/RemapNode.js';
import { registerHashFloatNode } from './math/HashFloatNode.js';
import { registerStepNode } from './math/StepNode.js';
import { registerVec3MathNode } from './math/Vec3MathNode.js';
import { registerVec4MathNode } from './math/Vec4MathNode.js';
import { registerSplatTransformNode } from './SplatTransformNode.js';
import { registerTransformNode } from './TransformNode.js';
import { registerSubgraphNode } from './SubgraphNode.js';
import { registerSplitVec2Node } from './utility/SplitVec2Node.js';
import { registerMakeVec2Node } from './utility/MakeVec2Node.js';
import { registerMakeVec3Node } from './utility/MakeVec3Node.js';
import { registerMakeVec4Node } from './utility/MakeVec4Node.js';
import { registerColorTintPreset } from './presets/ColorTintPreset.js';
import { registerPositionOffsetPreset } from './presets/PositionOffsetPreset.js';
import { registerScaleMultiplyPreset } from './presets/ScaleMultiplyPreset.js';
import { registerParticleSamplePreset } from './presets/ParticleSamplePreset.js';
import { registerWaveNoisePreset } from './presets/WaveNoisePreset.js';
import { registerBreakTransformNode } from './utility/BreakTransformNode.js';
import { registerMakeTransformNode } from './utility/MakeTransformNode.js';
// Factories
import { registerGpuConstNodes } from './factories/GpuConstFactory.js';
import { registerBridgeNodes } from './factories/BridgeFactory.js';
// CPU math
import { registerFloatCpuNode } from './cpu/math/FloatCpuNode.js';
import { registerVec3CpuNode } from './cpu/math/Vec3CpuNode.js';
import { registerMathCpuNode } from './cpu/math/MathCpuNode.js';
import { registerVec3MathCpuNode } from './cpu/math/Vec3MathCpuNode.js';
import { registerRotateVec3CpuNode } from './cpu/math/RotateVec3CpuNode.js';
// CPU utility
import { registerBreakVec3CpuNode } from './cpu/utility/BreakVec3CpuNode.js';
import { registerMakeVec3CpuNode } from './cpu/utility/MakeVec3CpuNode.js';

export function registerNodes() {
  registerModelNode();
  // infrastructure
  registerSplatSourceNode();
  registerMapGetNode();
  registerMapSetNode();
  registerRendererNode();
  // GPU utility
  registerSplitVec2Node();
  registerSplitVec3Node();
  registerSplitVec4Node();
  registerMakeVec2Node();
  registerMakeVec3Node();
  registerMakeVec4Node();
  // GPU math (factory)
  registerGpuConstNodes(); // Float, Vec2, Vec3, Vec4
  registerTimeNode();
  registerFloatMathNode();
  registerFloatFuncNode();
  registerRemapNode();
  registerHashFloatNode();
  registerStepNode();
  registerVec3MathNode();
  registerVec4MathNode();
  // Transform
  registerSplatTransformNode();
  registerTransformNode();
  // subgraph (must come after utility + math — presets use them)
  registerSubgraphNode();
  // presets (must come after subgraph)
  registerParticleSamplePreset();
  registerColorTintPreset();
  registerPositionOffsetPreset();
  registerScaleMultiplyPreset();
  registerWaveNoisePreset();
  // CPU utility
  registerBreakTransformNode();
  registerMakeTransformNode();
  registerBreakVec3CpuNode();
  registerMakeVec3CpuNode();
  // CPU math
  registerFloatCpuNode();
  registerVec3CpuNode();
  registerMathCpuNode();
  registerVec3MathCpuNode();
  registerRotateVec3CpuNode();
  // Bridge (factory)
  registerBridgeNodes(); // FloatToGPU, Vec3ToGPU
}
