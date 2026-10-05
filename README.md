# claude-code-mods

Claude Code の mod を、プラグインのマーケットプレイスとして配布しています。

| mod | 表示する内容 |
| --- | --- |
| [token-limit](plugins/token-limit) | モデル、effort、コンテキストウィンドウの使用量、レート制限の使用率を、プロンプト下のフッター右側に表示 |
| [title-bar](plugins/title-bar) | セッション名、作業フォルダ、git ブランチを、フッターとターミナルのウィンドウタイトルに表示 |
| [context-pane](plugins/context-pane) | 会話のコンテキストに入っているものを、サイドペインに表示 |

## 導入

Claude Code で次を実行します。

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install token-limit@claude-code-mods
/plugin install title-bar@claude-code-mods
/plugin install context-pane@claude-code-mods
```

最新版への更新は `/plugin marketplace update claude-code-mods` で行います。

マーケットプレイスを使わずに、`plugins/` 以下のフォルダを `~/.claude/skills/` にコピーしても動きます。

どの mod も、次に起動した Claude Code のセッションから読み込まれます。

## 開発

各 mod のフォルダで次を実行します。

```sh
claude plugin validate .
claude plugin test .
```
