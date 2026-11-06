# dbk-override

Mihomo / Clash 覆写脚本集合（适用于 Mihomo Party、Clash Verge Rev、FlClash、Clash Meta for Android 等客户端）。

## 下载

当 `config/`、`scripts/`、`tools/` 或 workflow 变更并推送到 `main` 时，自动生成并发布 Release，tag 形如 `v20261023-1229`（UTC 日期 + 时分），同时标记为 latest：

| 资源 | 说明 | 适用场景 |
| --- | --- | --- |
| [`dbk-desktop.js`](https://github.com/DBinK/dbk-override/releases/latest/download/dbk-desktop.js) | 综合覆写（过滤香港节点 + 顶置直连域名与强制代理） | 桌面端（Mihomo Party / Clash Verge Rev） |
| [`dbk-android.js`](https://github.com/DBinK/dbk-override/releases/latest/download/dbk-android.js) | 综合覆写（过滤香港节点 + 注入 TailSocks 节点及路由 + 顶置直连域名与强制代理） | Android 端（FlClash / CMFA） |
| [`direct.js`](https://github.com/DBinK/dbk-override/releases/latest/download/direct.js) | 单独模块：自定义直连域名置顶 | 模块化按需引入 |
| [`proxy.js`](https://github.com/DBinK/dbk-override/releases/latest/download/proxy.js) | 单独模块：自定义强制代理置顶（自动适配配置代理组） | 模块化按需引入 |
| [`hk.js`](https://github.com/DBinK/dbk-override/releases/latest/download/hk.js) | 单独模块：过滤香港节点及清理策略组 | 模块化按需引入 |
| [`tailsock.js`](https://github.com/DBinK/dbk-override/releases/latest/download/tailsock.js) | 单独模块：注入 TailSocks 节点并分流 100.64.0.0/10 网段及 MagicDNS 域名 | 模块化按需引入 |

固定地址始终指向最新版本：

```text
https://github.com/DBinK/dbk-override/releases/latest/download/dbk-desktop.js
https://github.com/DBinK/dbk-override/releases/latest/download/dbk-android.js
https://github.com/DBinK/dbk-override/releases/latest/download/direct.js
https://github.com/DBinK/dbk-override/releases/latest/download/proxy.js
https://github.com/DBinK/dbk-override/releases/latest/download/hk.js
https://github.com/DBinK/dbk-override/releases/latest/download/tailsock.js
```

需要锁定某个版本时，把 `latest` 换成对应 tag，例如 `releases/download/v20261023-1229/dbk-desktop.js`。

## 本地生成

直连规则统一维护在 `config/direct-rules.yaml`，强制代理规则维护在 `config/proxy-rules.yaml`，均使用 [Clash Party YAML 覆写格式](https://clashparty.org/docs/guide/override/yaml)：

```yaml
+rules:
  - "DOMAIN-SUFFIX,example.com,DIRECT"
  - "DOMAIN-SUFFIX,openai.com,PROXY"
```

平台差异放在 `config/templates/`，`scripts/` 下的独立模块会原样复制。生成结果写入 `tmp/`（已被 git 忽略）：

```bash
node tools/generate-overrides.js          # 生成到 tmp/
node tools/generate-overrides.js --check  # 校验产物是否与源数据一致
```

每个生成文件的头部带 `@build` 标记，与 Release tag 一致：

```javascript
/**
 * @name 自定义直连域名
 * @target Mihomo Party / Clash Verge Rev
 * @build v20261023-1230
 */
```

本地不传 `BUILD_TAG` 时按当前 UTC 时间生成；CI 中由 workflow 传入同一个 tag。`--check` 忽略 `@build` 的具体值，只比较其余内容。

## 参考文档

- [Mihomo Party JavaScript 覆写指南](https://clashparty.org/docs/guide/override/javascript)
- [Mihomo Party 覆写仓库 Hub](https://github.com/mihomo-party-org/override-hub)
