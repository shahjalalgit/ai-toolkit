# FAQ

**Do I need to install the whole toolkit to use one module?**
No. Copy the module folder (or the individual Claude Code files) and follow
its README. The central installer is a convenience.

**Does anything here call an AI API or send data anywhere?**
No module makes network requests. The Claude Code skills and agents run inside
your own Claude Code session, under its normal permissions.

**Why Node for the installer instead of pure bash?**
JSON parsing, checksums and path normalisation are fragile in bash 3.2, the
macOS default. Node is already required by the modules. `scripts/setup.sh` is
still the interface. See [ADR 0002](decisions/0002-node-installer-core.md).

**Why are all modules "Experimental"?**
They are implemented and tested, but at 0.1.0 their commands and output
formats may still change. Stable means the interface is frozen within a major
version.

**Will the SEO module improve my rankings or get my content cited by AI search?**
No tool can promise that. The module finds technical defects and reports
content-structure signals; what search engines and answer engines do with a
page is outside anyone's control.

**Does the harness run an autonomous coding pipeline?**
No. It provides deterministic gates (ticket, contract) and a Claude Code
workflow with human checkpoints. The fix-loop limit is an instruction to
Claude, not enforced by code.

**Can the installer delete my files?**
Only `uninstall` deletes, and only files whose checksum matches what the
toolkit installed. Edited files are kept. Use `--dry-run` to preview.

**What license is it under?**
MIT. See [LICENSE](../LICENSE) and [ADR 0004](decisions/0004-license.md).

**Does it work on Windows?**
Untested. macOS is the primary platform; Linux runs in CI.
