# Workflow: <name>

## Goal

<The outcome, in one sentence, and who it is for.>

## Trigger

<Manual command, schedule you configure, or event. The toolkit never creates
schedules automatically.>

## Inputs

| Input | Source | Required |
| --- | --- | --- |
| <ticket file> | <path or system> | yes |

## Steps

| # | Step | Actor (script / AI / human) | Done when | On failure |
| --- | --- | --- | --- | --- |
| 1 | <Validate input> | script | exit code 0 | stop, report errors |
| 2 | <Do the work> | AI | <observable result> | retry at most <N> times, then stop |
| 3 | <Approve> | human | explicit approval | stop |

## Side effects and permissions

<Files written, services called, messages sent. Anything externally visible
needs an explicit human checkpoint before it happens.>

## Outputs

<Artifacts produced and where they go.>

## Observability

<Where logs go and how to tell whether the last run succeeded.>
