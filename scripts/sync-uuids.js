#!/usr/bin/env node
/**
 * UUID Registry Manager
 *
 * Scans all node registrations in src/nodes/, generates missing UUIDs,
 * detects collisions, and writes src/node-uuid-registry.json.
 *
 * Usage:
 *   node scripts/sync-uuids.js          # scan + generate missing + write
 *   node scripts/sync-uuids.js --check  # validate only, exit 1 if out of sync
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const REGISTRY_PATH = join(ROOT, 'src', 'node-uuid-registry.json');
const NODES_DIR = join(ROOT, 'src', 'nodes');

// ── Scan source files for LiteGraph.registerNodeType calls ──
function scanNodeTypes() {
  const types = new Map(); // path → { file, line }

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!entry.endsWith('.js')) continue;

      const content = readFileSync(full, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        // Match: LiteGraph.registerNodeType('path', Constructor);
        const m = lines[i].match(/LiteGraph\.registerNodeType\(\s*['"]([^'"]+)['"]/);
        if (!m) continue;

        // Skip dynamic paths (line contains string concatenation with +)
        const afterRegister = lines[i].slice(lines[i].indexOf('registerNodeType'));
        if (afterRegister.includes('+')) continue;

        const typePath = m[1];
        if (typePath.includes('${')) continue;

        const relFile = relative(ROOT, full).replace(/\\/g, '/');
        types.set(typePath, { file: relFile, line: i + 1 });
      }

      // Handle dynamic registrations: '3dgs/GPU/math/' + name + ' (GPU)'
      // Extract from UUID_MAP or FUNC_UUIDS style objects
      const funcArrayMatch = content.match(/const FUNCS\s*=\s*\[([\s\S]*?)\];/);
      if (funcArrayMatch) {
        const names = [...funcArrayMatch[1].matchAll(/name:\s*'(\w+)'/g)].map(m => m[1]);
        // Detect prefix pattern from the registerNodeType call
        const regMatch = content.match(/registerNodeType\(\s*['"]([^'"]*)['"]\s*\+\s*name\s*\+\s*['"]([^'"]*)['"]/);
        if (regMatch) {
          const [, prefix, suffix] = regMatch;
          for (const name of names) {
            const typePath = prefix + name + suffix;
            const relFile = relative(ROOT, full).replace(/\\/g, '/');
            types.set(typePath, { file: relFile, line: 0 });
          }
        }
      }

      // Handle factory-generated nodes: detect from CONST_UUIDS/BRIDGE_UUIDS keys
      // or from createGpuConstNode({ name: 'Float', ... }) calls
      const factoryNames = [...content.matchAll(/createGpuConstNode\(\{[\s\S]*?name:\s*'(\w+)'/g)].map(m => m[1]);
      for (const name of factoryNames) {
        const typePath = `3dgs/GPU/math/${name} (GPU)`;
        const relFile = relative(ROOT, full).replace(/\\/g, '/');
        types.set(typePath, { file: relFile, line: 0 });
      }

      const bridgeNames = [...content.matchAll(/createBridgeNode\(\{[\s\S]*?name:\s*'(\w+)'/g)].map(m => m[1]);
      for (const name of bridgeNames) {
        const typePath = `Bridge/${name}`;
        const relFile = relative(ROOT, full).replace(/\\/g, '/');
        types.set(typePath, { file: relFile, line: 0 });
      }
    }
  }

  walk(NODES_DIR);
  return types;
}

// ── Load existing registry ──
function loadRegistry() {
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

// ── Main ──
const checkOnly = process.argv.includes('--check');
const types = scanNodeTypes();
const registry = loadRegistry();

let changed = false;
let errors = 0;

// Add missing entries
for (const [typePath] of types) {
  if (!registry[typePath]) {
    registry[typePath] = randomUUID();
    console.log(`  + ${typePath} → ${registry[typePath]}`);
    changed = true;
  }
}

// Warn about registry entries that no longer exist in code
for (const typePath of Object.keys(registry)) {
  if (!types.has(typePath)) {
    console.log(`  ? ${typePath} — in registry but not found in code (kept)`);
  }
}

// Check for UUID collisions
const uuidToPath = new Map();
for (const [typePath, uuid] of Object.entries(registry)) {
  if (uuidToPath.has(uuid)) {
    console.error(`  ✗ COLLISION: ${uuid}`);
    console.error(`    → ${uuidToPath.get(uuid)}`);
    console.error(`    → ${typePath}`);
    errors++;
  }
  uuidToPath.set(uuid, typePath);
}

// Sort registry by path for stable diffs
const sorted = {};
for (const key of Object.keys(registry).sort()) {
  sorted[key] = registry[key];
}

if (checkOnly) {
  if (changed) {
    console.error('\nRegistry is out of sync. Run: node scripts/sync-uuids.js');
    process.exit(1);
  }
  if (errors) {
    console.error(`\n${errors} UUID collision(s) found.`);
    process.exit(1);
  }
  console.log(`\n✓ Registry OK (${Object.keys(sorted).length} entries)`);
} else {
  writeFileSync(REGISTRY_PATH, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`\n✓ Wrote ${REGISTRY_PATH} (${Object.keys(sorted).length} entries)`);
  if (errors) {
    console.error(`⚠ ${errors} collision(s) — fix manually or delete duplicates and re-run`);
    process.exit(1);
  }
}
