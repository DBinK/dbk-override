/**
 * @name Tailscale 分流注入
 * @description 注入本地 TailSocks 节点并前置 Carrier-grade NAT 网段及 MagicDNS 域名分流规则
 * @target Mihomo Party / Clash Verge Rev
 * @source https://github.com/DBinK/dbk-override
 * @prerequisite 本地需开启 TailSocks 代理（默认 127.0.0.1:48115）
 * @see https://clashparty.org/docs/guide/override/javascript
 * @see https://github.com/mihomo-party-org/override-hub
 */

function main(config) {
  // 1. 注入 TailSocks 节点
  const proxyName = "TailSocks";

  if (!Array.isArray(config.proxies)) config.proxies = [];
  if (!Array.isArray(config.rules)) config.rules = [];

  const proxy = {
    name: proxyName,
    type: "socks5",
    server: "127.0.0.1",
    port: 48115,
  };

  const oldProxyIndex = config.proxies.findIndex((p) => p.name === proxyName);
  if (oldProxyIndex >= 0) {
    config.proxies[oldProxyIndex] = proxy;
  } else {
    config.proxies.push(proxy);
  }

  // 2. 注入 Tailscale 规则到最顶部（域名规则 + IP 网段）
  const tailscaleRules = [
    "DOMAIN-SUFFIX,ts.net,TailSocks",
    "DOMAIN-SUFFIX,beta.tailscale.net,TailSocks",
    "IP-CIDR,100.64.0.0/10,TailSocks,no-resolve",
    "IP-CIDR6,fd7a:115c:a1e0::/48,TailSocks,no-resolve",
  ];

  config.rules = config.rules.filter((rule) => !tailscaleRules.includes(rule));
  config.rules.unshift(...tailscaleRules);

  return config;
}
