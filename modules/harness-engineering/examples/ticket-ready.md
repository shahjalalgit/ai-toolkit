# ENG-142: Add cursor pagination to GET /orders

## Summary

Large merchants time out when listing orders because `GET /orders` returns
every order. Add cursor-based pagination while keeping existing clients working.

## Acceptance Criteria

- [ ] `GET /orders` accepts optional `limit` (1-100, default 50) and `cursor` query parameters.
- [ ] The response includes `nextCursor`, which is `null` on the last page.
- [ ] Requests without `limit` or `cursor` return the first 50 orders, sorted by `createdAt` descending.
- [ ] An invalid `cursor` returns HTTP 400 with error code `invalid_cursor`.

## Out of Scope

- Offset pagination and total counts.

## Test Plan

- Contract check: `node src/cli.mjs contract examples/openapi-v1.json examples/openapi-v2-compatible.json` exits 0.
- Unit tests for cursor encoding and decoding.
- Integration test paging through 120 seeded orders with `limit=50`.

## Risks

- Cursor format becomes a public contract; keep it opaque (base64).
