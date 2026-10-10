# Workflow template

A workflow is a documented, repeatable sequence of steps, optionally driven by
Claude Code, with explicit gates and human checkpoints. Use
[WORKFLOW.md](WORKFLOW.md) to design one before automating it.

## Use it

1. Copy `WORKFLOW.md` into a module (for example `modules/<module>/docs/`).
2. Fill in every section. Each step needs a verifiable "done when".
3. Automate deterministic gates as scripts with exit codes first; let AI
   handle only the steps that need judgment.
4. If Claude should drive it, turn the steps into a skill using the
   [skill template](../skill-template/README.md), keeping the checkpoints.

Reference implementation:
[harness-engineering](../../modules/harness-engineering/README.md).
