# token-limit

A Claude Code mod that shows the model and effort, context window fill and rate-limit usage, in colour, at the right of the prompt footer.

```
opus-5.5 med ██░░ 42% 84k/200k │ 5h ███░ 85.5% ~14:30 │ 7d ██░░ 60%
```

Green under 50%, yellow from 50%, red from 80%.

The context gauge is labelled with the model, as the window is the model's. The effort joins it from the first request on, and a change by `/model` or `/effort` shows from the next request.

## Install

Part of [claude-code-mods](../..):

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install token-limit@claude-code-mods
```

It loads from the next Claude Code session on.

## Develop

```sh
claude plugin validate .
claude plugin test .
```
