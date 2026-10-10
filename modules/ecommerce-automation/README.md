# E-commerce Automation

Deterministic validation for product catalogs and inventory exports. Works on
local JSON files so you can check data before it reaches a store, feed or
marketplace.

## Purpose

Catch structural catalog errors early: duplicate SKUs, invalid prices, bad
GTIN check digits, broken variant relationships, and stock levels that
contradict the advertised availability.

Supported use cases:

- Validating a catalog export before importing it into a store.
- Running as a CI gate on a repository that stores product data as JSON.
- Producing a JSON report that other tools (or Claude Code) can summarise.

## Status

**Experimental (0.1.0).**

| Capability | Status |
| --- | --- |
| Catalog validation (JSON) | Implemented |
| Inventory consistency (JSON) | Implemented |
| CSV input | Planned |
| Store connectors (Shopify, WooCommerce, ...) | Not implemented |
| Writing changes to any store | Not implemented, by design |

## Prerequisites

- Node.js 22 or later. No npm packages.

## Installation

Standalone: copy `modules/ecommerce-automation/` anywhere and run
`node src/validate-catalog.mjs`.

Into a project:

```bash
./scripts/setup.sh install ecommerce-automation --target ~/code/my-shop-data
```

This copies `src/` to `.ai-toolkit/modules/ecommerce-automation/src/`.

## Usage

From `modules/ecommerce-automation/`:

```bash
# Clean data: exits 0
node src/validate-catalog.mjs --catalog examples/products.clean.json --inventory examples/inventory.clean.json

# Seeded defects: exits 1 and lists every problem
node src/validate-catalog.mjs --catalog examples/products.sample.json --inventory examples/inventory.sample.json

# JSON report for other tools
node src/validate-catalog.mjs --catalog examples/products.sample.json --json > report.json
```

## Inputs and outputs

### Catalog (`--catalog`, required)

```json
{
  "currency": "USD",
  "products": [
    {
      "sku": "TSHIRT-M-BLK",
      "parentSku": "TSHIRT",
      "title": "Organic Cotton T-Shirt - Medium / Black",
      "price": 24.0,
      "salePrice": 19.99,
      "currency": "USD",
      "availability": "in_stock",
      "gtin": "4006381333931",
      "url": "https://shop.example.com/products/tshirt",
      "imageUrl": "https://cdn.example.com/tshirt.jpg"
    }
  ]
}
```

Required per product: `sku`, `title`, `price`, `currency`, `availability`
(`in_stock`, `out_of_stock`, `preorder`, `discontinued`). Other fields are
optional and validated when present.

### Inventory (`--inventory`, optional)

```json
{ "items": [{ "sku": "TSHIRT-M-BLK", "quantity": 12, "location": "warehouse-a" }] }
```

Quantities are summed per SKU across locations. Parent products that only
group variants do not need inventory records.

### Output

One line per finding (`ERROR` or `WARN`, rule id, SKU, message), or with
`--json`: `{errors, warnings, findings[]}` where each finding is
`{level, rule, sku, message}`.

Exit codes: `0` no errors (warnings allowed), `1` errors, `2` usage or
unreadable/invalid JSON input.

## Permissions and side effects

- Reads the two files you pass. Writes nothing (redirect stdout yourself).
- No network access. Never connects to a store, and never modifies orders,
  inventory or customer data.
- Reports include SKUs and product titles only. Do not feed it files that
  contain customer data; it does not need any.

## Testing

```bash
./scripts/setup.sh test ecommerce-automation
```

## Uninstall

```bash
./scripts/setup.sh uninstall ecommerce-automation --target ~/code/my-shop-data
```

## Limitations

- JSON input only; convert CSV exports first (for example with `jq` or a
  spreadsheet export).
- Currency codes are checked for format (`[A-Z]{3}`), not against the full
  ISO 4217 list.
- Prices are JavaScript numbers; amounts are checked to 2 decimal places, so
  zero-decimal and 3-decimal currencies need a code change.
- Channel-specific feed rules (Google Merchant Center, Meta) are not encoded.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `cannot read ... Unexpected token` | The file is not valid JSON. Validate with `jq . file.json`. |
| `catalog-shape` error | The top level must be `{ "products": [...] }`. |
| Many `inventory-missing` warnings | Pass the inventory file that matches the catalog export, or ignore if stock is not tracked. |

## Compatibility

- Node.js 22+ on macOS and Linux. Manifest: `module.json` (schema v1).
