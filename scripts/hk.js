/**
 * @name 过滤香港节点
 * @description 剔除节点列表及策略组中所有包含香港/HK关键词的节点
 * @target Mihomo Party / Clash Verge Rev
 * @source https://github.com/DBinK/dbk-override
 * @see https://clashparty.org/docs/guide/override/javascript
 * @see https://github.com/mihomo-party-org/override-hub
 */

function main(config) {
  const hkPattern = /(港|hk|hongkong|hong kong)/i;

  if (Array.isArray(config.proxies)) {
    config.proxies = config.proxies.filter(
      (proxy) => !hkPattern.test(proxy.name)
    );
  }

  if (Array.isArray(config["proxy-groups"])) {
    config["proxy-groups"].forEach((group) => {
      if (Array.isArray(group.proxies)) {
        group.proxies = group.proxies.filter(
          (name) => !hkPattern.test(name)
        );
      }
    });
  }

  return config;
}
