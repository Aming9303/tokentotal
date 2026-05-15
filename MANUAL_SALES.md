# 无商户号时的内测收款方案

没有营业执照时，不建议把个人微信收款码做成自动购买。更稳的方式是先做“人工收款 + 手动发 License”的小规模内测。

## 流程

1. 用户从 GitHub Release 下载免费版。
2. 用户想升级 Pro，联系你付款。
3. 你确认到账后，在本机生成 License Key。
4. 把 License Key 发给用户。
5. 用户在 TokenTotal 设置页激活。

## 第一次准备

生成签名密钥：

```powershell
npm run license:keys
```

这会生成：

- `.license/private.pem`：私钥，只能你自己保存，不能发给别人。
- `.license/public.pem`：公钥，客户端用来验证 License。

开发运行时可以这样让客户端读取公钥：

```powershell
$env:TOKENTOTAL_LICENSE_PUBLIC_KEY_PATH="E:\tokentotal\.license\public.pem"
npm start
```

正式打包时要把公钥放进应用构建环境，私钥只留在你的电脑或服务器。

## 给用户发 License

```powershell
npm run license:issue -- --email user@example.com --name "User Name" --order manual-001
```

如果要做一年有效期：

```powershell
npm run license:issue -- --email user@example.com --expires 2027-05-15
```

脚本会输出一串 `TT-PRO-...`，把它发给用户即可。

## 适合放到发布页的文案

免费版：

- Token 成本估算
- 基础 Prompt 瘦身
- 100 条历史记录

Pro 内测版：

- 连接器同步
- 本地模型聊天
- Prompt 转英文
- 官方用量拉取
- 数据导出
- 不限历史记录

## 注意

- 个人收款适合小规模内测和赞助，不适合大规模自动销售。
- 对外文案不要写“自动购买后立即开通”，因为你没有自动支付回调。
- 等你能办理个体户或企业主体后，再接正式微信支付 Native 扫码。
