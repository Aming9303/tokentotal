# TokenTotal

一个本地离线可用的 token 用量量化与本地 AI 客户端。桌面版通过 Electron 运行：

```powershell
npm start
```

## 当前能力

- 粘贴或导入文本文件，估算输入 token。
- 支持标准、保守、代码密集、中文长文四种估算策略，并显示估算区间。
- 支持按聊天记录估算协议开销。
- 选择模型后计算单次成本、月度成本和上下文占比。
- 对比多个厂商模型的成本与上下文预算。
- 记录历史、导出/导入 CSV、查看本月预算和厂商成本分布。
- 桌面版可从本机 Codex 与 Claude Code 会话日志同步真实用量，并自动去重。
- 桌面版支持本地代理采集：把 AI 客户端的 base URL 指向 TokenTotal，响应里的 usage/token 字段会自动入账。
- 桌面版内置 Ollama 聊天页，可直接选择本机模型并自动统计 token。
- 连接器中心集中管理 Ollama、OpenAI-compatible、Codex、Claude Code、OpenAI 等接入状态。
- OpenAI API Key 使用系统安全存储；数据导出不会包含密钥。
- 根据当前输入生成上下文风险、缓存收益和模型成本建议。
- 复制一份简短成本报告。

## 说明

当前 token 计算是浏览器端启发式估算，适合产品预算、方案比较和粗粒度容量规划。若要上线给生产计费用途，下一步应接入模型对应的官方 tokenizer，例如在后端使用 `tiktoken` 或服务端 API 返回精确 token 数。

浏览器版只适合估算和轻量查看；本地采集、Ollama 聊天、安全密钥存储需要桌面版。

## 预算页怎么用

桌面版优先用预算页的“自动采集”：

1. 点击 `Codex`、`Claude Code` 或 `同步全部`。
2. 工具会读取本机 `~/.codex/sessions` 与 `~/.claude/projects` 里的 token 用量字段。
3. 同步后的记录会进入历史页，预算页会按本月数据自动汇总成本、token 和厂商分布。

Ollama 等本地模型可以在“聊天”页直接使用；如果是外部 AI 客户端，则把请求走本地代理，才能稳定拿到每次调用的 prompt/eval token。

## 聊天页怎么用

1. 确认 Ollama 已运行，并已安装模型，例如 `qwen3:4b`。
2. 打开桌面版 TokenTotal，进入“聊天”页。
3. 点击“刷新模型”，选择要使用的模型。
4. 直接发送消息。聊天页会自动启用统计通道，并把 token 写入历史记录。

## 本地代理模式

在设置页配置“本地代理”：

1. 监听端口默认 `8787`。
2. Ollama 目标服务通常填 `http://127.0.0.1:11434`。
3. OpenAI-compatible 服务填真实 API 根地址，例如本地 vLLM、LM Studio 或云端兼容服务。
4. 点击“启动代理”后，把客户端 base URL 改成 `http://127.0.0.1:8787`。

代理会转发请求，并从响应中识别：

- OpenAI-compatible `usage.prompt_tokens` / `usage.completion_tokens`
- Anthropic `usage.input_tokens` / `usage.output_tokens`
- Ollama `prompt_eval_count` / `eval_count`

如果目标服务不返回 usage 字段，代理不会凭空估算，会跳过入账。

默认模型价格来自 OpenAI API Pricing 文档的 text token 价格，按每 100 万 token 计算：

- https://platform.openai.com/docs/pricing
- https://platform.openai.com/docs/models/compare
