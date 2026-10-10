# Changelog: E-commerce Automation

All notable changes to this module are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the module uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-10

### Added

- `validate-catalog` CLI: required fields, SKU format and uniqueness, price
  and sale price rules, ISO currency format, GTIN-8/12/13/14 check digits,
  availability values, URL checks and variant parent references.
- Inventory consistency: unknown SKUs, duplicate records, invalid quantities,
  missing records and availability/stock mismatches.
- Clean and intentionally faulty sample datasets.
