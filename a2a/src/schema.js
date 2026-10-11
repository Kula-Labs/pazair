// A small JSON Schema checker for the schemas in ../schemas (draft 2020-12 subset). Zero dependencies, no file system
// (loadSchemas, which reads the folder, is in ./node.js).
// Supports: type, required, properties, additionalProperties (boolean), enum, const, pattern, minimum, maximum,
// exclusiveMinimum, minLength, minItems, maxItems, items, oneOf, anyOf, $ref within a file and to another file of the registry (loadSchemas). Enough to check every object this package
// defines; a full validator (ajv and others) accepts the same schemas.

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function resolve(ref, root, registry) {
  const [file, pointer = ''] = ref.split('#');
  let base = root;
  if (file) {
    base = registry[file] ?? registry[file.split('/').pop()];
    if (!base) throw new Error(`unknown schema ${file}`);
  }
  const target = pointer.replace(/^\//, '').split('/').filter(Boolean).reduce((o, k) => o?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], base);
  if (target === undefined) throw new Error(`unresolved $ref ${ref}`);
  return { schema: target, root: base };
}


/** Returns a list of problems as "<path>: <what>"; empty when the value conforms. */
export function problems(value, schema, registry = {}, root = schema, path = '$') {
  const out = [];
  if (path === '$') { try { return problemsInner(value, schema, registry, root, path); } catch (e) { return [`$: schema error: ${e.message}`]; } }
  return problemsInner(value, schema, registry, root, path);
}

function problemsInner(value, schema, registry, root, path) {
  const out = [];
  if (schema === true) return out;
  if (schema === false) return [`${path}: not allowed`];
  if (schema.$ref) { const r = resolve(schema.$ref, root, registry); return problemsInner(value, r.schema, registry, r.root, path); }
  const sub = (v, s, p) => problemsInner(v, s, registry, root, p);
  const t = typeOf(value);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((x) => x === t || (x === 'number' && t === 'integer'))) return [`${path}: expected ${types.join('|')}, got ${t}`];
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) out.push(`${path}: not one of ${JSON.stringify(schema.enum)}`);
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) out.push(`${path}: must be ${JSON.stringify(schema.const)}`);
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) out.push(`${path}: does not match ${schema.pattern}`);
  if (typeof value === 'string' && schema.minLength !== undefined && value.length < schema.minLength) out.push(`${path}: shorter than ${schema.minLength}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${path}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${path}: above ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) out.push(`${path}: not above ${schema.exclusiveMinimum}`);
  }
  if (t === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) out.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) out.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => out.push(...sub(v, schema.items, `${path}[${i}]`)));
  }
  if (t === 'object') {
    for (const k of schema.required ?? []) if (!(k in value)) out.push(`${path}.${k}: required`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) out.push(...sub(v, schema.properties[k], `${path}.${k}`));
      else if (schema.additionalProperties === false) out.push(`${path}.${k}: not allowed`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') out.push(...sub(v, schema.additionalProperties, `${path}.${k}`));
    }
  }
  for (const key of ['oneOf', 'anyOf']) {
    if (!schema[key]) continue;
    const hits = schema[key].map((s) => sub(value, s, path)).filter((p) => p.length === 0).length;
    if (hits === 0) out.push(`${path}: matches none of ${key}`);
    if (key === 'oneOf' && hits > 1) out.push(`${path}: matches ${hits} of oneOf`);
  }
  return out;
}

export const conforms = (value, schema, registry) => problems(value, schema, registry).length === 0;
