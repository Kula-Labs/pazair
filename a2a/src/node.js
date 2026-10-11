// Node-only helpers: everything that touches the file system lives here, so ./index.js stays portable.
import { readFileSync, readdirSync } from 'node:fs';

/** Load every schema of a folder (default: ../schemas) into a registry keyed by file name, for cross-file $ref in problems(). */
export function loadSchemas(dir = new URL('../schemas/', import.meta.url)) {
  const registry = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) registry[f] = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  return registry;
}

/** The reference policy and the transition policy of ../policy. */
export const loadPolicy = (name = 'gateway-policy') => JSON.parse(readFileSync(new URL(`../policy/${name}.json`, import.meta.url), 'utf8'));
