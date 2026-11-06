#!/usr/bin/env node
/**
 * 从 config/direct-rules.yaml 与 config/proxy-rules.yaml 生成覆写脚本到 tmp/（本地测试用，已被 git 忽略），
 * 并把 scripts/ 下的独立模块原样复制过去。
 *
 * 规则文件使用 Clash Party 的 YAML 覆写格式：
 * https://clashparty.org/docs/guide/override/yaml
 *
 * 用法：
 *   node tools/generate-overrides.js          生成文件
 *   node tools/generate-overrides.js --check  仅校验已生成文件是否与源数据一致
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRECT_RULES_FILE = path.join(ROOT, "config", "direct-rules.yaml");
const PROXY_RULES_FILE = path.join(ROOT, "config", "proxy-rules.yaml");
const TEMPLATE_DIR = path.join(ROOT, "config", "templates");
const SOURCE_DIR = path.join(ROOT, "scripts");
const OUTPUT_DIR = path.join(ROOT, "tmp");

const TARGETS = [
  { template: "desktop.js.tmpl", output: "dbk-desktop.js" },
  { template: "android.js.tmpl", output: "dbk-android.js" },
  { template: "direct.js.tmpl", output: "direct.js" },
  { template: "proxy.js.tmpl", output: "proxy.js" },
];

// 原样复制到输出目录的独立模块（不参与模板渲染）
const COPIES = ["hk.js", "tailsock.js"];

const COMMENT_RE = /^\s*#\s*(.*)$/;
const RULE_RE = /^\s*-\s*"([^"]*)"\s*$/;
const BUILD_LINE_RE = /^ \* @build .*$/gm;
const BUILD_LINE_TEST_RE = /^ \* @build .*$/m;

function resolveBuildTag() {
  const fromEnv = (process.env.BUILD_TAG || "").trim();
  if (fromEnv) return fromEnv;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `v${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
}

function stampBuildTag(content, buildTag) {
  if (BUILD_LINE_TEST_RE.test(content)) {
    return content.replace(BUILD_LINE_RE, ` * @build ${buildTag}`);
  }
  const targetLine = /^( \* @target .*)$/m;
  if (!targetLine.test(content)) {
    throw new Error("脚本头部缺少 @target，无法写入 @build");
  }
  return content.replace(targetLine, `$1\n * @build ${buildTag}`);
}

function normalizeBuildTag(content) {
  return content.replace(BUILD_LINE_RE, " * @build <tag>");
}

function loadRules(filePath) {
  const fileName = path.basename(filePath);
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const entries = [];
  let inRules = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!inRules) {
      if (trimmed === "+rules:") {
        inRules = true;
        continue;
      }
      if (trimmed.startsWith("#")) continue;
      throw new Error(`${fileName}: 预期顶层的 +rules:，实际为「${trimmed}」`);
    }

    const comment = trimmed.match(COMMENT_RE);
    if (comment) {
      entries.push({ kind: "comment", text: comment[1] });
      continue;
    }

    const rule = trimmed.match(RULE_RE);
    if (!rule) {
      throw new Error(`${fileName}: 无法解析的规则行「${trimmed}」`);
    }
    entries.push({ kind: "rule", text: rule[1] });
  }

  if (!inRules) throw new Error(`${fileName}: 缺少 +rules:`);
  if (!entries.some((entry) => entry.kind === "rule")) {
    throw new Error(`${fileName}: +rules 下没有规则`);
  }

  const seen = new Set();
  for (const entry of entries) {
    if (entry.kind !== "rule") continue;
    const parts = entry.text.split(",");
    if (parts.length !== 3) {
      throw new Error(`${fileName}: 规则应为「类型,域名/IP,策略」，实际为「${entry.text}」`);
    }
    if (!parts[0].trim() || !parts[1].trim() || !parts[2].trim()) {
      throw new Error(`${fileName}: 规则存在空字段「${entry.text}」`);
    }
    const key = entry.text.replace(/\s+/g, "").toLowerCase();
    if (seen.has(key)) {
      throw new Error(`${fileName}: 规则重复「${entry.text}」`);
    }
    seen.add(key);
  }

  return entries;
}

function renderRuleBlock(entries) {
  const lines = [];
  for (const entry of entries) {
    if (entry.kind === "comment") {
      if (lines.length) lines.push("");
      lines.push(`    // ${entry.text}`);
    } else {
      lines.push(`    "${entry.text}",`);
    }
  }
  return lines.join("\n");
}

function render(template, { directRules, proxyRules }, buildTag) {
  if (!template.includes("{{BUILD_TAG}}")) {
    throw new Error("模板缺少 {{BUILD_TAG}} 占位符");
  }

  let result = template.replace("{{BUILD_TAG}}", buildTag);
  if (result.includes("{{DIRECT_RULES}}")) {
    result = result.replace("{{DIRECT_RULES}}", directRules);
  }
  if (result.includes("{{PROXY_RULES}}")) {
    result = result.replace("{{PROXY_RULES}}", proxyRules);
  }

  return result;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const directRuleBlock = renderRuleBlock(loadRules(DIRECT_RULES_FILE));
  const proxyRuleBlock = renderRuleBlock(loadRules(PROXY_RULES_FILE));
  const buildTag = resolveBuildTag();
  let drift = false;

  if (!checkOnly) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    const templatePath = path.join(TEMPLATE_DIR, target.template);
    const outputPath = path.join(OUTPUT_DIR, target.output);
    const expected = render(
      fs.readFileSync(templatePath, "utf8"),
      { directRules: directRuleBlock, proxyRules: proxyRuleBlock },
      buildTag
    );

    if (checkOnly) {
      const actual = fs.existsSync(outputPath)
        ? fs.readFileSync(outputPath, "utf8")
        : null;
      if (actual === null || normalizeBuildTag(actual) !== normalizeBuildTag(expected)) {
        console.error(`${target.output}: 与规则/模板不一致，请运行 node tools/generate-overrides.js`);
        drift = true;
      } else {
        console.log(`${target.output}: 一致`);
      }
      continue;
    }

    fs.writeFileSync(outputPath, expected, "utf8");
    console.log(`${target.output}: 已生成 (${buildTag})`);
  }

  for (const name of COPIES) {
    const sourcePath = path.join(SOURCE_DIR, name);
    const outputPath = path.join(OUTPUT_DIR, name);
    const expected = stampBuildTag(fs.readFileSync(sourcePath, "utf8"), buildTag);

    if (checkOnly) {
      const actual = fs.existsSync(outputPath)
        ? fs.readFileSync(outputPath, "utf8")
        : null;
      if (actual === null || normalizeBuildTag(actual) !== normalizeBuildTag(expected)) {
        console.error(`${name}: 与 scripts/${name} 不一致，请运行 node tools/generate-overrides.js`);
        drift = true;
      } else {
        console.log(`${name}: 一致`);
      }
      continue;
    }

    fs.writeFileSync(outputPath, expected, "utf8");
    console.log(`${name}: 已复制 (${buildTag})`);
  }

  if (drift) process.exit(1);
}

main();
