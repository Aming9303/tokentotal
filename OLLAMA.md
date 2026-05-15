# Ollama 本地模型接入

## 当前已安装

- Ollama: `0.23.2`
- 模型: `qwen3:4b`
- 模型: `qwen3:0.6b`

`qwen3:0.6b` 适合验证链路，体积小、启动快，但中文和复杂代码能力有限。日常中文/代码优先用：

```powershell
ollama run qwen3:4b
```

机器内存和显存充足时再考虑：

```powershell
ollama pull qwen3:8b
ollama pull qwen3:14b
```

## 直接测试 Ollama

命令行聊天：

```powershell
ollama run qwen3:4b
```

API 测试：

```powershell
$body = @{
  model = "qwen3:4b"
  messages = @(@{ role = "user"; content = "Reply with one short sentence: what are you?" })
  stream = $false
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://127.0.0.1:11434/api/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Ollama 会返回 `prompt_eval_count` 和 `eval_count`，TokenTotal 的本地代理会用这两个字段自动入账。

## 通过 TokenTotal 统计用量

内置聊天页会自动启用统计通道。外部 AI 客户端才需要手动配置：

1. 打开 TokenTotal 桌面应用。
2. 进入设置页的“本地代理”。
3. 监听端口保持 `8787`。
4. 目标服务填 `http://127.0.0.1:11434`。
5. 厂商选择 `Local / Ollama`。
6. 点击“启动代理”。
7. 把外部客户端 base URL 改成 `http://127.0.0.1:8787`。

之后请求会经过 TokenTotal 转发到 Ollama；只要 Ollama 响应里有 `prompt_eval_count` / `eval_count`，历史和预算页就会自动记录。
