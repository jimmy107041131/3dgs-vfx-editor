import { registerModelNode } from './ModelNode.js';
import { registerSplatSourceNode } from './SplatSourceNode.js';
import { registerMapGetNode } from './MapGetNode.js';
import { registerMapSetNode } from './MapSetNode.js';
import { registerRendererNode } from './RendererNode.js';
import { registerBreakVec2Node } from './utility/BreakVec2Node.js';
import { registerBreakVec3Node } from './utility/BreakVec3Node.js';
import { registerBreakVec4Node } from './utility/BreakVec4Node.js';
import { registerTimeNode } from './math/TimeNode.js';
import { registerFloatMathNode } from './math/FloatMathNode.js';
import { registerFloatFuncNode } from './math/FloatFuncNode.js';
import { registerRemapNode } from './math/RemapNode.js';
import { registerHashFloatNode } from './math/HashFloatNode.js';
import { registerStepNode } from './math/StepNode.js';
import { registerVec3MathNode } from './math/Vec3MathNode.js';
import { registerVec4MathNode } from './math/Vec4MathNode.js';
import { registerClampNode, registerLerpNode, registerDistanceNode, registerDotNode, registerNormalizeNode, registerSmoothstepNode } from './math/GpuExtraFuncNode.js';
import { registerSplatTransformNode } from './SplatTransformNode.js';
import { registerTransformNode } from './TransformNode.js';
import { registerSubgraphNode } from './SubgraphNode.js';
import { registerMakeVec2Node } from './utility/MakeVec2Node.js';
import { registerMakeVec3Node } from './utility/MakeVec3Node.js';
import { registerMakeVec4Node } from './utility/MakeVec4Node.js';
import { registerColorTintPreset } from './presets/ColorTintPreset.js';
import { registerPositionOffsetPreset } from './presets/PositionOffsetPreset.js';
import { registerScaleMultiplyPreset } from './presets/ScaleMultiplyPreset.js';
import { registerParticleSamplePreset } from './presets/ParticleSamplePreset.js';
import { registerWaveNoisePreset } from './presets/WaveNoisePreset.js';
// Factories
import { registerGpuConstNodes } from './factories/GpuConstFactory.js';
import { registerBridgeNodes } from './factories/BridgeFactory.js';
// CPU utility
import { registerBreakTransformNode } from './cpu/utility/BreakTransformNode.js';
import { registerMakeTransformNode } from './cpu/utility/MakeTransformNode.js';
import { registerBreakVec3CpuNode } from './cpu/utility/BreakVec3CpuNode.js';
import { registerMakeVec3CpuNode } from './cpu/utility/MakeVec3CpuNode.js';
// CPU math
import { registerFloatCpuNode } from './cpu/math/FloatCpuNode.js';
import { registerVec3CpuNode } from './cpu/math/Vec3CpuNode.js';
import { registerMathCpuNode } from './cpu/math/MathCpuNode.js';
import { registerVec3MathCpuNode } from './cpu/math/Vec3MathCpuNode.js';
import { registerRotateVec3CpuNode } from './cpu/math/RotateVec3CpuNode.js';
import { registerFloatFuncCpuNode } from './cpu/math/FloatFuncCpuNode.js';
import { registerTimeCpuNode } from './cpu/math/TimeCpuNode.js';
import { registerLerpCpuNode } from './cpu/math/LerpCpuNode.js';

export function registerNodes() {
  registerModelNode();
  // infrastructure
  registerSplatSourceNode();
  registerMapGetNode();
  registerMapSetNode();
  registerRendererNode();
  // GPU utility
  registerBreakVec2Node();
  registerBreakVec3Node();
  registerBreakVec4Node();
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
  // GPU math (extra)
  registerClampNode();
  registerLerpNode();
  registerDistanceNode();
  registerDotNode();
  registerNormalizeNode();
  registerSmoothstepNode();
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
  registerFloatFuncCpuNode();
  registerTimeCpuNode();
  registerLerpCpuNode();
  // Bridge (factory)
  registerBridgeNodes(); // FloatToGPU, Vec3ToGPU
}
