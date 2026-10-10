// Breaking-change detection between two OpenAPI 3.x documents (JSON).
//
// Scope (deliberately small and deterministic):
// - removed paths and operations
// - added required parameters, parameters that became required
// - request bodies that became required, new required request properties
// - removed 2xx response codes, removed properties from 2xx JSON responses
// Only local "#/components/..." $refs are resolved.

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function resolve(doc, node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 10) return node;
  if (typeof node.$ref === 'string' && node.$ref.startsWith('#/')) {
    const target = node.$ref.slice(2).split('/').reduce((n, k) => n?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], doc);
    return resolve(doc, target, depth + 1);
  }
  return node;
}

function params(doc, pathItem, op) {
  const map = new Map();
  for (const p of [...(pathItem.parameters ?? []), ...(op.parameters ?? [])]) {
    const r = resolve(doc, p);
    if (r?.name && r?.in) map.set(`${r.in}:${r.name}`, r);
  }
  return map;
}

function jsonSchema(doc, content) {
  const media = content?.['application/json'] ?? Object.entries(content ?? {}).find(([k]) => k.endsWith('+json'))?.[1];
  return resolve(doc, media?.schema);
}

function properties(doc, schema) {
  const s = resolve(doc, schema);
  if (!s) return { props: new Set(), required: new Set() };
  if (s.type === 'array' && s.items) return properties(doc, s.items);
  const props = new Set(Object.keys(s.properties ?? {}));
  const required = new Set(s.required ?? []);
  for (const part of s.allOf ?? []) {
    const sub = properties(doc, part);
    sub.props.forEach((p) => props.add(p));
    sub.required.forEach((p) => required.add(p));
  }
  return { props, required };
}

export function diffContracts(oldDoc, newDoc) {
  const changes = [];
  const add = (severity, rule, where, message) => changes.push({ severity, rule, where, message });
  for (const [label, d] of [['old', oldDoc], ['new', newDoc]]) {
    if (!d || typeof d !== 'object' || typeof d.openapi !== 'string' || !d.openapi.startsWith('3.')) {
      throw new Error(`${label} document is not an OpenAPI 3.x JSON document`);
    }
  }
  const oldPaths = oldDoc.paths ?? {};
  const newPaths = newDoc.paths ?? {};

  for (const [p, oldItem] of Object.entries(oldPaths)) {
    const newItem = newPaths[p];
    if (!newItem) {
      add('breaking', 'path-removed', p, `Path ${p} was removed.`);
      continue;
    }
    for (const m of METHODS) {
      const oldOp = oldItem[m];
      if (!oldOp) continue;
      const where = `${m.toUpperCase()} ${p}`;
      const newOp = newItem[m];
      if (!newOp) {
        add('breaking', 'operation-removed', where, `${where} was removed.`);
        continue;
      }
      const oldParams = params(oldDoc, oldItem, oldOp);
      for (const [key, np] of params(newDoc, newItem, newOp)) {
        const op = oldParams.get(key);
        if (!op && np.required) add('breaking', 'parameter-required-added', where, `New required ${np.in} parameter "${np.name}".`);
        else if (op && !op.required && np.required) add('breaking', 'parameter-became-required', where, `${np.in} parameter "${np.name}" became required.`);
      }
      for (const [key, op] of oldParams) {
        if (!params(newDoc, newItem, newOp).has(key)) add('breaking', 'parameter-removed', where, `${op.in} parameter "${op.name}" was removed.`);
      }

      const oldBody = resolve(oldDoc, oldOp.requestBody);
      const newBody = resolve(newDoc, newOp.requestBody);
      if (newBody?.required && !oldBody?.required) add('breaking', 'request-body-required', where, 'Request body became required.');
      if (newBody) {
        const before = properties(oldDoc, jsonSchema(oldDoc, oldBody?.content));
        const after = properties(newDoc, jsonSchema(newDoc, newBody.content));
        for (const r of after.required) {
          if (!before.required.has(r)) add('breaking', 'request-property-required', where, `Request property "${r}" is now required.`);
        }
      }

      for (const [code, oldRes] of Object.entries(oldOp.responses ?? {})) {
        if (!/^2\d\d$/.test(code)) continue;
        const newRes = newOp.responses?.[code];
        if (!newRes) {
          add('breaking', 'response-removed', where, `Success response ${code} was removed.`);
          continue;
        }
        const before = properties(oldDoc, jsonSchema(oldDoc, resolve(oldDoc, oldRes).content));
        const after = properties(newDoc, jsonSchema(newDoc, resolve(newDoc, newRes).content));
        for (const prop of before.props) {
          if (!after.props.has(prop)) add('breaking', 'response-property-removed', where, `Response ${code} no longer includes "${prop}".`);
        }
      }
    }
  }
  for (const [p, newItem] of Object.entries(newPaths)) {
    for (const m of METHODS) {
      if (newItem[m] && !oldPaths[p]?.[m]) add('non-breaking', 'operation-added', `${m.toUpperCase()} ${p}`, `${m.toUpperCase()} ${p} was added.`);
    }
  }
  return { breaking: changes.filter((c) => c.severity === 'breaking').length, changes };
}
