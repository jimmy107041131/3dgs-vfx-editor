import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BLOOM_LAYER } from './layers.js';
import { createLensFlarePass } from './screen-lensflare.js';

// ── State ────────────────────────────────────────────────────
let _renderer, _camera;
let bloomComposer, finalComposer, bloomPass;
let lensFlarePass, mixPass;
let bloomEnabled = false;

// ── Mix Shader ───────────────────────────────────────────────
const mixVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const mixFragmentShader = /* glsl */ `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
}`;

// ── Init ─────────────────────────────────────────────────────
export function initBloom(renderer, scene, camera, w, h) {
  _renderer = renderer;
  _camera = camera;

  // We pass physical buffer dimensions directly (already scaled by renderScale
  // in ui.js), so force composers' internal pixelRatio to 1 to avoid double scaling.

  // bloomComposer — renders only BLOOM_LAYER objects, outputs to FBO
  bloomComposer = new EffectComposer(renderer);
  bloomComposer.setPixelRatio(1);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera));

  // UBP at half resolution for performance — bloom is a blur, no visible difference
  const halfW = Math.ceil(w / 2), halfH = Math.ceil(h / 2);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(halfW, halfH), 0.8, 0.5, 0.2);

  // Luminance patch: max(R,G,B) instead of Rec.709 luminance
  // so saturated colors (pure red/green/blue) also bloom
  bloomPass.materialHighPassFilter.fragmentShader =
    bloomPass.materialHighPassFilter.fragmentShader.replace(
      'float v = luminance( texel.xyz );',
      'float v = max(texel.r, max(texel.g, texel.b));'
    );
  bloomPass.materialHighPassFilter.needsUpdate = true;
  bloomComposer.addPass(bloomPass);

  // finalComposer — renders all layers + mixes bloom + lens flare + OutputPass
  finalComposer = new EffectComposer(renderer);
  finalComposer.setPixelRatio(1);
  finalComposer.addPass(new RenderPass(scene, camera));

  const mixMaterial = new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: mixVertexShader,
    fragmentShader: mixFragmentShader,
  });
  mixPass = new ShaderPass(mixMaterial, 'baseTexture');
  mixPass.needsSwap = true;
  mixPass.enabled = bloomEnabled;  // skip when bloom off
  finalComposer.addPass(mixPass);

  // Screen-space lens flare (reads bloom texture, adds streaks + ghosts + halo)
  lensFlarePass = createLensFlarePass(bloomComposer.renderTarget2.texture);
  lensFlarePass.enabled = false;  // default off, match UI checkbox
  finalComposer.addPass(lensFlarePass);

  finalComposer.addPass(new OutputPass());

  // Set logical sizes (composer handles pixelRatio internally)
  bloomComposer.setSize(w, h);
  finalComposer.setSize(w, h);

  // Debug modes via URL param
  const debug = new URLSearchParams(window.location.search).get('bloomdebug');
  if (debug === 'glow') {
    bloomComposer.renderToScreen = true;
  }

  return { renderWithBloom, resizeBloom };
}

// ── Render ───────────────────────────────────────────────────
export function renderWithBloom() {
  const debug = new URLSearchParams(window.location.search).get('bloomdebug');

  if (debug === 'glow') {
    _camera.layers.set(BLOOM_LAYER);
    bloomComposer.render();
    _camera.layers.enableAll();
    return;
  }

  if (debug === 'base') {
    _camera.layers.enableAll();
    finalComposer.render();
    return;
  }

  if (bloomEnabled) {
    _camera.layers.set(BLOOM_LAYER);
    bloomComposer.render();
  } else {
    // Clear bloom RT so stale texture doesn't stick
    _renderer.setRenderTarget(bloomComposer.renderTarget2);
    _renderer.clear();
    _renderer.setRenderTarget(null);
  }

  _camera.layers.enableAll();
  finalComposer.render();
}

// ── Resize ───────────────────────────────────────────────────
export function resizeBloom(w, h) {
  // w, h are physical buffer dimensions (already scaled by renderScale)
  // Composers have pixelRatio=1, so setSize passes through directly
  bloomComposer.setSize(w, h);
  finalComposer.setSize(w, h);
  // UBP resolution at half for performance
  bloomPass.resolution.set(Math.ceil(w / 2), Math.ceil(h / 2));
}

// ── Bloom Controls ───────────────────────────────────────────
export function setBloomStrength(v) { bloomPass.strength = v; }
export function setBloomRadius(v) { bloomPass.radius = v; }
export function setBloomThreshold(v) { bloomPass.threshold = v; }
export function setBloomEnabled(v) {
  bloomEnabled = v;
  mixPass.enabled = v;  // skip mixPass when bloom off
}
export function getBloomEnabled() { return bloomEnabled; }

// ── Lens Flare Controls ─────────────────────────────────────
export function setLensflareEnabled(v) {
  lensFlarePass.enabled = v;  // skip entire pass when off
  lensFlarePass.uniforms.enabled.value = v ? 1.0 : 0.0;
}
export function setLensflareStreakStrength(v) {
  lensFlarePass.uniforms.streakStrength.value = v;
}
export function setLensflareGhostStrength(v) {
  lensFlarePass.uniforms.ghostStrength.value = v;
}
export function setLensflareHaloStrength(v) {
  lensFlarePass.uniforms.haloStrength.value = v;
}
export function setLensflareStreakLength(v) {
  lensFlarePass.uniforms.streakLength.value = v;
}
export function setLensflareIntensity(v) {
  lensFlarePass.uniforms.streakStrength.value = 0.35 * v;
}
