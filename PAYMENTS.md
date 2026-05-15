# TokenTotal 微信支付接入

TokenTotal 桌面端不要直接接微信支付。正确结构是：

1. Electron 打开购买页。
2. 支付服务端创建订单。
3. 服务端调用微信支付 API v3 Native 下单接口，拿到 `code_url`。
4. 购买页把 `code_url` 渲染成二维码。
5. 用户微信扫码付款。
6. 微信支付回调服务端。
7. 服务端验签、解密回调、标记订单已支付。
8. 服务端签发 TokenTotal Pro License Key。
9. 用户复制 License Key 到 TokenTotal 设置页激活。

## 为什么必须有服务端

微信支付 API v3 需要商户 API 证书私钥、APIv3 密钥、微信支付公钥/平台证书来签名、验签和解密回调。这些材料不能放进 Electron 客户端，否则任何人都能从安装包里提取商户密钥。

## 当前实现

已添加一个最小服务端：

```powershell
npm run pay:dev
```

默认没有微信商户配置时会进入 `mock` 模式，用于测试下单、轮询和 License 激活流程。开发模式下 mock 付款会返回 `TT-DEV-PRO`。

正式使用时按 `server/env.example` 配置环境变量，并设置：

```powershell
$env:TT_PAYMENT_MODE="wechat"
$env:TT_PUBLIC_BASE_URL="https://pay.your-domain.com"
```

购买页地址：

```text
http://127.0.0.1:8788/checkout
```

生产环境应部署到有 HTTPS 的公网域名，并把 TokenTotal 客户端的购买链接配置为：

```powershell
$env:TOKENTOTAL_PURCHASE_URL="https://pay.your-domain.com/checkout"
```

## 微信支付需要准备

- 微信支付商户号 `WECHAT_MCHID`
- 与商户号绑定的 AppID `WECHAT_APPID`
- 商户 API 证书序列号 `WECHAT_MERCHANT_SERIAL_NO`
- 商户 API 证书私钥 `apiclient_key.pem`
- APIv3 密钥 `WECHAT_API_V3_KEY`
- 微信支付公钥或平台证书公钥 `WECHAT_PAY_PUBLIC_KEY_PATH`
- 公网 HTTPS 回调地址 `/api/wechat/notify`

## License 签名

服务端用私钥签发：

```powershell
$env:TOKENTOTAL_LICENSE_PRIVATE_KEY_PATH="/secure/path/tokentotal_license_private.pem"
```

客户端用对应公钥验证：

```powershell
$env:TOKENTOTAL_LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
```

正式发布前一定要用自己的密钥对，不要把私钥提交到仓库。

## 注意

- 不要用个人收款码做自动付费，它没有可靠回调，也不适合软件授权自动发放。
- 回调可能重复发送，服务端必须按 `out_trade_no` 幂等处理。
- 最终订单状态以微信支付回调和查询接口为准，客户端轮询只用于更新 UI。
