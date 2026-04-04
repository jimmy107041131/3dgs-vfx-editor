import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ── Screen-Space Lens Flare (Hybrid Convolution Bloom approximation) ──
// Star streaks: directional blur along N angles from bloom texture
// Ghosts: flipped + scaled copies with chromatic aberration
// Halo: ring sampling around bright regions

const LensFlareShader = {
  uniforms: {
    tDiffuse:       { value: null },  // previous pass output
    bloomTexture:   { value: null },  // bloom FBO
    enabled:        { value: 0.0 },
    streakStrength: { value: 0.35 },
    ghostStrength:  { value: 0.0 },
    haloStrength:   { value: 0.0 },
    streakLength:   { value: 0.15 },  // UV space
    streakAngle:    { value: 15.0 },  // base rotation in degrees
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D bloomTexture;
    uniform float enabled;
    uniform float streakStrength;
    uniform float ghostStrength;
    uniform float haloStrength;
    uniform float streakLength;
    uniform float streakAngle;
    varying vec2 vUv;

    #define NUM_STREAK_LINES 3
    #define STREAK_SAMPLES 8
    #define NUM_GHOSTS 4
    #define PI 3.14159265

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);

      if (enabled < 0.5) {
        gl_FragColor = base;
        return;
      }

      float baseAngle = streakAngle * PI / 180.0;

      // ── Star Streaks ─────────────────────────────────
      vec3 streaks = vec3(0.0);
      float totalW = 0.0;
      for (int i = 0; i < NUM_STREAK_LINES; i++) {
        float angle = baseAngle + float(i) * PI / float(NUM_STREAK_LINES);
        vec2 dir = vec2(cos(angle), sin(angle));
        for (int j = 1; j <= STREAK_SAMPLES; j++) {
          float t = float(j) / float(STREAK_SAMPLES);
          float w = pow(1.0 - t, 3.0);  // cubic falloff for sharp streaks
          vec2 offset = dir * t * streakLength;
          streaks += texture2D(bloomTexture, vUv + offset).rgb * w;
          streaks += texture2D(bloomTexture, vUv - offset).rgb * w;
          totalW += w * 2.0;
        }
      }
      streaks /= max(totalW, 1.0);

      // ── Ghosts (flipped + scaled copies with chromatic shift) ──
      vec2 flipped = vec2(1.0) - vUv;
      vec3 ghosts = vec3(0.0);
      for (int i = 0; i < NUM_GHOSTS; i++) {
        float scale = 0.3 + float(i) * 0.25;
        vec2 guv = mix(vec2(0.5), flipped, scale);
        float ca = 0.003 * (float(i) + 1.0);
        ghosts.r += texture2D(bloomTexture, guv + vec2(ca, 0.0)).r;
        ghosts.g += texture2D(bloomTexture, guv).g;
        ghosts.b += texture2D(bloomTexture, guv - vec2(ca, 0.0)).b;
      }
      ghosts /= float(NUM_GHOSTS);
      // Fade ghosts near edges to avoid hard cutoff
      float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                     * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
      ghosts *= edgeFade;

      // ── Halo (ring around bright region) ─────────────
      vec2 toCenter = vec2(0.5) - vUv;
      float dist = length(toCenter);
      vec3 halo = vec3(0.0);
      if (dist > 0.01) {
        vec2 haloUv = vUv + normalize(toCenter) * clamp(0.55 - dist, 0.0, 0.5);
        float haloMask = smoothstep(0.15, 0.35, dist) * smoothstep(0.75, 0.5, dist);
        // Chromatic halo
        float hca = 0.005;
        halo.r = texture2D(bloomTexture, haloUv + vec2(hca, 0.0)).r * haloMask;
        halo.g = texture2D(bloomTexture, haloUv).g * haloMask;
        halo.b = texture2D(bloomTexture, haloUv - vec2(hca, 0.0)).b * haloMask;
      }

      vec3 lensEffect = streaks * streakStrength
                       + ghosts * ghostStrength
                       + halo   * haloStrength;

      gl_FragColor = base + vec4(lensEffect, 0.0);
    }
  `,
};

export function createLensFlarePass(bloomTexture) {
  const pass = new ShaderPass(LensFlareShader);
  pass.uniforms.bloomTexture.value = bloomTexture;
  pass.needsSwap = true;
  return pass;
}
