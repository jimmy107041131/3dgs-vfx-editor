import { LiteGraph } from 'litegraph.js';
import { scene } from './scene.js';

const PARAMS = new URLSearchParams(window.location.search);
export const BENCHMARK_MODE = PARAMS.get('benchmark') === '1';

function numberParam(key, fallback) {
  const raw = PARAMS.get(key);
  if (raw == null || raw === '') return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function summarize(values) {
  if (!values.length) {
    return { count: 0, avg: null, min: null, max: null, p50: null, p95: null };
  }
  let sum = 0;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return {
    count: values.length,
    avg: sum / values.length,
    min,
    max,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
  };
}

function safePct(base, value) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(value)) return null;
  return ((value - base) / base) * 100;
}

function safeDropPct(base, value) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(value)) return null;
  return ((base - value) / base) * 100;
}

function round1(v) {
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 10) / 10;
}

function projectRangeByFactor(range, factor) {
  if (!Array.isArray(range) || range.length !== 2 || !Number.isFinite(factor) || factor <= 0) return null;
  const a = round1(range[0] / factor);
  const b = round1(range[1] / factor);
  return [Math.min(a, b), Math.max(a, b)];
}

function buildDeviceProjection(baseStage, bloomStage) {
  const gpuFactor =
    Number.isFinite(baseStage?.gpuRenderMs?.avg) &&
    Number.isFinite(bloomStage?.gpuRenderMs?.avg) &&
    baseStage.gpuRenderMs.avg > 0
      ? bloomStage.gpuRenderMs.avg / baseStage.gpuRenderMs.avg
      : null;

  // These no-bloom ranges are practical estimates for this project's ~0.8M splat workload at 1080p.
  // They are not measured in this run and should be treated as planning numbers.
  const profiles = [
    {
      id: 'gtx1060_6gb_1080p',
      label: 'GTX 1060 6GB',
      noBloomFpsRange: [40, 60],
    },
    {
      id: 'cpu_integrated_gpu_1080p',
      label: 'CPU Integrated GPU',
      noBloomFpsRange: [12, 28],
    },
  ];

  return {
    assumptions: {
      method: 'gpu_overhead_factor_projection',
      bloomFactorDerivedFromThisRun: gpuFactor,
      note:
        'Inferred estimate. Assumes GPU-bound behavior and similar driver/API path. Validate on target hardware.',
    },
    profiles: profiles.map((p) => ({
      id: p.id,
      label: p.label,
      noBloomFpsRange: p.noBloomFpsRange,
      bloomFpsRange:
        Number.isFinite(gpuFactor) ? projectRangeByFactor(p.noBloomFpsRange, gpuFactor) : null,
    })),
  };
}

function readRendererStats(renderer) {
  const info = renderer.info || {};
  const render = info.render || {};
  const memory = info.memory || {};
  return {
    calls: render.calls ?? 0,
    triangles: render.triangles ?? 0,
    points: render.points ?? 0,
    lines: render.lines ?? 0,
    geometries: memory.geometries ?? 0,
    textures: memory.textures ?? 0,
    programs: Array.isArray(info.programs) ? info.programs.length : null,
  };
}

function extractFileName(url) {
  const clean = url.split('?')[0].split('#')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || 'demo.spz';
}

function ensureReportEl() {
  let el = document.getElementById('benchmark-report');
  if (!el) {
    el = document.createElement('pre');
    el.id = 'benchmark-report';
    el.style.position = 'fixed';
    el.style.left = '12px';
    el.style.top = '52px';
    el.style.maxWidth = 'min(860px, calc(100vw - 24px))';
    el.style.maxHeight = 'calc(100vh - 64px)';
    el.style.overflow = 'auto';
    el.style.whiteSpace = 'pre-wrap';
    el.style.padding = '10px 12px';
    el.style.background = 'rgba(0,0,0,0.72)';
    el.style.color = '#cfe8ff';
    el.style.border = '1px solid rgba(160,190,220,0.35)';
    el.style.borderRadius = '8px';
    el.style.font = '12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace';
    el.style.zIndex = '120';
    document.body.appendChild(el);
  }
  return el;
}

function captureThumbnail(renderer, width = 512, height = 288) {
  try {
    const src = renderer.domElement;
    if (!src || src.width === 0 || src.height === 0) return null;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, width, height);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

class GpuTimer {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pending = [];
    this.active = null;
  }

  get supported() {
    return !!this.ext;
  }

  begin() {
    if (!this.ext || this.active) return;
    const q = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
    this.pending.push(q);
  }

  end() {
    if (!this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.active = null;
  }

  poll() {
    if (!this.ext) return [];
    const out = [];
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) return out;

    while (this.pending.length > 0) {
      const q = this.pending[0];
      const available = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT_AVAILABLE);
      if (!available) break;
      const ns = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT);
      out.push(ns / 1e6);
      this.gl.deleteQuery(q);
      this.pending.shift();
    }
    return out;
  }
}

class BloomBenchmarkRunner {
  constructor({
    graph,
    camera,
    renderer,
    bloomEffect,
    setRenderScale,
    setBloomEnabled,
  }) {
    this.graph = graph;
    this.camera = camera;
    this.renderer = renderer;
    this.bloomEffect = bloomEffect;
    this.setRenderScale = setRenderScale;
    this.setBloomEnabled = setBloomEnabled;

    this.config = {
      warmupMs: numberParam('benchWarmupMs', 3000),
      sampleMs: numberParam('benchSampleMs', 10000),
      orbitRadius: numberParam('benchOrbitRadius', 3.0),
      orbitHeight: numberParam('benchOrbitHeight', 0.8),
      orbitHeightAmp: numberParam('benchOrbitHeightAmp', 0.2),
      orbitPeriodSec: numberParam('benchOrbitPeriodSec', 14.0),
      assetUrl: PARAMS.get('benchAsset') || '/demo.spz',
      bloomIntensity: numberParam('benchIntensity', 1.5),
      bloomRadius: numberParam('benchRadius', 0.85),
      bloomThreshold: numberParam('benchThreshold', 0.20),
      thumbnailWidth: Math.round(numberParam('benchThumbW', 512)),
      thumbnailHeight: Math.round(numberParam('benchThumbH', 288)),
      loadTimeoutMs: Math.round(numberParam('benchLoadTimeoutMs', 0)),
    };

    this.phases = [
      { id: 'baseline_no_bloom', label: 'No Bloom', bloomEnabled: false },
      { id: 'pmndrs_bloom', label: 'Pmndrs Bloom', bloomEnabled: true },
    ];

    this.reportEl = ensureReportEl();
    this.timer = new GpuTimer(renderer);
    this.stageIndex = -1;
    this.stageStart = 0;
    this.prevFrameNow = null;
    this.stageFrameMs = [];
    this.stageCpuMs = [];
    this.stageGpuMs = [];
    this.stageResults = [];
    this.screenshots = {};
    this.ready = false;
    this.done = false;
    this.failed = false;
  }

  isActive() {
    return this.ready && !this.done && !this.failed;
  }

  statusLine() {
    if (this.failed) return 'BENCHMARK FAILED';
    if (this.done) return 'BENCHMARK DONE';
    if (!this.ready) return 'BENCHMARK LOADING';
    const stage = this.phases[this.stageIndex];
    const elapsed = performance.now() - this.stageStart;
    const total = this.config.warmupMs + this.config.sampleMs;
    const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
    return `BENCHMARK RUNNING: ${stage.label} (${pct}%)`;
  }

  setReportText(extra = '') {
    const lines = [this.statusLine()];
    if (extra) lines.push(extra);
    this.reportEl.textContent = lines.join('\n');
  }

  clearGraphObjects() {
    for (const n of this.graph._nodes) {
      if (n._splatMesh) {
        scene.remove(n._splatMesh);
        if (typeof n._splatMesh.dispose === 'function') n._splatMesh.dispose();
        n._splatMesh = null;
      }
      if (n._helper) {
        scene.remove(n._helper);
        n._helper = null;
      }
      if (n._model) {
        scene.remove(n._model);
        n._model = null;
      }
    }
  }

  buildBenchmarkGraph() {
    this.clearGraphObjects();
    this.graph.stop();
    if (typeof this.graph.clear === 'function') this.graph.clear();

    const nSource = LiteGraph.createNode('3dgs/SplatSource');
    const nMapGet = LiteGraph.createNode('3dgs/MapGet');
    const nMapSet = LiteGraph.createNode('3dgs/MapSet');
    const nSplatTf = LiteGraph.createNode('3dgs/SplatTransform');
    const nTransform = LiteGraph.createNode('Transform/Transform');
    const nRenderer = LiteGraph.createNode('3dgs/Renderer');

    nSource.pos = [60, 80];
    nMapGet.pos = [310, 80];
    nMapSet.pos = [830, 80];
    nSplatTf.pos = [1050, 80];
    nTransform.pos = [1050, 300];
    nRenderer.pos = [1300, 80];

    this.graph.add(nSource);
    this.graph.add(nMapGet);
    this.graph.add(nMapSet);
    this.graph.add(nSplatTf);
    this.graph.add(nTransform);
    this.graph.add(nRenderer);

    nSource.connect(0, nMapGet, 0);
    nMapGet.connect(0, nMapSet, 0);
    nMapGet.connect(1, nMapSet, 1);
    nMapGet.connect(2, nMapSet, 2);
    nMapGet.connect(3, nMapSet, 3);
    nMapGet.connect(5, nMapSet, 4);
    nMapSet.connect(0, nSplatTf, 0);
    nTransform.connect(0, nSplatTf, 1);
    nSplatTf.connect(0, nRenderer, 0);

    this.graph.start(1e8);
    return nSource;
  }

  async loadDefaultSplat() {
    const source = this.buildBenchmarkGraph();
    const fileName = extractFileName(this.config.assetUrl);
    source._loadFromUrl(this.config.assetUrl, fileName);

    await new Promise((resolve, reject) => {
      let timeout = null;
      if (this.config.loadTimeoutMs > 0) {
        timeout = setTimeout(() => {
          clearInterval(timer);
          reject(new Error(`Timeout loading ${this.config.assetUrl}`));
        }, this.config.loadTimeoutMs);
      }

      const timer = setInterval(() => {
        if (source._status === 'ready') {
          if (timeout) clearTimeout(timeout);
          clearInterval(timer);
          resolve();
          return;
        }
        if (source._status === 'error') {
          if (timeout) clearTimeout(timeout);
          clearInterval(timer);
          reject(new Error(`Failed to load ${this.config.assetUrl}`));
        }
      }, 100);
    });
  }

  applyFixedBloomParams() {
    if (!this.bloomEffect) return;
    // UBP API (replaces pmndrs API)
    this.bloomEffect.strength = this.config.bloomIntensity;
    this.bloomEffect.radius = this.config.bloomRadius;
    this.bloomEffect.threshold = this.config.bloomThreshold;
  }

  async init() {
    this.setReportText(`asset: ${this.config.assetUrl}`);
    this.setRenderScale(1);
    window.dispatchEvent(new Event('resize'));
    this.applyFixedBloomParams();

    await this.loadDefaultSplat();

    this.camera.position.set(this.config.orbitRadius, this.config.orbitHeight, 0);
    this.camera.lookAt(0, 0, 0);

    this.beginStage(0, performance.now());
    this.ready = true;
    this.setReportText();
  }

  beginStage(index, now) {
    this.stageIndex = index;
    this.stageStart = now;
    this.prevFrameNow = null;
    this.stageFrameMs = [];
    this.stageCpuMs = [];
    this.stageGpuMs = [];
    this.setBloomEnabled(this.phases[index].bloomEnabled);
    this.applyFixedBloomParams();
    this.setReportText();
  }

  updateCamera(now) {
    const t = now / 1000;
    const orbitT = (Math.PI * 2 * t) / this.config.orbitPeriodSec;
    const x = Math.cos(orbitT) * this.config.orbitRadius;
    const z = Math.sin(orbitT) * this.config.orbitRadius;
    const y = this.config.orbitHeight + Math.sin(orbitT * 0.5) * this.config.orbitHeightAmp;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  beginFrame(now) {
    if (!this.isActive()) return;
    this.updateCamera(now);
    if (this.timer.supported) this.timer.begin();
  }

  endFrame(now, cpuRenderMs) {
    if (!this.isActive()) return;
    if (this.timer.supported) this.timer.end();

    const elapsed = now - this.stageStart;
    const frameMs = this.prevFrameNow == null ? null : Math.max(0, now - this.prevFrameNow);
    this.prevFrameNow = now;

    const readyGpu = this.timer.supported ? this.timer.poll() : [];
    const collecting = elapsed >= this.config.warmupMs;
    if (collecting) {
      if (frameMs != null) this.stageFrameMs.push(frameMs);
      this.stageCpuMs.push(cpuRenderMs);
      if (readyGpu.length) this.stageGpuMs.push(...readyGpu);
    }

    const total = this.config.warmupMs + this.config.sampleMs;
    if (elapsed >= total) {
      this.finalizeStage();
      if (this.stageIndex + 1 < this.phases.length) {
        this.beginStage(this.stageIndex + 1, now);
      } else {
        this.finalizeBenchmark();
      }
    } else {
      this.setReportText();
    }
  }

  finalizeStage() {
    const stage = this.phases[this.stageIndex];
    const frameSummary = summarize(this.stageFrameMs);
    const cpuSummary = summarize(this.stageCpuMs);
    const gpuSummary = summarize(this.stageGpuMs);
    const fpsAvg = frameSummary.avg ? 1000 / frameSummary.avg : null;

    const shot = captureThumbnail(this.renderer, this.config.thumbnailWidth, this.config.thumbnailHeight);
    const shotKey = shot ? `${stage.id}_thumb` : null;
    if (shot && shotKey) this.screenshots[shotKey] = shot;

    this.stageResults.push({
      id: stage.id,
      label: stage.label,
      bloomEnabled: stage.bloomEnabled,
      fps: {
        avg: fpsAvg,
      },
      frameMs: frameSummary,
      cpuRenderMs: cpuSummary,
      gpuRenderMs: gpuSummary,
      renderer: readRendererStats(this.renderer),
      screenshotKey: shotKey,
    });
  }

  finalizeBenchmark() {
    this.done = true;
    this.setBloomEnabled(true);
    this.applyFixedBloomParams();

    const base = this.stageResults.find((s) => s.id === 'baseline_no_bloom');
    const bloom = this.stageResults.find((s) => s.id === 'pmndrs_bloom');
    const delta = base && bloom ? {
      fpsDropPct: safeDropPct(base.fps.avg, bloom.fps.avg),
      frameMsIncreasePct: safePct(base.frameMs.avg, bloom.frameMs.avg),
      cpuRenderMsIncreasePct: safePct(base.cpuRenderMs.avg, bloom.cpuRenderMs.avg),
      gpuRenderMsIncreasePct: safePct(base.gpuRenderMs.avg, bloom.gpuRenderMs.avg),
    } : null;

    const report = {
      generatedAt: new Date().toISOString(),
      config: this.config,
      gpuTimerSupported: this.timer.supported,
      stages: this.stageResults,
      delta,
      estimatedDevices: buildDeviceProjection(base, bloom),
      screenshotKeys: Object.keys(this.screenshots),
    };

    window.__BLOOM_BENCH_RESULT = report;
    window.__BLOOM_BENCH_SHOTS = this.screenshots;

    const json = JSON.stringify(report, null, 2);
    this.reportEl.textContent = `BENCHMARK_JSON_START\n${json}\nBENCHMARK_JSON_END`;
    console.log('BENCHMARK_JSON_START');
    console.log(json);
    console.log('BENCHMARK_JSON_END');
  }

  fail(error) {
    this.failed = true;
    const message = error instanceof Error ? error.message : String(error);
    const payload = {
      generatedAt: new Date().toISOString(),
      error: message,
    };
    window.__BLOOM_BENCH_ERROR = payload;
    const json = JSON.stringify(payload, null, 2);
    this.reportEl.textContent = `BENCHMARK_JSON_START\n${json}\nBENCHMARK_JSON_END`;
    console.error('Benchmark failed:', error);
  }
}

export async function createBloomBenchmarkRunner(deps) {
  if (!BENCHMARK_MODE) return null;
  const runner = new BloomBenchmarkRunner(deps);
  try {
    await runner.init();
    return runner;
  } catch (err) {
    runner.fail(err);
    return runner;
  }
}
