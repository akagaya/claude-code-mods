# claude-code-mods

Claude Code mods, served as a plugin marketplace.

| Mod | What it shows |
| --- | --- |
| [token-limit](plugins/token-limit) | Model, effort, context window fill and rate-limit usage at the right of the prompt footer |
| [title-bar](plugins/title-bar) | Session name, working folder and git branch in the prompt footer and the terminal window title |
| [context-pane](plugins/context-pane) | What the conversation's context holds, in a side pane |

## Install

In Claude Code:

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install token-limit@claude-code-mods
/plugin install title-bar@claude-code-mods
/plugin install context-pane@claude-code-mods
```

`/plugin marketplace update claude-code-mods` pulls the latest versions.

Without the marketplace, copying a folder under `plugins/` to `~/.claude/skills/` works too.

Each mod loads from the next Claude Code session on.

## Develop

From a mod's folder:

```sh
claude plugin validate .
claude plugin test .
```
