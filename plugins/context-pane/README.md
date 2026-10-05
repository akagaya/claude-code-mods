# context-pane

会話のコンテキストに入っているものをサイドペインに表示する、Claude Code の mod です。

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

Files には、ファイル操作ツールで読んだ(`R`)ファイルと編集した(`E`)ファイルを、新しい順に表示します。Bash 経由で読んだファイルは対象外です。サブエージェントの呼び出しは、そのサブエージェント自身のコンテキストに入るため表示しません。コンパクションが起きるとメモリファイル以外は空になります。要約がそれらの内容に置き換わるためです。

ペインは、ターミナルの幅が 144 桁以上あればセッション開始時に開き、フルスクリーンではトランスクリプトの横に並びます。`/context-pane` を使えば、幅に関係なく開けます。

## 導入

[claude-code-mods](../..) の一部です。

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install context-pane@claude-code-mods
```

次に起動した Claude Code のセッションから読み込まれます。

## 開発

```sh
claude plugin validate .
claude plugin test .
```
