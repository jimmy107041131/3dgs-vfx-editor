// ── Node UUID Registry ──────────────────────────────────────
// Decouples save-file identity from LiteGraph type paths.
// UUID is permanent; paths can be renamed freely.
//
// UUIDs are managed by: node scripts/sync-uuids.js
// Source of truth:       src/node-uuid-registry.json

import registry from './node-uuid-registry.json';

const _uuidToPath = new Map();
const _pathToUuid = new Map();

// Build bidirectional maps from the JSON registry
for (const [path, uuid] of Object.entries(registry)) {
  _uuidToPath.set(uuid, path);
  _pathToUuid.set(path, uuid);
}

/** path → uuid (for serialization) */
export function getUUID(path) {
  return _pathToUuid.get(path) ?? null;
}

/** uuid → path (for deserialization) */
export function getPathByUUID(uuid) {
  return _uuidToPath.get(uuid) ?? null;
}

/**
 * Resolve _uuid fields in serialized graph data to current paths.
 * Call before graph.configure(). Mutates graphData in place.
 */
export function resolveUUIDs(graphData) {
  if (!graphData?.nodes) return;
  for (const n of graphData.nodes) {
    if (n._uuid) {
      const path = getPathByUUID(n._uuid);
      if (path) n.type = path;
    }
    if (n.subgraph) resolveUUIDs(n.subgraph);
  }
}

/**
 * Inject _uuid fields into serialized graph data.
 * Call after graph.serialize(), before saving to JSON.
 */
export function injectUUIDs(graphData) {
  if (!graphData?.nodes) return;
  for (const n of graphData.nodes) {
    const uuid = getUUID(n.type);
    if (uuid) n._uuid = uuid;
    if (n.subgraph) injectUUIDs(n.subgraph);
  }
}
