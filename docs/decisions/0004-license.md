# 0004: MIT license

- Status: Accepted (chosen by the copyright owner)
- Date: 2026-10-10

## Context

The repository is published publicly as a reusable toolkit. Without a license,
default copyright applies and others could not legally reuse the code. The
license is a legal decision for the copyright owner and was made by them.

## Options

| License | Summary | Good fit when |
| --- | --- | --- |
| MIT | Very permissive; keep the copyright notice | You want maximum adoption with minimal obligations |
| Apache-2.0 | Permissive, with an explicit patent grant and NOTICE handling | You want permissive terms and patent clarity for companies |
| MPL-2.0 | File-level copyleft | You want changes to your files shared back, but allow use in closed projects |
| GPL-3.0 | Strong copyleft | You want all derivatives to stay open source |
| No license | All rights reserved | You only want to showcase the code |

Help choosing: <https://choosealicense.com/>.

## Decision

MIT, copyright "Md. Shahjalal". Full text in [LICENSE](../../LICENSE);
`package.json` declares `"license": "MIT"`.

## Consequences

- Anyone may use, modify and redistribute the code, including commercially,
  provided the copyright notice is kept.
- No warranty. No patent grant beyond what MIT implies; switching to
  Apache-2.0 later would require agreement from all contributors.
- Contributions are accepted under the same license (inbound = outbound).
