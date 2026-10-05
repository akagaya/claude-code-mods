# token-limit

モデルと effort、コンテキストウィンドウの使用量、レート制限の使用率を、プロンプト下のフッター右側に色付きで表示する、Claude Code の mod です。

```
opus-5.5 med ██░░ 42% 84k/200k │ 5h ███░ 85.5% ~14:30 │ 7d ██░░ 60%
```

50% 未満は緑、50% 以上は黄、80% 以上は赤で表示します。

コンテキストのゲージにはモデル名を付けます。コンテキストウィンドウの大きさはモデルで決まるためです。effort は最初のリクエストの後から表示されます。`/model` や `/effort` で変更した場合は、次のリクエストから反映されます。

## 導入

[claude-code-mods](../..) の一部です。

```
/plugin marketplace add akagaya/claude-code-mods
/plugin install token-limit@claude-code-mods
```

次に起動した Claude Code のセッションから読み込まれます。

## 開発

```sh
claude plugin validate .
claude plugin test .
```
