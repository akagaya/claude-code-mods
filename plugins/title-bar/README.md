# title-bar

セッション名、作業フォルダ、git ブランチをプロンプト下のフッター左側に表示し、同じ文字列をターミナルのウィンドウタイトルにも設定する、Claude Code の mod です。

```
session name │ ConsoleProfiles ⎇ main │ ? for shortcuts
```

セッション名は、`/rename` で付けた名前を優先します。無ければ自動生成された名前を、それも無ければセッション ID の先頭を使います。detached HEAD は `@<commit>` と表示します。

ウィンドウタイトルは子プロセスで設定します。Windows では `scripts/set-title.ps1` を使い、それ以外では `/dev/tty` に OSC シーケンスを書き込みます。エンジンにタイトルを設定する手段が無いためです。

## 導入

[claude-code-mods](../..) の一部です。

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install title-bar@claude-code-mods
```

次に起動した Claude Code のセッションから読み込まれます。

## 開発

```sh
claude plugin validate .
claude plugin test .
```
