# title-bar

A Claude Code mod that shows the session name, working folder and git branch at the left of the prompt footer, and sets the same text as the terminal window title.

```
session name │ ConsoleProfiles ⎇ main │ ? for shortcuts
```

The session name is the one given with `/rename`, else the generated one, else the start of the session id. A detached HEAD shows as `@<commit>`.

The window title is set by a child process (`scripts/set-title.ps1` on Windows, an OSC sequence to `/dev/tty` elsewhere), as the engine has no call for it.

## Install

Part of [claude-code-mods](../..):

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install title-bar@claude-code-mods
```

It loads from the next Claude Code session on.

## Develop

```sh
claude plugin validate .
claude plugin test .
```
