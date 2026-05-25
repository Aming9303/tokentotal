# 无商户号时的内测收款和 Pro 激活流程

没有营业执照或微信商户号时，先不要做自动购买。更稳的方式是“人工收款 + 手动签发 License Key”。

## 核心原则

- 只有开发者生成密钥对。
- 只有开发者保存 `.license/private.pem`。
- 用户永远不要运行 `npm run license:keys`。
- 用户只需要下载你打包好的应用，然后粘贴你发给他的 `TT-PRO-...` 激活码。
- `TT-DEV-PRO` 只给开发环境测试用，打包后的发行版不能用。

如果内测用户自己生成了公钥，他得到的是另一套密钥。你的应用包无法用他的公钥验证你签发的激活码，所以会激活失败。

## 第一次准备

在你的开发电脑上生成签名密钥：

```powershell
npm run license:keys
```

这会生成：

- `.license/private.pem`：私钥，只能你自己保存，不能发给任何人。
- `.license/public.pem`：公钥，可以内置到应用里，用来验证 License。

把公钥复制到打包入口：

```powershell
npm run license:publish-public
```

这会在项目根目录生成 `license-public.pem`。这个文件是公钥，可以随应用发布；`.license/private.pem` 仍然必须保密。

## 打包给内测用户

发布前先检查并打包：

```powershell
npm run check
npm run build:free
```

然后把 `release/free/TokenTotal-Free-1.0.0-x64.exe` 发给用户或上传到 GitHub Release。

重要：如果你之前已经打过包，但当时没有 `license-public.pem`，那个旧安装包无法激活 Pro。需要重新打包并重新上传。

## 给用户签发 License

用户付款或加入内测后，在你的电脑上执行：

```powershell
npm run license:issue -- --email user@example.com --name "User Name" --order beta-001
```

如果要设置有效期：

```powershell
npm run license:issue -- --email user@example.com --expires 2027-05-15
```

脚本会输出一个 `TT-PRO-...`。把这个激活码发给用户即可。

## 用户侧怎么做

1. 下载并打开你发布的应用。
2. 进入设置页。
3. 粘贴你发给他的 `TT-PRO-...`。
4. 点击激活。

用户不需要源码，不需要生成公钥，也不需要设置环境变量。

## 常见错误

- 提示“TT-DEV-PRO 仅开发环境可用”：用户用了开发测试码，应该换成你签发的 `TT-PRO-...`。
- 提示“当前应用包没有内置授权公钥”：你打包时没有包含 `license-public.pem`，先运行 `npm run license:publish-public`，再重新 `npm run build:free`。
- 提示“签名无效”：激活码不是用当前应用内置公钥对应的私钥签发的。不要重新生成密钥；应该使用原来的 `.license/private.pem` 签发。

## 发布页文案

免费版：

- Token 成本估算
- 基础 Prompt 瘦身
- 模型成本对比
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
- 对外不要写“付款后自动开通”，因为你现在还没有自动支付回调。
- 等你能办理个体户或企业主体后，再接正式微信支付 Native 扫码。
