# context-pane

A Claude Code mod that shows what the conversation's context holds in a side pane.

```
Files 2
E sync.sh
R Claude/sync.ps1

Skills 1
  plugin-authoring

MCP servers 1
  docs ×2

Memory 1
Project Claude/CLAUDE.md 1k
```

Files are the ones read (`R`) or edited (`E`) through the file tools, newest first; a file read through Bash is not seen. A subagent's calls are left out, as they fill its own context. A compaction empties all but the memory files, as the summary replaces what they put in the window.

The pane opens at the start of a session from 144 terminal columns, and docks beside the transcript in fullscreen. `/context-pane` opens it at any width.

## Install

Part of [claude-code-mods](../..):

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install context-pane@claude-code-mods
```

It loads from the next Claude Code session on.

## Develop

```sh
claude plugin validate .
claude plugin test .
```
