import { LiteGraph } from 'litegraph.js';
import { scene } from './scene.js';
import { cacheSplatFile, clearDirty } from './graph-manager.js';
import { resolveUUIDs, injectUUIDs, getUUID } from './node-uuid.js';

// Dependencies injected via init
let _graph = null;
let _lgCanvas = null;
let _repairSubgraphLinks = null;

// ── Save format migration ────────────────────────────────
function applyTypeMap(nodes, map) {
  for (const n of nodes) {
    if (map[n.type] !== undefined) {
      if (map[n.type] === null) n._deleted = true;
      else n.type = map[n.type];
    }
    // Recurse into subgraph inner nodes
    if (n.subgraph?.nodes) {
      n.subgraph.nodes = applyTypeMap(n.subgraph.nodes, map);
    }
  }
  return nodes.filter(n => !n._deleted);
}

function migrateGraph(save) {
  const ver = save.version || 1;
  const graphData = save.graph || save;
  if (!graphData.nodes) return graphData;

  // v1 → v2: GPU path rename + old Transform = SplatTransform
  if (ver < 2) {
    graphData.nodes = applyTypeMap(graphData.nodes, {
      '3dgs/math/Float': '3dgs/GPU/math/Float (GPU)',
      '3dgs/math/Vec2': '3dgs/GPU/math/Vec2 (GPU)',
      '3dgs/math/Vec3': '3dgs/GPU/math/Vec3 (GPU)',
      '3dgs/math/Vec4': '3dgs/GPU/math/Vec4 (GPU)',
      '3dgs/math/Math': '3dgs/GPU/math/Math (GPU)',
      '3dgs/math/Vec3Math': '3dgs/GPU/math/Vec3Math (GPU)',
      '3dgs/math/Vec4Math': '3dgs/GPU/math/Vec4Math (GPU)',
      '3dgs/math/Time': '3dgs/GPU/math/Time (GPU)',
      '3dgs/math/Remap': '3dgs/GPU/math/Remap (GPU)',
      '3dgs/math/Step': '3dgs/GPU/math/Step (GPU)',
      '3dgs/math/HashFloat': '3dgs/GPU/math/HashFloat (GPU)',
      '3dgs/math/Sin': '3dgs/GPU/math/Sin (GPU)',
      '3dgs/math/Cos': '3dgs/GPU/math/Cos (GPU)',
      '3dgs/math/Abs': '3dgs/GPU/math/Abs (GPU)',
      '3dgs/math/Fract': '3dgs/GPU/math/Fract (GPU)',
      '3dgs/math/Floor': '3dgs/GPU/math/Floor (GPU)',
      '3dgs/math/Ceil': '3dgs/GPU/math/Ceil (GPU)',
      '3dgs/math/Sqrt': '3dgs/GPU/math/Sqrt (GPU)',
      '3dgs/math/Neg': '3dgs/GPU/math/Neg (GPU)',
      '3dgs/utility/SplitVec2': '3dgs/GPU/utility/BreakVec2 (GPU)',
      '3dgs/utility/SplitVec3': '3dgs/GPU/utility/BreakVec3 (GPU)',
      '3dgs/utility/SplitVec4': '3dgs/GPU/utility/BreakVec4 (GPU)',
      '3dgs/utility/MakeVec2': '3dgs/GPU/utility/MakeVec2 (GPU)',
      '3dgs/utility/MakeVec3': '3dgs/GPU/utility/MakeVec3 (GPU)',
      '3dgs/utility/MakeVec4': '3dgs/GPU/utility/MakeVec4 (GPU)',
      '3dgs/utility/AnimatedFloat': null,
      '3dgs/Transform': '3dgs/SplatTransform',
    });
  }

  // v2 → v3: category reorganization
  if (ver < 3) {
    graphData.nodes = applyTypeMap(graphData.nodes, {
      '3dgs/Transform': 'Transform/Transform',
      '3dgs/3D Model': '3D Model/3D Model',
      '3dgs/Subgraph': 'Subgraph/Subgraph',
      '3dgs/subgraph/Input': 'Subgraph/Input',
      '3dgs/subgraph/Output': 'Subgraph/Output',
      '3dgs/bridge/FloatToGPU': 'Bridge/FloatToGPU',
      '3dgs/bridge/Vec3ToGPU': 'Bridge/Vec3ToGPU',
      '3dgs/CPU/utility/BreakTransform': 'CPU/utility/BreakTransform (CPU)',
      '3dgs/CPU/utility/MakeTransform': 'CPU/utility/MakeTransform (CPU)',
      '3dgs/CPU/utility/BreakTransform (CPU)': 'CPU/utility/BreakTransform (CPU)',
      '3dgs/CPU/utility/MakeTransform (CPU)': 'CPU/utility/MakeTransform (CPU)',
      '3dgs/CPU/utility/BreakVec3 (CPU)': 'CPU/utility/BreakVec3 (CPU)',
      '3dgs/CPU/utility/MakeVec3 (CPU)': 'CPU/utility/MakeVec3 (CPU)',
      '3dgs/CPU/math/Float (CPU)': 'CPU/math/Float (CPU)',
      '3dgs/CPU/math/Vec3 (CPU)': 'CPU/math/Vec3 (CPU)',
      '3dgs/CPU/math/Math (CPU)': 'CPU/math/Math (CPU)',
      '3dgs/CPU/math/Vec3Math (CPU)': 'CPU/math/Vec3Math (CPU)',
      '3dgs/CPU/math/RotateVec3 (CPU)': 'CPU/math/RotateVec3 (CPU)',
      '3dgs/CPU/math/Sin (CPU)': 'CPU/math/Sin (CPU)',
      '3dgs/CPU/math/Cos (CPU)': 'CPU/math/Cos (CPU)',
      '3dgs/CPU/math/Time (CPU)': 'CPU/math/Time (CPU)',
      '3dgs/CPU/math/Lerp (CPU)': 'CPU/math/Lerp (CPU)',
    });
  }

  return graphData;
}

// ── Repair subgraph links (re-exported from graph-manager) ──
function _repair(graphData) {
  if (_repairSubgraphLinks) _repairSubgraphLinks(graphData);
}

export function initProjectIO(graph, lgCanvas, { repairSubgraphLinks }) {
  _graph = graph;
  _lgCanvas = lgCanvas;
  _repairSubgraphLinks = repairSubgraphLinks;

  const fileDropdown = document.getElementById('file-dropdown');

  // ── Quick load (auto-creates SplatSource node) ─────────────
  document.getElementById('btn-load').addEventListener('click', () => {
    fileDropdown.classList.remove('open');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.splat,.ply,.spz';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const existing = _graph._nodes.filter(n => n.type === '3dgs/SplatSource').length;
      const rowY = 60 + existing * 200;

      const nSource    = LiteGraph.createNode('3dgs/SplatSource');
      const nMapGet    = LiteGraph.createNode('3dgs/MapGet');
      const nMapSet    = LiteGraph.createNode('3dgs/MapSet');
      const nSplatTf   = LiteGraph.createNode('3dgs/SplatTransform');
      const nTransform = LiteGraph.createNode('Transform/Transform');
      const nRenderer  = LiteGraph.createNode('3dgs/Renderer');

      nSource.pos    = [60,   rowY];
      nMapGet.pos    = [310,  rowY];
      nMapSet.pos    = [830,  rowY];
      nSplatTf.pos   = [1050, rowY];
      nTransform.pos = [1050, rowY + 220];
      nRenderer.pos  = [1300, rowY];

      _graph.add(nSource);
      _graph.add(nMapGet);
      _graph.add(nMapSet);
      _graph.add(nSplatTf);
      _graph.add(nTransform);
      _graph.add(nRenderer);

      nSource.connect(0, nMapGet, 0);
      nMapGet.connect(0, nMapSet, 0);
      nMapGet.connect(1, nMapSet, 1);
      nMapGet.connect(2, nMapSet, 2);
      nMapGet.connect(3, nMapSet, 3);
      nMapGet.connect(5, nMapSet, 4);
      nMapSet.connect(0, nSplatTf, 0);
      nTransform.connect(0, nSplatTf, 1);
      nSplatTf.connect(0, nRenderer, 0);

      cacheSplatFile(file.name, file);
      nSource._load(file);
    };
    input.click();
  });

  // ── File dropdown toggle ─────────────────────────────────
  document.getElementById('btn-file').addEventListener('click', () => {
    fileDropdown.classList.toggle('open');
  });

  // ── Demos ────────────────────────────────────────────────
  const ASSETS = 'https://jimmy107041131.github.io/3dgs-vfx-assets';
  const DEMOS = [
    {
      name: 'Star Ocean',
      json: `${ASSETS}/StarOcean/StarOcean.json`,
      splats: [{ name: 'Ocean_High.spz', url: `${ASSETS}/StarOcean/Ocean_High.spz` }],
    },
  ];

  const demosDropdown = document.getElementById('demos-dropdown');
  const btnDemos     = document.getElementById('btn-demos');

  function buildDemosDropdown() {
    demosDropdown.innerHTML = '';
    if (DEMOS.length === 0) {
      const el = document.createElement('div');
      el.className = 'demo-empty';
      el.textContent = 'No demos available yet';
      demosDropdown.appendChild(el);
      return;
    }
    DEMOS.forEach((demo, i) => {
      const btn = document.createElement('button');
      btn.className = 'dropdown-item';
      btn.textContent = demo.name;
      btn.addEventListener('click', () => { loadDemo(i); demosDropdown.classList.remove('open'); });
      demosDropdown.appendChild(btn);
    });
  }
  buildDemosDropdown();

  btnDemos.addEventListener('click', () => {
    demosDropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#demos-wrapper')) demosDropdown.classList.remove('open');
    if (!e.target.closest('#file-wrapper'))  fileDropdown.classList.remove('open');
  });

  // Loading overlay helpers
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingBar     = document.getElementById('loading-bar');
  const loadingPercent = document.getElementById('loading-percent');
  const loadingText    = document.getElementById('loading-text');

  function showLoading(name) {
    loadingText.textContent = `Loading ${name}...`;
    loadingBar.style.width = '0%';
    loadingPercent.textContent = '0%';
    loadingOverlay.classList.add('active');
  }
  function updateLoading(progress) {
    const pct = Math.min(100, Math.round(progress * 100));
    loadingBar.style.width = pct + '%';
    loadingPercent.textContent = pct + '%';
  }
  function hideLoading() {
    loadingOverlay.classList.remove('active');
  }

  async function loadDemo(index) {
    const demo = DEMOS[index];
    if (!demo) return;

    btnDemos.textContent = 'Loading…';
    btnDemos.disabled = true;
    showLoading(demo.name);

    try {
      const jsonRes = await fetch(demo.json);
      if (!jsonRes.ok) throw new Error('Failed to fetch project JSON');

      const save     = await jsonRes.json();
      const graphData = migrateGraph(save);
      resolveUUIDs(graphData);

      _graph._nodes.forEach(n => {
        if (n._splatMesh) { scene.remove(n._splatMesh); n._splatMesh = null; }
      });
      _graph.stop();
      _graph.configure(graphData);
      _repair(graphData);
      _graph.start(1e8);
      _lgCanvas.setDirty(true, true);

      const sources = _graph._nodes.filter(n => n.type === '3dgs/SplatSource');
      const unmatched = [];
      const loadPromises = [];
      for (const node of sources) {
        const splatInfo = demo.splats.find(s => s.name === node._fileName);
        if (splatInfo) {
          node._loadFromUrl(splatInfo.url, splatInfo.name, updateLoading);
          loadPromises.push(new Promise(resolve => {
            const check = setInterval(() => {
              if (node._status === 'ready' || node._status === 'error') {
                clearInterval(check);
                resolve();
              }
            }, 200);
          }));
        } else if (node._fileName) {
          unmatched.push(node._fileName);
        }
      }
      await Promise.all(loadPromises);
      hideLoading();
      if (unmatched.length > 0) {
        alert('Missing splat files in demo:\n\n' + unmatched.join('\n'));
      }
    } catch (err) {
      alert('Failed to load demo: ' + err.message);
    } finally {
      btnDemos.textContent = 'Demos ▾';
      btnDemos.disabled = false;
    }
  }

  // ── Save graph JSON ──────────────────────────────────────
  document.getElementById('btn-save').addEventListener('click', () => {
    fileDropdown.classList.remove('open');
    const data = _graph.serialize();
    if (data.links && data.nodes) {
      const usedLinks = new Set();
      for (const n of data.nodes) {
        if (n.inputs) n.inputs.forEach(inp => { if (inp.link != null) usedLinks.add(inp.link); });
        if (n.outputs) n.outputs.forEach(out => { if (out.links) out.links.forEach(l => usedLinks.add(l)); });
      }
      data.links = data.links.filter(l => l && usedLinks.has(l[0]));
    }
    const splatFiles = _graph._nodes
      .filter(n => n.type === '3dgs/SplatSource' && n._fileName)
      .map(n => n._fileName);
    if (data.nodes) {
      for (const n of data.nodes) {
        n._v = 1;
      }
    }
    injectUUIDs(data);
    const save = { version: 4, splatFiles, graph: data };
    const blob = new Blob([JSON.stringify(save)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '3dgs-project.json';
    a.click();
    clearDirty();
  });

  // ── Open project (select folder containing JSON + splat files) ──
  document.getElementById('btn-open').addEventListener('click', () => {
    fileDropdown.classList.remove('open');
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      const jsonFile = files.find(f => f.name.endsWith('.json'));
      const splatFiles = files.filter(f => /\.(splat|ply|spz)$/i.test(f.name));

      if (!jsonFile) {
        alert('No .json project file found in the selected folder');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const save = JSON.parse(reader.result);
          const graphData = migrateGraph(save);
          resolveUUIDs(graphData);

          _graph._nodes.forEach(n => {
            if (n._splatMesh) { scene.remove(n._splatMesh); n._splatMesh = null; }
          });
          _graph.stop();
          _graph.configure(graphData);
          _repair(graphData);
          _graph.start(1e8);
          _lgCanvas.setDirty(true, true);

          const sources = _graph._nodes.filter(n => n.type === '3dgs/SplatSource');
          const unmatched = [];
          for (const node of sources) {
            const match = splatFiles.find(f => f.name === node._fileName);
            if (match) {
              cacheSplatFile(match.name, match);
              node._load(match);
            } else if (node._fileName) {
              unmatched.push(node._fileName);
            }
          }
          if (unmatched.length > 0) {
            alert('These splat files were not found in the folder:\n\n' + unmatched.join('\n') + '\n\nUse "Load File" on each node to load them manually.');
          }
        } catch (err) {
          alert('Failed to load project: ' + err.message);
        }
      };
      reader.readAsText(jsonFile);
    };
    input.click();
  });

  // ── Import Subgraph ────────────────────────────────────
  document.getElementById('btn-import-subgraph').addEventListener('click', () => {
    fileDropdown.classList.remove('open');
    importSubgraph();
  });
}

// ── Export single subgraph node ─────────────────────────
export function exportSubgraph(node) {
  const nodeData = node.serialize();
  delete nodeData.id;
  nodeData.pos = [0, 0];
  injectUUIDs({ nodes: [nodeData] });
  if (nodeData.subgraph) injectUUIDs(nodeData.subgraph);
  const save = {
    type: 'dyno-subgraph',
    version: 1,
    title: node.title || 'Subgraph',
    nodeData,
  };
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (node.title || 'subgraph').replace(/[^a-zA-Z0-9_\-]/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Import subgraph from .json file ─────────────────────
function importSubgraph() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const save = JSON.parse(reader.result);
        if (save.type !== 'dyno-subgraph') {
          alert('Not a valid subgraph file');
          return;
        }
        const nodeData = save.nodeData;

        // Resolve UUIDs to current paths
        resolveUUIDs({ nodes: [nodeData] });
        if (nodeData.subgraph) resolveUUIDs(nodeData.subgraph);

        const node = LiteGraph.createNode('Subgraph/Subgraph');
        if (!node) { alert('Subgraph node type not registered'); return; }

        // Position at center of visible canvas area
        const area = _lgCanvas.visible_area;
        node.pos = [
          area[0] + area[2] / 2 - (nodeData.size?.[0] ?? 200) / 2,
          area[1] + area[3] / 2 - (nodeData.size?.[1] ?? 100) / 2,
        ];

        _graph.add(node);
        node.configure(nodeData);
        node.title = save.title || nodeData.title || 'Imported';

        // Repair inner subgraph links
        if (nodeData.subgraph) {
          repairInnerSubgraph(node, nodeData.subgraph);
        }

        _lgCanvas.setDirty(true, true);
      } catch (err) {
        alert('Failed to import subgraph: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function repairInnerSubgraph(subgraphNode, sgData) {
  const sg = subgraphNode.subgraph;
  if (!sg || !sgData.links || !sgData.nodes) return;

  const usedLinks = new Set();
  for (const n of sgData.nodes) {
    if (n.inputs) n.inputs.forEach(inp => { if (inp.link != null) usedLinks.add(inp.link); });
    if (n.outputs) n.outputs.forEach(out => { if (out.links) out.links.forEach(l => usedLinks.add(l)); });
  }

  for (const link of sgData.links) {
    if (!link) continue;
    const [linkId, originId, originSlot, targetId, targetSlot] =
      Array.isArray(link) ? link : [link.id, link.origin_id, link.origin_slot, link.target_id, link.target_slot];
    if (!usedLinks.has(linkId)) continue;

    const originNode = sg.getNodeById(originId);
    const targetNode = sg.getNodeById(targetId);
    if (!originNode || !targetNode) continue;

    const inputOk  = targetNode.inputs?.[targetSlot]?.link === linkId;
    const outputOk = originNode.outputs?.[originSlot]?.links?.includes(linkId);
    if (inputOk && outputOk && sg.links[linkId]) continue;

    originNode.connect(originSlot, targetNode, targetSlot);
  }
}
