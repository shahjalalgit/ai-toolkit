#!/usr/bin/env node
// Product catalog and inventory validator. Reads local JSON files only.
//
// Usage:
//   node src/validate-catalog.mjs --catalog products.json [--inventory inventory.json] [--json]
//
// Exit codes: 0 valid (warnings allowed), 1 errors found, 2 usage or input error.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const AVAILABILITY = ['in_stock', 'out_of_stock', 'preorder', 'discontinued'];
const SKU_RE = /^[A-Za-z0-9._-]{1,64}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

/** Validates a GTIN-8/12/13/14 check digit. */
export function isValidGtin(value) {
  const s = String(value);
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(s)) return false;
  const digits = s.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function validateCatalog(catalog, inventory) {
  const findings = [];
  const add = (level, rule, sku, message) => findings.push({ level, rule, sku: sku ?? null, message });

  if (!catalog || !Array.isArray(catalog.products)) {
    add('error', 'catalog-shape', null, 'Catalog must be an object with a "products" array.');
    return findings;
  }

  const bySku = new Map();
  catalog.products.forEach((p, i) => {
    const where = `products[${i}]`;
    if (!p || typeof p !== 'object') {
      add('error', 'product-shape', null, `${where} is not an object.`);
      return;
    }
    const sku = typeof p.sku === 'string' ? p.sku : null;
    for (const field of ['sku', 'title', 'price', 'currency', 'availability']) {
      if (p[field] === undefined || p[field] === null || p[field] === '') add('error', 'required-field', sku, `${where} is missing "${field}".`);
    }
    if (sku !== null) {
      if (!SKU_RE.test(sku)) add('error', 'sku-format', sku, `SKU "${sku}" must be 1-64 chars of A-Z, a-z, 0-9, ".", "_" or "-".`);
      if (bySku.has(sku)) add('error', 'sku-duplicate', sku, `SKU "${sku}" appears more than once.`);
      else bySku.set(sku, p);
    }
    if (p.price !== undefined) {
      if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0) add('error', 'price-invalid', sku, `Price must be a positive number (got ${JSON.stringify(p.price)}).`);
      else if (Math.round(p.price * 100) !== Number((p.price * 100).toFixed(6))) add('error', 'price-precision', sku, `Price ${p.price} has more than 2 decimal places.`);
    }
    if (p.salePrice !== undefined && typeof p.price === 'number') {
      if (typeof p.salePrice !== 'number' || p.salePrice <= 0) add('error', 'sale-price-invalid', sku, 'salePrice must be a positive number.');
      else if (p.salePrice >= p.price) add('warning', 'sale-price-not-lower', sku, `salePrice ${p.salePrice} is not lower than price ${p.price}.`);
    }
    if (p.currency !== undefined && (typeof p.currency !== 'string' || !CURRENCY_RE.test(p.currency))) add('error', 'currency-format', sku, `Currency "${p.currency}" must be an ISO 4217 code such as USD.`);
    if (p.availability !== undefined && !AVAILABILITY.includes(p.availability)) add('error', 'availability-invalid', sku, `Availability "${p.availability}" must be one of ${AVAILABILITY.join(', ')}.`);
    if (p.gtin !== undefined && !isValidGtin(p.gtin)) add('error', 'gtin-invalid', sku, `GTIN "${p.gtin}" has an invalid length or check digit.`);
    if (typeof p.title === 'string' && p.title.length > 150) add('warning', 'title-long', sku, `Title is ${p.title.length} characters (most channels truncate at 150).`);
    for (const field of ['url', 'imageUrl']) {
      if (p[field] === undefined) continue;
      let u;
      try {
        u = new URL(p[field]);
      } catch {
        add('error', 'url-invalid', sku, `${field} "${p[field]}" is not a valid absolute URL.`);
        continue;
      }
      if (u.protocol !== 'https:') add('warning', 'url-not-https', sku, `${field} should use https.`);
    }
  });

  if (catalog.currency !== undefined) {
    for (const [sku, p] of bySku) {
      if (p.currency && p.currency !== catalog.currency) add('warning', 'currency-mismatch', sku, `Currency ${p.currency} differs from catalog default ${catalog.currency}.`);
    }
  }
  for (const [sku, p] of bySku) {
    if (p.parentSku === undefined) continue;
    if (p.parentSku === sku) add('error', 'parent-self', sku, 'parentSku references the product itself.');
    else if (!bySku.has(p.parentSku)) add('error', 'parent-missing', sku, `parentSku "${p.parentSku}" does not exist in the catalog.`);
    else if (bySku.get(p.parentSku).parentSku !== undefined) add('warning', 'parent-nested', sku, `parentSku "${p.parentSku}" is itself a variant.`);
  }

  if (inventory !== undefined) {
    if (!inventory || !Array.isArray(inventory.items)) {
      add('error', 'inventory-shape', null, 'Inventory must be an object with an "items" array.');
      return findings;
    }
    const totals = new Map();
    const seen = new Set();
    const invalid = new Set();
    inventory.items.forEach((item, i) => {
      const sku = item?.sku;
      const key = `${sku}@${item?.location ?? ''}`;
      if (seen.has(key)) add('error', 'inventory-duplicate', sku, `Duplicate inventory record for ${sku}${item.location ? ` at ${item.location}` : ''}.`);
      seen.add(key);
      if (!bySku.has(sku)) add('error', 'inventory-unknown-sku', sku, `inventory items[${i}] references unknown SKU "${sku}".`);
      if (!Number.isInteger(item?.quantity) || item.quantity < 0) {
        add('error', 'inventory-quantity', sku, `Quantity must be a non-negative integer (got ${JSON.stringify(item?.quantity)}).`);
        invalid.add(sku);
        return;
      }
      totals.set(sku, (totals.get(sku) ?? 0) + item.quantity);
    });
    for (const [sku, p] of bySku) {
      const parentOnly = [...bySku.values()].some((v) => v.parentSku === sku);
      if (invalid.has(sku)) continue;
      if (!totals.has(sku)) {
        if (!parentOnly && p.availability !== 'discontinued') add('warning', 'inventory-missing', sku, 'No inventory record for this SKU.');
        continue;
      }
      const qty = totals.get(sku);
      if (p.availability === 'in_stock' && qty === 0) add('warning', 'stock-mismatch', sku, 'Marked in_stock but total quantity is 0.');
      if (p.availability === 'out_of_stock' && qty > 0) add('warning', 'stock-mismatch', sku, `Marked out_of_stock but total quantity is ${qty}.`);
    }
  }
  return findings;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`cannot read ${file}: ${e.code ?? e.message}`);
  }
}

const USAGE = 'Usage: validate-catalog --catalog <products.json> [--inventory <inventory.json>] [--json]';

export function run(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else if ((a === '--catalog' || a === '--inventory') && argv[i + 1] !== undefined) o[a.slice(2)] = argv[++i];
    else {
      process.stderr.write(`error: unexpected argument ${a}\n${USAGE}\n`);
      return 2;
    }
  }
  if (o.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!o.catalog) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let findings;
  try {
    findings = validateCatalog(readJson(o.catalog), o.inventory ? readJson(o.inventory) : undefined);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 2;
  }
  const errors = findings.filter((f) => f.level === 'error').length;
  if (o.json) process.stdout.write(`${JSON.stringify({ errors, warnings: findings.length - errors, findings }, null, 2)}\n`);
  else {
    for (const f of findings) process.stdout.write(`${f.level === 'error' ? 'ERROR' : 'WARN '} ${f.rule}${f.sku ? ` [${f.sku}]` : ''}: ${f.message}\n`);
    process.stdout.write(`${errors} error(s), ${findings.length - errors} warning(s).\n`);
  }
  return errors ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = run(process.argv.slice(2));
}
