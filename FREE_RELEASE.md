# TokenTotal Free 发布清单

目标：先上传 GitHub Releases，观察下载量和真实反馈，再决定是否接正式付费。

## 免费版边界

Free Edition 默认开放：

- Token 成本估算
- 基础 Prompt 瘦身
- 模型成本对比
- 历史记录 100 条
- 预算页基础查看

暂不开放或需要 Pro License：

- Codex / Claude Code / 外部工具连接器同步
- 本地模型聊天
- Prompt 转英文
- 官方用量拉取
- CSV / 全量数据导出
- 不限历史记录

## 打包

```powershell
npm run check
npm run build:free
```

产物目录：

```text
release/free/
```

上传到 GitHub Release 的文件名类似：

```text
TokenTotal-Free-1.0.0-x64.exe
```

## GitHub Release 文案

标题：

```text
TokenTotal Free v1.0.0
```

简介：

```text
TokenTotal Free 是一个本地 AI token 成本估算与 Prompt 瘦身工具。它可以帮助你判断一次调用大概花多少钱、为什么贵、能不能换成更便宜的模型。

当前版本重点验证需求和下载量，所有数据默认保存在本机。连接器同步、本地模型聊天、导出和高级自动化能力会在 Pro 内测中开放。
```

标签：

```text
ai-cost token-estimator prompt-optimizer ollama codex claude-code
```

## 看下载量

GitHub Release 的每个 asset 页面会显示下载次数；也可以以后用 GitHub API 拉取 release asset 的 `download_count`。

## 发布前检查

- 设置页显示 Free。
- “购买 Pro”在未配置购买链接时不可点击。
- 免费版可以完成估算和基础 Prompt 瘦身。
- 连接器、聊天、导出等 Pro 功能会提示升级。
- 不要把 `.license/private.pem`、微信支付密钥、订单数据上传到仓库。
